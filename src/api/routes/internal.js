/**
 * Internal Scheduler / Worker routes
 *
 * GET   /internal/scheduler/due-runs      – poll due runs
 * POST  /internal/runs/execute            – kick off a run
 * PATCH /internal/runs/:runId/complete    – save run result
 */

const { Router } = require('express');
const { asyncHandler, AppError, requireInternal } = require('../middleware');

const { MonitoredContributorService } = require('../../database/services/MonitoredContributorService');
const { SummaryRunService } = require('../../database/services/SummaryRunService');
const { RepositoryService } = require('../../database/services/RepositoryService');

const { calculateNextRunAt } = require('../utils/scheduleUtils');

const monitoredContributorService = new MonitoredContributorService();
const summaryRunService = new SummaryRunService();
const repositoryService = new RepositoryService();

const router = Router();
router.use(requireInternal);

/* ──────────── GET /scheduler/due-runs ──────────── */
router.get(
  '/scheduler/due-runs',
  asyncHandler(async (_req, res) => {
    const dueItems = await monitoredContributorService.findDueForRun();

    // Enrich with repo access token info
    const dueRuns = [];
    for (const mc of dueItems) {
      let encryptedAccessToken = null;
      if (mc.repositoryId) {
        const repo = await repositoryService.findById(mc.repositoryId.toString());
        encryptedAccessToken = repo?.encryptedAccessToken || null;
      }

      dueRuns.push({
        monitoredContributorId: mc._id.toString(),
        githubUsername: mc.githubUsername,
        repoFullName: mc.repoFullName,
        encryptedAccessToken,
        fetchConfig: {
          windowType: mc.fetchConfig?.windowType || 'since_last_run',
          lastRunAt: mc.schedule?.lastRunAt,
        },
        recipients: (mc.emailConfig?.recipients || []).map((r) => r.email),
      });
    }

    res.json({ success: true, data: { dueRuns } });
  }),
);

/* ──────────── POST /runs/execute ──────────── */
router.post(
  '/runs/execute',
  asyncHandler(async (req, res) => {
    const { monitoredContributorId, triggerType } = req.body;
    if (!monitoredContributorId) {
      throw new AppError('VALIDATION', 'monitoredContributorId is required.', 400);
    }

    const mc = await monitoredContributorService.findById(monitoredContributorId);
    if (!mc) {
      throw new AppError('NOT_FOUND', 'Monitored contributor not found.', 404);
    }

    const run = await summaryRunService.createRun({
      monitoredContributorId,
      companyId: mc.companyId?.toString(),
      contributorId: mc.contributorId?.toString(),
      repositoryId: mc.repositoryId?.toString(),
      githubUsername: mc.githubUsername,
      repoFullName: mc.repoFullName,
      triggerType: triggerType || 'scheduled',
    });

    res.status(202).json({
      success: true,
      data: {
        runId: run._id.toString(),
        status: 'queued',
      },
    });
  }),
);

/* ──────────── PATCH /runs/:runId/complete ──────────── */
router.patch(
  '/runs/:runId/complete',
  asyncHandler(async (req, res) => {
    const {
      completedAt,
      fetchWindow,
      prStats,
      hasActivity,
      aiSummary,
      contributorNoteSnapshot,
      emailStatus,
    } = req.body;

    const run = await summaryRunService.findById(req.params.runId);
    if (!run) {
      throw new AppError('NOT_FOUND', 'Run not found.', 404);
    }

    // Complete the run
    await summaryRunService.completeRun(req.params.runId, {
      fetchWindow,
      prStats,
      hasActivity,
      aiSummary,
      contributorNoteSnapshot,
    });

    // Update email status
    if (emailStatus) {
      await summaryRunService.updateEmailStatus(req.params.runId, emailStatus);
    }

    // Calculate and set next run time on the monitored contributor
    const mc = await monitoredContributorService.findById(run.monitoredContributorId.toString());
    let nextRunAt = null;
    if (mc) {
      nextRunAt = calculateNextRunAt(mc.schedule);
      await monitoredContributorService.recordRunCompleted(mc._id.toString(), nextRunAt);
    }

    res.json({
      success: true,
      data: {
        runId: req.params.runId,
        nextRunAt,
      },
    });
  }),
);

module.exports = router;
