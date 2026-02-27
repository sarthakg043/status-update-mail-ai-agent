/**
 * Company Teams routes
 *
 * POST   /company/teams           – create team
 * GET    /company/teams           – list teams
 * GET    /company/teams/:teamId   – get team details
 * PATCH  /company/teams/:teamId   – update team
 * DELETE /company/teams/:teamId   – delete team
 */

const { Router } = require('express');
const { asyncHandler, AppError, requireAuth, requireCompany, requireRole } = require('../middleware');
const { TeamService } = require('../../database/services/TeamService');
const { ContributorService } = require('../../database/services/ContributorService');

const teamService = new TeamService();
const contributorService = new ContributorService();
const router = Router();

router.use(requireAuth, requireCompany);

/* ──────────── POST / ──────────── */
router.post(
  '/',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { name, description, memberContributorIds } = req.body;
    if (!name) {
      throw new AppError('VALIDATION', 'name is required.', 400);
    }

    const team = await teamService.createTeam({
      companyId: req.companyId,
      name,
      description,
      createdBy: req.companyMember.clerkUserId,
      memberContributorIds: memberContributorIds || [],
    });

    res.status(201).json({
      success: true,
      data: {
        _id: team._id.toString(),
        name: team.name,
        memberCount: (team.memberContributorIds || []).length,
        createdAt: team.createdAt,
      },
    });
  }),
);

/* ──────────── GET / ──────────── */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const teams = await teamService.findByCompany(req.companyId);
    res.json({
      success: true,
      data: {
        teams: teams.map((t) => ({
          _id: t._id.toString(),
          name: t.name,
          description: t.description,
          memberCount: (t.memberContributorIds || []).length,
          createdAt: t.createdAt,
        })),
      },
    });
  }),
);

/* ──────────── GET /:teamId ──────────── */
router.get(
  '/:teamId',
  asyncHandler(async (req, res) => {
    const team = await teamService.findById(req.params.teamId);
    if (!team || team.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Team not found.', 404);
    }

    // Resolve member details
    const members = [];
    for (const cid of team.memberContributorIds || []) {
      const contributor = await contributorService.findById(cid.toString());
      if (contributor) {
        members.push({
          contributorId: contributor._id.toString(),
          githubUsername: contributor.githubUsername,
          avatarUrl: contributor.avatarUrl,
        });
      }
    }

    res.json({
      success: true,
      data: {
        _id: team._id.toString(),
        name: team.name,
        description: team.description,
        members,
        createdAt: team.createdAt,
      },
    });
  }),
);

/* ──────────── PATCH /:teamId ──────────── */
router.patch(
  '/:teamId',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const team = await teamService.findById(req.params.teamId);
    if (!team || team.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Team not found.', 404);
    }

    const { name, description, memberContributorIds } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length > 0) {
      await teamService.updateById(req.params.teamId, updates);
    }

    if (memberContributorIds) {
      await teamService.setMembers(req.params.teamId, memberContributorIds);
    }

    const updated = await teamService.findById(req.params.teamId);

    res.json({
      success: true,
      data: {
        _id: updated._id.toString(),
        name: updated.name,
        memberCount: (updated.memberContributorIds || []).length,
        updatedAt: updated.updatedAt,
      },
    });
  }),
);

/* ──────────── DELETE /:teamId ──────────── */
router.delete(
  '/:teamId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const team = await teamService.findById(req.params.teamId);
    if (!team || team.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Team not found.', 404);
    }

    await teamService.deleteById(req.params.teamId);

    res.json({
      success: true,
      data: { message: 'Team deleted.' },
    });
  }),
);

module.exports = router;
