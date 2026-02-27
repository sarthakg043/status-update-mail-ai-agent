/**
 * Monitored Contributors routes
 *
 * POST   /company/monitored-contributors                  – add monitoring config
 * GET    /company/monitored-contributors                  – list all
 * GET    /company/monitored-contributors/:id              – get one
 * PATCH  /company/monitored-contributors/:id              – update config
 * DELETE /company/monitored-contributors/:id              – remove config
 * POST   /company/monitored-contributors/:id/trigger      – manual run
 * POST   /company/monitored-contributors/:id/resend-invite – resend invite
 */

const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { asyncHandler, AppError, requireAuth, requireCompany, requireRole } = require('../middleware');

const { MonitoredContributorService } = require('../../database/services/MonitoredContributorService');
const { ContributorService } = require('../../database/services/ContributorService');
const { RepositoryService } = require('../../database/services/RepositoryService');
const { SummaryRunService } = require('../../database/services/SummaryRunService');
const { InviteService } = require('../../database/services/InviteService');

const { calculateNextRunAt } = require('../utils/scheduleUtils');

const monitoredContributorService = new MonitoredContributorService();
const contributorService = new ContributorService();
const repositoryService = new RepositoryService();
const summaryRunService = new SummaryRunService();
const inviteService = new InviteService();

const router = Router();
router.use(requireAuth, requireCompany);

/* ──────────── POST / ──────────── */
router.post(
  '/',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const {
      githubUsername,
      repositoryId,
      monitoringType,
      inviteEmail,
      schedule,
      fetchConfig,
      emailConfig,
    } = req.body;

    if (!githubUsername || !repositoryId) {
      throw new AppError('VALIDATION', 'githubUsername and repositoryId are required.', 400);
    }

    // Validate repo belongs to company
    const repo = await repositoryService.findById(repositoryId);
    if (!repo || repo.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Repository not found.', 404);
    }

    // Find or create contributor
    const contributor = await contributorService.findOrCreate({
      githubUsername,
      githubUserId: 0, // Will be enriched later
    });

    // Compute the initial nextRunAt from the schedule so the scheduler can pick it up
    const mergedSchedule = {
      type: 'daily',
      config: {},
      time: '09:00',
      timezone: 'UTC',
      isActive: true,
      nextRunAt: null,
      lastRunAt: null,
      ...schedule,
    };
    mergedSchedule.nextRunAt = calculateNextRunAt(mergedSchedule);

    // Check if a soft-deleted record already exists for this combo — reactivate it
    const existing = await monitoredContributorService.findOne({
      companyId: new ObjectId(req.companyId),
      contributorId: new ObjectId(contributor._id.toString()),
      repositoryId: new ObjectId(repositoryId),
    });

    let mc;
    if (existing) {
      // Reactivate the existing record with updated config
      await monitoredContributorService.updateById(existing._id.toString(), {
        status: 'active',
        monitoringType: monitoringType || 'ghost',
        schedule: mergedSchedule,
        fetchConfig: fetchConfig || { windowType: 'since_last_run', dateRange: null },
        emailConfig: emailConfig || { recipients: [] },
        inviteStatus: 'not_sent',
        inviteEmail: null,
        addedBy: req.companyMember.clerkUserId,
      });
      mc = await monitoredContributorService.findById(existing._id.toString());
    } else {
      mc = await monitoredContributorService.createMonitoring({
        companyId: req.companyId,
        contributorId: contributor._id.toString(),
        repositoryId,
        githubUsername,
        repoFullName: repo.fullName,
        monitoringType: monitoringType || 'ghost',
        schedule: mergedSchedule,
        fetchConfig,
        emailConfig,
        addedBy: req.companyMember.clerkUserId,
      });
    }

    // If open monitoring with invite email, create an invite
    let inviteStatus = null;
    if (monitoringType === 'open' && inviteEmail) {
      await inviteService.createInvite({
        monitoredContributorId: mc._id.toString(),
        companyId: req.companyId,
        contributorId: contributor._id.toString(),
        githubUsername,
        inviteEmail,
      });
      await monitoredContributorService.updateInviteStatus(
        mc._id.toString(),
        'sent',
        inviteEmail,
      );
      inviteStatus = 'sent';
    }

    res.status(201).json({
      success: true,
      data: {
        _id: mc._id.toString(),
        githubUsername: mc.githubUsername,
        repoFullName: mc.repoFullName,
        monitoringType: mc.monitoringType,
        inviteStatus,
        schedule: {
          type: mc.schedule?.type,
          nextRunAt: mc.schedule?.nextRunAt,
        },
        createdAt: mc.createdAt,
      },
    });
  }),
);

