/**
 * Company Summary Runs & Analytics routes
 *
 * GET /company/summary-runs                      – run history
 * GET /company/summary-runs/:runId               – single run detail
 * GET /company/analytics/overview                – company-wide analytics
 * GET /company/analytics/contributor/:contributorId – per-contributor
 * GET /company/analytics/team/:teamId            – team-level
 */

const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { asyncHandler, AppError, requireAuth, requireCompany } = require('../middleware');

const { SummaryRunService } = require('../../database/services/SummaryRunService');
const { MonitoredContributorService } = require('../../database/services/MonitoredContributorService');
const { TeamService } = require('../../database/services/TeamService');
const { ContributorService } = require('../../database/services/ContributorService');

const summaryRunService = new SummaryRunService();
const monitoredContributorService = new MonitoredContributorService();
const teamService = new TeamService();
const contributorService = new ContributorService();

const router = Router();
router.use(requireAuth, requireCompany);

/* ──────────── GET /summary-runs ──────────── */
router.get(
  '/summary-runs',
  asyncHandler(async (req, res) => {
    const {
      monitoredContributorId,
      contributorId,
      repositoryId,
      teamId,
      from,
      to,
      emailStatus,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Build filter — IDs stored as ObjectId in the DB
    const query = { companyId: new ObjectId(req.companyId) };
    if (monitoredContributorId) query.monitoredContributorId = new ObjectId(monitoredContributorId);
    if (contributorId) query.contributorId = new ObjectId(contributorId);
    if (repositoryId) query.repositoryId = new ObjectId(repositoryId);
    if (emailStatus) query['emailStatus.status'] = emailStatus;
    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(from);
      if (to) query.scheduledAt.$lte = new Date(to);
    }

    // If teamId, find team contributor IDs and filter
    if (teamId) {
      const team = await teamService.findById(teamId);
      if (team && team.memberContributorIds?.length) {
        query.contributorId = { $in: team.memberContributorIds.map((id) => id.toString()) };
      }
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
          githubUsername: r.githubUsername,
          repoFullName: r.repoFullName,
          scheduledAt: r.scheduledAt,
          completedAt: r.completedAt,
          hasActivity: r.hasActivity,
          prStats: r.prStats ? { totalPRsFetched: r.prStats.totalPRsFetched } : null,
          emailStatus: r.emailStatus
            ? { status: r.emailStatus.status, sentAt: r.emailStatus.sentAt }
            : null,
          triggerType: r.triggerType,
        })),
      },
    });
  }),
);

/* ──────────── GET /summary-runs/:runId ──────────── */
router.get(
  '/summary-runs/:runId',
  asyncHandler(async (req, res) => {
    const run = await summaryRunService.findById(req.params.runId);
    if (!run || run.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Summary run not found.', 404);
    }

    res.json({ success: true, data: run });
  }),
);

