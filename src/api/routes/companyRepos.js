/**
 * Company Repositories routes
 *
 * POST   /company/repos                      – onboard repo (admin)
 * GET    /company/repos                      – list repos
 * GET    /company/repos/:repoId/contributors – GitHub contributors
 * DELETE /company/repos/:repoId              – remove repo (admin)
 * PATCH  /company/repos/:repoId/token        – rotate PAT (admin)
 */

const { Router } = require('express');
const { Octokit } = require('@octokit/rest');
const { asyncHandler, AppError, requireAuth, requireCompany, requireRole } = require('../middleware');
const { RepositoryService } = require('../../database/services/RepositoryService');
const { MonitoredContributorService } = require('../../database/services/MonitoredContributorService');
const { CompanyService } = require('../../database/services/CompanyService');

const repositoryService = new RepositoryService();
const monitoredContributorService = new MonitoredContributorService();
const companyService = new CompanyService();
const router = Router();

router.use(requireAuth, requireCompany);

/* ──────────── POST / ──────────── */
router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { accessToken, owner, repoName } = req.body;
    if (!accessToken || !owner || !repoName) {
      throw new AppError('VALIDATION', 'accessToken, owner, and repoName are required.', 400);
    }

    // Validate token against GitHub
    const octokit = new Octokit({ auth: accessToken });
    let ghRepo;
    try {
      const { data } = await octokit.repos.get({ owner, repo: repoName });
      ghRepo = data;
    } catch (err) {
      throw new AppError(
        'INVALID_PAT',
        `The provided access token could not authenticate against ${owner}/${repoName}.`,
        400,
      );
    }

    const fullName = `${owner}/${repoName}`;

    // Check for duplicate — reactivate if soft-deleted
    const existing = await repositoryService.findByFullName(req.companyId, fullName);
    if (existing) {
      if (existing.status === 'removed') {
        // Reactivate the soft-deleted repo with the new token
        await repositoryService.updateById(existing._id.toString(), {
          status: 'active',
          encryptedAccessToken: accessToken,
          tokenAddedBy: req.companyMember.clerkUserId,
          githubRepoId: ghRepo.id,
          isPrivate: ghRepo.private,
          lastSyncedAt: null,
        });

        // Increment usage counter
        await companyService.incrementUsage(req.companyId, 'reposCount');

        return res.status(201).json({
          success: true,
          data: {
            _id: existing._id.toString(),
            fullName: existing.fullName,
            isPrivate: ghRepo.private,
            status: 'active',
            createdAt: existing.createdAt,
          },
        });
      }
      throw new AppError('DUPLICATE', `Repository ${fullName} is already onboarded.`, 409);
    }

    const repo = await repositoryService.onboardRepo({
      companyId: req.companyId,
      githubRepoId: ghRepo.id,
      owner,
      name: repoName,
      fullName,
      isPrivate: ghRepo.private,
      encryptedAccessToken: accessToken, // In production, encrypt before storing
      tokenAddedBy: req.companyMember.clerkUserId,
    });

    // Increment usage counter
    await companyService.incrementUsage(req.companyId, 'reposCount');

    res.status(201).json({
      success: true,
      data: {
        _id: repo._id.toString(),
        fullName: repo.fullName,
        isPrivate: repo.isPrivate,
        status: repo.status,
        createdAt: repo.createdAt,
      },
    });
  }),
);

/* ──────────── GET / ──────────── */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const repos = await repositoryService.findByCompany(req.companyId);
    res.json({
      success: true,
      data: {
        repos: repos.map((r) => ({
          _id: r._id.toString(),
          fullName: r.fullName,
          owner: r.owner,
          name: r.name,
          isPrivate: r.isPrivate,
          status: r.status,
          lastSyncedAt: r.lastSyncedAt,
        })),
      },
    });
  }),
);

/* ──────────── GET /:repoId/contributors ──────────── */
router.get(
  '/:repoId/contributors',
  asyncHandler(async (req, res) => {
    const repo = await repositoryService.findById(req.params.repoId);
    if (!repo || repo.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Repository not found.', 404);
    }

    // Fetch contributors from GitHub
    const octokit = new Octokit({ auth: repo.encryptedAccessToken });
    const { data: ghContributors } = await octokit.repos.listContributors({
      owner: repo.owner,
      repo: repo.name,
      per_page: 100,
    });

    // Check which are already monitored
    const monitored = await monitoredContributorService.findByCompanyAndRepo(
      req.companyId,
      req.params.repoId,
    );
    const monitoredUsernames = new Set(monitored.map((m) => m.githubUsername));

    const contributors = ghContributors.map((c) => ({
      githubUsername: c.login,
      githubUserId: c.id,
      avatarUrl: c.avatar_url,
      contributions: c.contributions,
      isAlreadyMonitored: monitoredUsernames.has(c.login),
    }));

    res.json({ success: true, data: { contributors } });
  }),
);

/* ──────────── DELETE /:repoId ──────────── */
router.delete(
  '/:repoId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const repo = await repositoryService.findById(req.params.repoId);
    if (!repo || repo.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Repository not found.', 404);
    }

    // Pause all active monitored contributors for this repo
    const monitored = await monitoredContributorService.findByCompanyAndRepo(
      req.companyId,
      req.params.repoId,
    );
    let pausedCount = 0;
    for (const mc of monitored) {
      if (mc.status === 'active') {
        await monitoredContributorService.pause(mc._id.toString());
        pausedCount++;
      }
    }

    // Soft-delete the repo
    await repositoryService.setStatus(req.params.repoId, 'removed');

    // Decrement repo usage counter
    await companyService.incrementUsage(req.companyId, 'reposCount', -1);

    // Decrement contributor usage for each monitor that was actually active (now paused)
    if (pausedCount > 0) {
      await companyService.incrementUsage(req.companyId, 'contributorsCount', -pausedCount);
    }

    res.json({
      success: true,
      data: {
        message: `Repository removed. ${pausedCount} monitoring configs have been paused.`,
      },
    });
  }),
);

/* ──────────── PATCH /:repoId/token ──────────── */
router.patch(
  '/:repoId/token',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      throw new AppError('VALIDATION', 'accessToken is required.', 400);
    }

    const repo = await repositoryService.findById(req.params.repoId);
    if (!repo || repo.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Repository not found.', 404);
    }

    // Validate the new token
    const octokit = new Octokit({ auth: accessToken });
    try {
      await octokit.repos.get({ owner: repo.owner, repo: repo.name });
    } catch (err) {
      throw new AppError(
        'INVALID_PAT',
        `The provided access token could not authenticate against ${repo.fullName}.`,
        400,
      );
    }

    await repositoryService.updateToken(
      req.params.repoId,
      accessToken,
      req.companyMember.clerkUserId,
    );

    res.json({
      success: true,
      data: {
        status: 'active',
        message: 'Token updated and validated successfully.',
      },
    });
  }),
);

module.exports = router;
