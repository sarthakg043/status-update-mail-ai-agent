/**
 * In-process scheduler that polls for due monitored contributors
 * and executes the full pipeline:  fetch PRs → AI summary → send email.
 *
 * Started alongside the Express server in server.js.
 */

const { Octokit } = require('@octokit/rest');
const GitHubService = require('./githubService');
const AIService = require('./aiService');
const EmailService = require('./emailService');
const { MonitoredContributorService } = require('./database/services/MonitoredContributorService');
const { RepositoryService } = require('./database/services/RepositoryService');
const { SummaryRunService } = require('./database/services/SummaryRunService');
const { CompanyService } = require('./database/services/CompanyService');
const { calculateNextRunAt } = require('./api/utils/scheduleUtils');

const monitoredContributorService = new MonitoredContributorService();
const repositoryService = new RepositoryService();
const summaryRunService = new SummaryRunService();
const companyService = new CompanyService();

// How often to check for due runs (in ms)
const POLL_INTERVAL_MS = 60_000; // every 60 seconds

let intervalHandle = null;

/**
 * Execute a single monitored-contributor run.
 */
async function executeRun(mc) {
  const runLabel = `[scheduler] ${mc.githubUsername} @ ${mc.repoFullName}`;
  console.log(`${runLabel}: starting run`);

  // 1. Create a summary_run record
  const run = await summaryRunService.createRun({
    monitoredContributorId: mc._id.toString(),
    companyId: mc.companyId.toString(),
    contributorId: mc.contributorId?.toString(),
    repositoryId: mc.repositoryId?.toString(),
    githubUsername: mc.githubUsername,
    repoFullName: mc.repoFullName,
    scheduledAt: mc.schedule?.nextRunAt || new Date(),
    triggerType: 'scheduled',
  });

  try {
    // 2. Resolve the repo access token
    let accessToken = process.env.GITHUB_TOKEN; // fallback
    if (mc.repositoryId) {
      const repo = await repositoryService.findById(mc.repositoryId.toString());
      if (repo?.encryptedAccessToken) {
        accessToken = repo.encryptedAccessToken;
      }
    }

    // 3. Determine fetch window
    const endDate = new Date();
    let startDate;
    if (mc.fetchConfig?.windowType === 'since_last_run' && mc.schedule?.lastRunAt) {
      startDate = new Date(mc.schedule.lastRunAt);
    } else {
      // Default: last 24 hours
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    // 4. Fetch PRs
    const [owner, repoName] = mc.repoFullName.split('/');
    const githubService = new GitHubService(accessToken, mc.githubUsername, [], 500);

    // Use Octokit directly for per-user, per-repo PRs
    const octokit = new Octokit({ auth: accessToken });
    let pullRequests = [];
    try {
      const { data: prs } = await octokit.pulls.list({
        owner,
        repo: repoName,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      // Filter to this contributor's PRs within the date window
      pullRequests = prs
        .filter((pr) => {
          const authorMatch = pr.user?.login?.toLowerCase() === mc.githubUsername.toLowerCase();
          const updatedAt = new Date(pr.updated_at);
          return authorMatch && updatedAt >= startDate && updatedAt <= endDate;
        })
        .map((pr) => ({
          title: pr.title,
          description: pr.body || '',
          state: pr.state,
          merged: !!pr.merged_at,
          url: pr.html_url,
          repository: mc.repoFullName,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          number: pr.number,
        }));

      // Fetch file changes for each PR
      for (const pr of pullRequests) {
        try {
          pr.files = await githubService.fetchPRFiles(owner, repoName, pr.number);
        } catch {
          pr.files = [];
        }
      }
    } catch (err) {
      console.warn(`${runLabel}: GitHub fetch error – ${err.message}`);
    }

    const hasActivity = pullRequests.length > 0;
    const prStats = { totalPRsFetched: pullRequests.length };

    console.log(`${runLabel}: [debug] PRs found: ${pullRequests.length}`);
    if (pullRequests.length > 0) {
      pullRequests.forEach((pr, i) => {
        console.log(`${runLabel}: [debug]   PR${i + 1}: #${pr.number} "${pr.title}" (${pr.state}${pr.merged ? ', merged' : ''}) files=${pr.files?.length || 0}`);
      });
    }

    // 5. Generate AI summary (only if there's activity)
    let aiSummary = null;
    if (hasActivity) {
      try {
        console.log(`${runLabel}: [debug] Generating AI summary with model=${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}...`);
        const aiService = new AIService(
          process.env.GEMINI_API_KEY,
          process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        );
        aiSummary = await aiService.generateEmailContent(
          pullRequests,
          `Generate a concise status update for ${mc.githubUsername} on ${mc.repoFullName}.`,
        );
        console.log(`${runLabel}: [debug] AI summary generated – length=${aiSummary?.length || 0} chars`);
        console.log(`${runLabel}: [debug] AI summary preview: ${(aiSummary || '').substring(0, 200)}...`);
      } catch (err) {
        console.warn(`${runLabel}: AI generation error – ${err.message}`);
        console.warn(`${runLabel}: [debug] AI error stack: ${err.stack}`);
      }
    } else {
      console.log(`${runLabel}: [debug] No activity – skipping AI summary`);
    }

    // 6. Send email (if recipients configured and there's activity)
    let emailStatus = { status: 'skipped', sentAt: null, recipients: [], failureReason: null };
    const recipients = (mc.emailConfig?.recipients || []).map((r) => r.email || r).filter(Boolean);

    console.log(`${runLabel}: [debug] Email decision: hasActivity=${hasActivity}, aiSummary=${!!aiSummary}, recipients=${JSON.stringify(recipients)}`);
    console.log(`${runLabel}: [debug] Raw emailConfig: ${JSON.stringify(mc.emailConfig)}`);
    console.log(`${runLabel}: [debug] EMAIL_USER=${process.env.EMAIL_USER}, EMAIL_SERVICE=${process.env.EMAIL_SERVICE || 'gmail'}`);

    if (hasActivity && aiSummary && recipients.length > 0) {
      // ── Plan-limit guard: check email quota before sending ──
      let emailLimitReached = false;
      try {
        const companyDoc = await companyService.findById(mc.companyId.toString());
        if (companyDoc) {
          const maxEmails = companyDoc.subscription?.limits?.maxEmailsPerMonth ?? 50;
          const sentEmails = companyDoc.subscription?.usage?.emailsSentThisMonth ?? 0;
          if (sentEmails >= maxEmails) {
            emailLimitReached = true;
            emailStatus = {
              status: 'skipped',
              sentAt: null,
              recipients,
              failureReason: `Monthly email limit reached (${maxEmails}). Upgrade your plan to send more.`,
            };
            console.log(`${runLabel}: email skipped – monthly limit reached (${sentEmails}/${maxEmails})`);
          }
        }
      } catch (limitErr) {
        console.warn(`${runLabel}: could not check email limit – ${limitErr.message}`);
      }

      if (!emailLimitReached) {
        try {
          const emailService = new EmailService({
            service: process.env.EMAIL_SERVICE || 'gmail',
            user: process.env.EMAIL_USER,
            appPassword: process.env.EMAIL_APP_PASSWORD,
          });
          const subject = `Status Update: ${mc.githubUsername} – ${mc.repoFullName}`;
          console.log(`${runLabel}: [debug] Sending email – from=${process.env.EMAIL_USER}, to=${recipients.join(', ')}, subject="${subject}"`);
          await emailService.sendEmail(recipients.join(','), subject, aiSummary);
          emailStatus = { status: 'sent', sentAt: new Date(), recipients, failureReason: null };
          console.log(`${runLabel}: email sent to ${recipients.join(', ')}`);

          // Increment email usage counter
          await companyService.incrementUsage(mc.companyId.toString(), 'emailsSentThisMonth');
        } catch (err) {
          emailStatus = { status: 'failed', sentAt: null, recipients, failureReason: err.message };
          console.warn(`${runLabel}: email send error – ${err.message}`);
          console.warn(`${runLabel}: [debug] email error stack: ${err.stack}`);
        }
      }
    } else {
      const reason = !hasActivity
        ? 'No activity'
        : !aiSummary
          ? 'AI summary generation failed'
          : 'No recipients configured';
      emailStatus = { status: 'skipped', sentAt: null, recipients, failureReason: reason };
      console.log(`${runLabel}: [debug] Email skipped – reason: ${reason}`);
    }

    // 7. Complete the run record
    await summaryRunService.completeRun(run._id.toString(), {
      fetchWindow: { from: startDate, to: endDate },
      prStats,
      hasActivity,
      aiSummary,
      contributorNoteSnapshot: mc.contributorNote || null,
    });
    await summaryRunService.updateEmailStatus(run._id.toString(), emailStatus);

    // 8. Compute next run and update the monitored contributor
    const nextRunAt = calculateNextRunAt(mc.schedule);
    await monitoredContributorService.recordRunCompleted(mc._id.toString(), nextRunAt);

    console.log(
      `${runLabel}: completed – ${prStats.totalPRsFetched} PRs, email=${emailStatus.status}, nextRun=${nextRunAt?.toISOString() ?? 'none'}`,
    );
  } catch (err) {
    console.error(`${runLabel}: run failed – ${err.message}`);

    // Mark run as failed
    try {
      await summaryRunService.completeRun(run._id.toString(), {
        fetchWindow: null,
        prStats: { totalPRsFetched: 0 },
        hasActivity: false,
        aiSummary: null,
        contributorNoteSnapshot: null,
      });
      await summaryRunService.updateEmailStatus(run._id.toString(), {
        status: 'failed',
        sentAt: null,
        recipients: [],
        failureReason: err.message,
      });

      // Still advance the schedule so we don't retry forever
      const nextRunAt = calculateNextRunAt(mc.schedule);
      await monitoredContributorService.recordRunCompleted(mc._id.toString(), nextRunAt);
    } catch (innerErr) {
      console.error(`${runLabel}: failed to record error – ${innerErr.message}`);
    }
  }
}

/**
 * Poll for due runs and execute them.
 */
async function poll() {
  try {
    const dueItems = await monitoredContributorService.findDueForRun();
    if (dueItems.length === 0) return;

    console.log(`[scheduler] Found ${dueItems.length} due run(s)`);

    // Process sequentially to avoid hammering the GitHub / AI APIs
    for (const mc of dueItems) {
      await executeRun(mc);
    }
  } catch (err) {
    console.error('[scheduler] Poll error:', err.message);
  }
}

/**
 * Start the scheduler loop.
 */
function startScheduler() {
  console.log(`[scheduler] Started – polling every ${POLL_INTERVAL_MS / 1000}s`);
  // Run once immediately, then on interval
  poll();
  intervalHandle = setInterval(poll, POLL_INTERVAL_MS);
}

/**
 * Stop the scheduler loop.
 */
function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[scheduler] Stopped');
  }
}

module.exports = { startScheduler, stopScheduler };
