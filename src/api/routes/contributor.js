/**
 * Contributor routes
 *
 * POST  /contributor/onboard                                – create contributor account
 * PATCH /contributor/mail-config                            – connect mail account
 * GET   /contributor/profile                                – get profile
 * PATCH /contributor/note/:monitoredContributorId           – update note
 * GET   /contributor/templates                              – list templates
 * POST  /contributor/templates                              – save template
 * PATCH /contributor/templates/:templateId                  – update template
 * DELETE /contributor/templates/:templateId                 – delete template
 * GET   /contributor/monitoring-slots                       – list monitoring slots
 * GET   /contributor/summary-runs                           – run history
 * GET   /contributor/analytics                              – analytics
 */

const { Router } = require('express');
const { asyncHandler, AppError, requireAuth, requireContributor } = require('../middleware');

const { ContributorService } = require('../../database/services/ContributorService');
const { ContributorAccountService } = require('../../database/services/ContributorAccountService');
const { MonitoredContributorService } = require('../../database/services/MonitoredContributorService');
const { SummaryRunService } = require('../../database/services/SummaryRunService');

const contributorService = new ContributorService();
const contributorAccountService = new ContributorAccountService();
const monitoredContributorService = new MonitoredContributorService();
const summaryRunService = new SummaryRunService();

const router = Router();

/* ──────────── POST /onboard ──────────── */
router.post(
  '/onboard',
  requireAuth,
  asyncHandler(async (req, res) => {
    const clerkUserId = req.auth().userId;
    const contributorId = req.headers['x-contributor-id'];
    const { name, personalEmail } = req.body;

    if (!contributorId) {
      throw new AppError('VALIDATION', 'x-contributor-id header is required.', 400);
    }

    // Check if account already exists
    const existing = await contributorAccountService.findByContributorId(contributorId);
    if (existing) {
      throw new AppError('DUPLICATE', 'Contributor account already exists.', 409);
    }

    const account = await contributorAccountService.createAccount({
      contributorId,
      clerkUserId,
      name,
      personalEmail,
    });

    // Link the Clerk account to the contributor
    await contributorService.linkClerkAccount(contributorId, clerkUserId);

    res.status(201).json({
      success: true,
      data: {
        contributorAccountId: account._id.toString(),
        name: account.name,
        hasMailConfig: false,
      },
    });
  }),
);

/* ── All routes below require contributor auth ── */
router.use(requireAuth, requireContributor);

/* ──────────── PATCH /mail-config ──────────── */
router.patch(
  '/mail-config',
  asyncHandler(async (req, res) => {
    const { provider, email, appPassword } = req.body;
    if (!provider || !email || !appPassword) {
      throw new AppError('VALIDATION', 'provider, email, and appPassword are required.', 400);
    }

    await contributorAccountService.updateMailConfig(req.contributorId, {
      provider,
      email,
      appPassword, // In production, encrypt before storing
      configuredAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        provider,
        email,
        configuredAt: new Date().toISOString(),
      },
    });
  }),
);

/* ──────────── GET /profile ──────────── */
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const contributor = await contributorService.findById(req.contributorId);
    const account = req.contributorAccount;

    res.json({
      success: true,
      data: {
        githubUsername: contributor?.githubUsername,
        name: account?.name,
        personalEmail: account?.personalEmail,
        mailConfig: account?.mailConfig
          ? {
              provider: account.mailConfig.provider,
              email: account.mailConfig.email,
              isConfigured: true,
            }
          : { isConfigured: false },
        createdAt: account?.createdAt,
      },
    });
  }),
);

/* ──────────── PATCH /note/:monitoredContributorId ──────────── */
router.patch(
  '/note/:monitoredContributorId',
  asyncHandler(async (req, res) => {
    const { note } = req.body;
    if (note === undefined) {
      throw new AppError('VALIDATION', 'note is required.', 400);
    }

    if (note.length > 5000) {
      throw new AppError(
        'NOTE_TOO_LONG',
        `Note exceeds the 5000 character limit. Current length: ${note.length}.`,
        400,
      );
    }

    const mc = await monitoredContributorService.findById(req.params.monitoredContributorId);
    if (!mc || mc.contributorId?.toString() !== req.contributorId) {
      throw new AppError('NOT_FOUND', 'Monitored contributor slot not found.', 404);
    }

    await monitoredContributorService.updateContributorNote(
      req.params.monitoredContributorId,
      note,
    );

    res.json({
      success: true,
      data: {
        monitoredContributorId: req.params.monitoredContributorId,
        note,
        characterCount: note.length,
        updatedAt: new Date().toISOString(),
      },
    });
  }),
);

