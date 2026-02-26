/**
 * Authentication & authorisation middleware.
 *
 * - `requireAuth`        – verifies Clerk JWT via @clerk/express
 * - `requireCompany`     – extracts x-company-id, loads company member, attaches to req
 * - `requireContributor` – extracts x-contributor-id, loads contributor account, attaches to req
 * - `requireRole(...)`   – checks company member role
 * - `requireInternal`    – validates x-internal-secret header
 */

const { clerkMiddleware, requireAuth: clerkRequireAuth } = require('@clerk/express');
const { CompanyMemberService } = require('../../database/services/CompanyMemberService');
const { ContributorAccountService } = require('../../database/services/ContributorAccountService');
const { AppError } = require('./errorHandler');

const companyMemberService = new CompanyMemberService();
const contributorAccountService = new ContributorAccountService();

/**
 * Clerk session middleware – should be applied at app level.
 */
const clerkSession = clerkMiddleware();

/**
 * Require a valid Clerk session (any authenticated user).
 */
const requireAuth = clerkRequireAuth();

/**
 * Require x-company-id header, load membership, attach to `req.companyMember`.
 * Must be placed AFTER requireAuth.
 */
async function requireCompany(req, _res, next) {
  try {
    const companyId = req.headers['x-company-id'];
    if (!companyId) {
      throw new AppError('MISSING_COMPANY', 'x-company-id header is required.', 400);
    }

    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const member = await companyMemberService.findCompanyMember(companyId, clerkUserId);
    if (!member || !member.isActive) {
      throw new AppError('UNAUTHORIZED', 'You do not have permission to perform this action.', 403);
    }

    req.companyId = companyId;
    req.companyMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require x-contributor-id header, load contributor account, attach to `req.contributorAccount`.
 * Must be placed AFTER requireAuth.
 */
async function requireContributor(req, _res, next) {
  try {
    const contributorId = req.headers['x-contributor-id'];
    if (!contributorId) {
      throw new AppError('MISSING_CONTRIBUTOR', 'x-contributor-id header is required.', 400);
    }

    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const account = await contributorAccountService.findByClerkUserId(clerkUserId);
    if (!account) {
      throw new AppError('UNAUTHORIZED', 'Contributor account not found.', 403);
    }

    req.contributorId = contributorId;
    req.contributorAccount = account;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Factory: require the company member to have one of the specified roles.
 * Must be placed AFTER requireCompany.
 *
 * Usage: requireRole('admin', 'manager')
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.companyMember) {
      return next(new AppError('UNAUTHORIZED', 'Company membership required.', 403));
    }
    if (!roles.includes(req.companyMember.role)) {
      return next(
        new AppError(
          'FORBIDDEN',
          `This action requires one of: ${roles.join(', ')}. Your role: ${req.companyMember.role}.`,
          403,
        ),
      );
    }
    next();
  };
}

/**
 * Validate x-internal-secret header for worker/scheduler routes.
 */
function requireInternal(req, _res, next) {
  const secret = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_WORKER_SECRET;
  if (!expected || secret !== expected) {
    return next(new AppError('UNAUTHORIZED', 'Invalid internal secret.', 401));
  }
  next();
}

module.exports = {
  clerkSession,
  requireAuth,
  requireCompany,
  requireContributor,
  requireRole,
  requireInternal,
};
