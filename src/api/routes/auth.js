/**
 * POST /auth/company/onboard  – create company after Clerk org creation
 * GET  /auth/me               – current user identity
 */

const { Router } = require('express');
const { asyncHandler, AppError, requireAuth } = require('../middleware');

const { CompanyService } = require('../../database/services/CompanyService');
const { CompanyMemberService } = require('../../database/services/CompanyMemberService');
const { ContributorService } = require('../../database/services/ContributorService');
const { ContributorAccountService } = require('../../database/services/ContributorAccountService');
const { PlanService } = require('../../database/services/PlanService');

const companyService = new CompanyService();
const companyMemberService = new CompanyMemberService();
const contributorService = new ContributorService();
const contributorAccountService = new ContributorAccountService();
const planService = new PlanService();

const router = Router();

/* ──────────── POST /auth/company/onboard ──────────── */

router.post(
  '/company/onboard',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { clerkOrgId, companyName, adminEmail, timezone } = req.body;

    if (!clerkOrgId || !companyName || !adminEmail) {
      throw new AppError('VALIDATION', 'clerkOrgId, companyName, and adminEmail are required.', 400);
    }

    // Check if company already exists
    const existing = await companyService.findByClerkOrgId(clerkOrgId);
    if (existing) {
      throw new AppError('DUPLICATE', 'Company already onboarded for this Clerk org.', 409);
    }

    // Find or create a free_trial plan
    let freePlan = await planService.findByName('free_trial');

    // Create the company
    const company = await companyService.createCompany({
      clerkOrgId,
      name: companyName,
      email: adminEmail,
      planName: 'free_trial',
      limits: freePlan?.limits || { maxRepos: 1, maxContributors: 3, maxEmailsPerMonth: 50 },
      settings: { timezone: timezone || 'UTC' },
    });

    // Create the admin member
    const clerkUserId = req.auth.userId;
    await companyMemberService.addMember({
      companyId: company._id.toString(),
      clerkUserId,
      email: adminEmail,
      role: 'admin',
    });

    res.status(201).json({
      success: true,
      data: {
        companyId: company._id.toString(),
        name: company.name,
        subscription: {
          planName: company.subscription?.planName || 'free_trial',
          status: company.subscription?.status || 'trialing',
        },
      },
    });
  }),
);

/* ──────────── GET /auth/me ──────────── */

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const clerkUserId = req.auth.userId;

    // Try company member first
    const member = await companyMemberService.findByClerkUserId(clerkUserId);
    if (member) {
      // Look up company name
      const company = await companyService.findById(member.companyId.toString());
      return res.json({
        success: true,
        data: {
          clerkUserId,
          type: 'company_member',
          role: member.role,
          companyId: member.companyId.toString(),
          companyName: company?.name || '',
        },
      });
    }

    // Try contributor
    const contributor = await contributorService.findByClerkUserId(clerkUserId);
    if (contributor) {
      const account = await contributorAccountService.findByContributorId(contributor._id.toString());
      return res.json({
        success: true,
        data: {
          clerkUserId,
          type: 'contributor',
          contributorId: contributor._id.toString(),
          githubUsername: contributor.githubUsername,
          hasCompletedOnboarding: !!account,
        },
      });
    }

    throw new AppError('NOT_FOUND', 'No account found for this user.', 404);
  }),
);

module.exports = router;