/* ──────────── GET /templates ──────────── */
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const account = req.contributorAccount;
    res.json({
      success: true,
      data: { templates: account?.savedTemplates || [] },
    });
  }),
);

/* ──────────── POST /templates ──────────── */
router.post(
  '/templates',
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
      throw new AppError('VALIDATION', 'title and content are required.', 400);
    }

    await contributorAccountService.addTemplate(req.contributorId, title, content);

    // Fetch updated account to get the new template with ID
    const account = await contributorAccountService.findByContributorId(req.contributorId);
    const templates = account?.savedTemplates || [];
    const newest = templates[templates.length - 1];

    res.status(201).json({
      success: true,
      data: {
        _id: newest?._id?.toString() || newest?.templateId,
        title,
        createdAt: newest?.createdAt || new Date().toISOString(),
      },
    });
  }),
);

/* ──────────── PATCH /templates/:templateId ──────────── */
router.patch(
  '/templates/:templateId',
  asyncHandler(async (req, res) => {
    const { title, content } = req.body;

    await contributorAccountService.updateTemplate(req.contributorId, req.params.templateId, {
      title,
      content,
    });

    res.json({
      success: true,
      data: {
        _id: req.params.templateId,
        title,
        updatedAt: new Date().toISOString(),
      },
    });
  }),
);

/* ──────────── DELETE /templates/:templateId ──────────── */
router.delete(
  '/templates/:templateId',
  asyncHandler(async (req, res) => {
    await contributorAccountService.deleteTemplate(req.contributorId, req.params.templateId);

    res.json({
      success: true,
      data: { message: 'Template deleted.' },
    });
  }),
);

/* ──────────── GET /monitoring-slots ──────────── */
router.get(
  '/monitoring-slots',
  asyncHandler(async (req, res) => {
    const slots = await monitoredContributorService.findByContributor(req.contributorId);

    res.json({
      success: true,
      data: {
        slots: slots.map((s) => ({
          monitoredContributorId: s._id.toString(),
          repoFullName: s.repoFullName,
          monitoringType: s.monitoringType,
          schedule: {
            type: s.schedule?.type,
            nextRunAt: s.schedule?.nextRunAt,
          },
          currentNote: s.contributorNote,
          status: s.status,
        })),
      },
    });
  }),
);

/* ──────────── GET /summary-runs ──────────── */
router.get(
  '/summary-runs',
  asyncHandler(async (req, res) => {
    const { from, to, repoFullName, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const query = { contributorId: req.contributorId };
    if (repoFullName) query.repoFullName = repoFullName;
    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(from);
      if (to) query.scheduledAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      summaryRunService.find(query, {
        sort: { scheduledAt: -1 },
        skip: (pageNum - 1) * limitNum,
        limit: limitNum,
      }),
      summaryRunService.count(query),
    ]);

    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        items: items.map((r) => ({
          _id: r._id.toString(),
          repoFullName: r.repoFullName,
          scheduledAt: r.scheduledAt,
          hasActivity: r.hasActivity,
          prStats: r.prStats ? { totalPRsFetched: r.prStats.totalPRsFetched } : null,
          aiSummary: r.aiSummary,
          emailStatus: r.emailStatus
            ? { status: r.emailStatus.status, sentAt: r.emailStatus.sentAt }
            : null,
        })),
      },
    });
  }),
);

/* ──────────── GET /analytics ──────────── */
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const query = {
      contributorId: req.contributorId,
      scheduledAt: { $gte: startDate, $lte: endDate },
    };

    const runs = await summaryRunService.find(query, { sort: { scheduledAt: -1 }, limit: 500 });

    let totalPRs = 0;
    const repoMap = {};
    const timeline = [];

    for (const run of runs) {
      const prs = run.prStats?.totalPRsFetched || 0;
      totalPRs += prs;

      const repo = run.repoFullName;
      if (repo) repoMap[repo] = (repoMap[repo] || 0) + prs;

      timeline.push({
        date: run.scheduledAt ? new Date(run.scheduledAt).toISOString().split('T')[0] : null,
        runId: run._id.toString(),
        totalPRs: prs,
        hasActivity: run.hasActivity,
      });
    }

    res.json({
      success: true,
      data: {
        period: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
        totalRuns: runs.length,
        totalPRs,
        avgPRsPerRun: runs.length > 0 ? Math.round((totalPRs / runs.length) * 10) / 10 : 0,
        activityTimeline: timeline,
        repoBreakdown: Object.entries(repoMap).map(([repo, prs]) => ({
          repoFullName: repo,
          totalPRs: prs,
        })),
      },
    });
  }),
);

module.exports = router;