/* ──────────── GET / ──────────── */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { repoId, status, monitoringType, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Build query — companyId is stored as ObjectId in the DB
    const query = { companyId: new ObjectId(req.companyId) };
    if (repoId) query.repositoryId = new ObjectId(repoId);
    if (status) query.status = status;
    else query.status = { $ne: 'removed' };
    if (monitoringType) query.monitoringType = monitoringType;

    const [items, total] = await Promise.all([
      monitoredContributorService.find(query, {
        sort: { createdAt: -1 },
        skip: (pageNum - 1) * limitNum,
        limit: limitNum,
      }),
      monitoredContributorService.count(query),
    ]);

    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        items: items.map((mc) => ({
          _id: mc._id.toString(),
          githubUsername: mc.githubUsername,
          avatarUrl: mc.avatarUrl,
          repoFullName: mc.repoFullName,
          monitoringType: mc.monitoringType,
          inviteStatus: mc.inviteStatus,
          status: mc.status,
          schedule: {
            type: mc.schedule?.type,
            nextRunAt: mc.schedule?.nextRunAt,
            lastRunAt: mc.schedule?.lastRunAt,
          },
          emailConfig: mc.emailConfig || { recipients: [] },
        })),
      },
    });
  }),
);

/* ──────────── GET /:id ──────────── */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const mc = await monitoredContributorService.findById(req.params.id);
    if (!mc || mc.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Monitored contributor not found.', 404);
    }

    res.json({ success: true, data: mc });
  }),
);

/* ──────────── PATCH /:id ──────────── */
router.patch(
  '/:id',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const mc = await monitoredContributorService.findById(req.params.id);
    if (!mc || mc.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Monitored contributor not found.', 404);
    }

    const { schedule, fetchConfig, emailConfig, monitoringType, status } = req.body;

    // Apply partial updates
    const updates = {};
    if (schedule) {
      await monitoredContributorService.updateSchedule(req.params.id, schedule);
    }
    if (fetchConfig) updates.fetchConfig = fetchConfig;
    if (monitoringType) updates.monitoringType = monitoringType;
    if (emailConfig && Array.isArray(emailConfig.recipients)) {
      await monitoredContributorService.updateRecipients(req.params.id, emailConfig.recipients);
    }

    if (Object.keys(updates).length > 0) {
      await monitoredContributorService.updateById(req.params.id, updates);
    }

    // Handle status change
    if (status === 'paused') await monitoredContributorService.pause(req.params.id);
    if (status === 'active') await monitoredContributorService.resume(req.params.id);

    // Fetch updated record
    const updated = await monitoredContributorService.findById(req.params.id);

    res.json({
      success: true,
      data: {
        _id: updated._id.toString(),
        schedule: {
          type: updated.schedule?.type,
          nextRunAt: updated.schedule?.nextRunAt,
        },
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  }),
);

/* ──────────── DELETE /:id ──────────── */
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const mc = await monitoredContributorService.findById(req.params.id);
    if (!mc || mc.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Monitored contributor not found.', 404);
    }

    await monitoredContributorService.remove(req.params.id);

    res.json({
      success: true,
      data: { message: 'Monitoring config removed.' },
    });
  }),
);

/* ──────────── POST /:id/trigger ──────────── */
router.post(
  '/:id/trigger',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const mc = await monitoredContributorService.findById(req.params.id);
    if (!mc || mc.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Monitored contributor not found.', 404);
    }

    // Create a summary run
    const run = await summaryRunService.createRun({
      monitoredContributorId: mc._id.toString(),
      companyId: req.companyId,
      contributorId: mc.contributorId?.toString(),
      repositoryId: mc.repositoryId?.toString(),
      githubUsername: mc.githubUsername,
      repoFullName: mc.repoFullName,
      triggerType: 'manual',
    });

    res.status(202).json({
      success: true,
      data: {
        runId: run._id.toString(),
        message: 'Summary run queued.',
        estimatedCompletionSeconds: 15,
      },
    });
  }),
);

/* ──────────── POST /:id/resend-invite ──────────── */
router.post(
  '/:id/resend-invite',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      throw new AppError('VALIDATION', 'email is required.', 400);
    }

    const mc = await monitoredContributorService.findById(req.params.id);
    if (!mc || mc.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Monitored contributor not found.', 404);
    }

    // Create a new invite record
    await inviteService.createInvite({
      monitoredContributorId: mc._id.toString(),
      companyId: req.companyId,
      contributorId: mc.contributorId?.toString(),
      githubUsername: mc.githubUsername,
      inviteEmail: email,
    });

    await monitoredContributorService.updateInviteStatus(req.params.id, 'sent', email);

    res.json({
      success: true,
      data: {
        message: `Invite resent to ${email}`,
        inviteStatus: 'sent',
      },
    });
  }),
);

module.exports = router;
