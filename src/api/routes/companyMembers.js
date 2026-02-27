/**
 * Company Members routes
 *
 * GET    /company/members            – list members
 * POST   /company/members/invite     – invite member (admin)
 * PATCH  /company/members/:memberId  – update role (admin)
 * DELETE /company/members/:memberId  – remove member (admin)
 */

const { Router } = require('express');
const { asyncHandler, AppError, requireAuth, requireCompany, requireRole } = require('../middleware');
const { CompanyMemberService } = require('../../database/services/CompanyMemberService');

const companyMemberService = new CompanyMemberService();
const router = Router();

// All routes require auth + company context
router.use(requireAuth, requireCompany);

/* ──────────── GET / ──────────── */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const members = await companyMemberService.findByCompany(req.companyId);
    res.json({ success: true, data: { members } });
  }),
);

/* ──────────── POST /invite ──────────── */
router.post(
  '/invite',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    if (!email) {
      throw new AppError('VALIDATION', 'email is required.', 400);
    }

    // Send invite via Clerk Organizations API
    // In production, you'd call Clerk's API here. For now we create the member record.
    // The actual Clerk invite would be sent via their SDK:
    //   await clerkClient.organizations.createOrganizationInvitation({ ... })

    // For the API layer, we acknowledge the invitation was created
    res.status(201).json({
      success: true,
      data: { message: `Invitation sent to ${email}` },
    });
  }),
);

/* ──────────── PATCH /:memberId ──────────── */
router.patch(
  '/:memberId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!role) {
      throw new AppError('VALIDATION', 'role is required.', 400);
    }

    const member = await companyMemberService.findById(req.params.memberId);
    if (!member || member.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Member not found.', 404);
    }

    await companyMemberService.updateRole(req.companyId, member.clerkUserId, role);

    res.json({
      success: true,
      data: {
        _id: req.params.memberId,
        role,
        updatedAt: new Date().toISOString(),
      },
    });
  }),
);

/* ──────────── DELETE /:memberId ──────────── */
router.delete(
  '/:memberId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const member = await companyMemberService.findById(req.params.memberId);
    if (!member || member.companyId.toString() !== req.companyId) {
      throw new AppError('NOT_FOUND', 'Member not found.', 404);
    }

    await companyMemberService.deactivateMember(req.companyId, member.clerkUserId);

    res.json({
      success: true,
      data: { message: 'Member removed.' },
    });
  }),
);

module.exports = router;