/* ──────────── GET /analytics/overview ──────────── */
router.get(
  '/analytics/overview',
  asyncHandler(async (req, res) => {
    const { from, to, teamId } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const stats = await summaryRunService.getCompanyStats(req.companyId, startDate, endDate);

    // Get active/inactive contributors
    const allMC = await monitoredContributorService.findByCompany(req.companyId);
    let filtered = allMC;

    if (teamId) {
      const team = await teamService.findById(teamId);
      if (team) {
        const memberIds = new Set((team.memberContributorIds || []).map((id) => id.toString()));
        filtered = allMC.filter((mc) => memberIds.has(mc.contributorId?.toString()));
      }
    }

    const active = filtered.filter((mc) => mc.status === 'active').length;
    const inactive = filtered.filter((mc) => mc.status !== 'active').length;

    // Get runs for top contributors and timeline
    const runs = await summaryRunService.findByCompany(req.companyId, {
      startDate,
      endDate,
      limit: 1000,
    });

    // Aggregate top contributors
    const contributorMap = {};
    const timelineMap = {};
    for (const run of runs) {
      const uname = run.githubUsername;
      if (!contributorMap[uname]) {
        contributorMap[uname] = { githubUsername: uname, avatarUrl: '', totalPRs: 0 };
      }
      contributorMap[uname].totalPRs += run.prStats?.totalPRsFetched || 0;

      const dateKey = run.scheduledAt
        ? new Date(run.scheduledAt).toISOString().split('T')[0]
        : null;
      if (dateKey) {
        if (!timelineMap[dateKey]) timelineMap[dateKey] = { date: dateKey, totalPRs: 0, totalRuns: 0 };
        timelineMap[dateKey].totalPRs += run.prStats?.totalPRsFetched || 0;
        timelineMap[dateKey].totalRuns += 1;
      }
    }

    const topContributors = Object.values(contributorMap)
      .sort((a, b) => b.totalPRs - a.totalPRs)
      .slice(0, 10);

    const activityTimeline = Object.values(timelineMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    res.json({
      success: true,
      data: {
        period: { from: startDate.toISOString().split('T')[0], to: endDate.toISOString().split('T')[0] },
        totalRuns: stats.totalRuns,
        totalEmailsSent: stats.emailsSent,
        totalPRsSummarised: stats.totalPRs,
        activeContributors: active,
        inactiveContributors: inactive,
        topContributors,
        activityTimeline,
      },
    });
  }),
);

/* ──────────── GET /analytics/contributor/:contributorId ──────────── */
router.get(
  '/analytics/contributor/:contributorId',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const contributor = await contributorService.findById(req.params.contributorId);
    if (!contributor) {
      throw new AppError('NOT_FOUND', 'Contributor not found.', 404);
    }

    // Find runs for this contributor within this company
    const query = {
      companyId: new ObjectId(req.companyId),
      contributorId: new ObjectId(req.params.contributorId),
      scheduledAt: { $gte: startDate, $lte: endDate },
    };

    const runs = await summaryRunService.find(query, { sort: { scheduledAt: -1 }, limit: 500 });

    let totalPRs = 0;
    let emailsSent = 0;
    const repoMap = {};
    const timeline = [];

    for (const run of runs) {
      const prs = run.prStats?.totalPRsFetched || 0;
      totalPRs += prs;
      if (run.emailStatus?.status === 'sent') emailsSent++;

      const repo = run.repoFullName;
      if (repo) {
        repoMap[repo] = (repoMap[repo] || 0) + prs;
      }

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
        contributorId: req.params.contributorId,
        githubUsername: contributor.githubUsername,
        period: { from: startDate.toISOString().split('T')[0], to: endDate.toISOString().split('T')[0] },
        totalRuns: runs.length,
        totalEmailsSent: emailsSent,
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

/* ──────────── GET /analytics/team/:teamId ──────────── */
router.get(
  '/analytics/team/:teamId',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const team = await teamService.findById(req.params.teamId);
    if (!team || team.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Team not found.', 404);
    }

    const memberIds = (team.memberContributorIds || []).map((id) => id.toString());

    // Get runs for all team members
    const query = {
      companyId: new ObjectId(req.companyId),
      contributorId: { $in: memberIds.map((id) => new ObjectId(id)) },
      scheduledAt: { $gte: startDate, $lte: endDate },
    };

    const runs = await summaryRunService.find(query, { sort: { scheduledAt: -1 }, limit: 1000 });

    let totalPRs = 0;
    const memberMap = {};
    const timelineMap = {};

    for (const run of runs) {
      const prs = run.prStats?.totalPRsFetched || 0;
      totalPRs += prs;

      const uname = run.githubUsername;
      if (!memberMap[uname]) memberMap[uname] = { githubUsername: uname, totalPRs: 0 };
      memberMap[uname].totalPRs += prs;

      const dateKey = run.scheduledAt
        ? new Date(run.scheduledAt).toISOString().split('T')[0]
        : null;
      if (dateKey) {
        if (!timelineMap[dateKey]) timelineMap[dateKey] = { date: dateKey, totalPRs: 0 };
        timelineMap[dateKey].totalPRs += prs;
      }
    }

    res.json({
      success: true,
      data: {
        teamId: req.params.teamId,
        teamName: team.name,
        period: { from: startDate.toISOString().split('T')[0], to: endDate.toISOString().split('T')[0] },
        totalPRs,
        members: Object.values(memberMap).sort((a, b) => b.totalPRs - a.totalPRs),
        activityTimeline: Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  }),
);

module.exports = router;
