/**
 * Company Subscription & Billing routes
 *
 * GET  /company/subscription          – current plan + usage
 * GET  /company/plans                 – list available plans
 * POST /company/subscription/checkout – create Stripe Checkout session
 * POST /company/subscription/portal   – create Stripe Customer Portal session
 */

const { Router } = require('express');
const { asyncHandler, AppError, requireAuth, requireCompany, requireRole } = require('../middleware');

const { CompanyService } = require('../../database/services/CompanyService');
const { PlanService } = require('../../database/services/PlanService');

const companyService = new CompanyService();
const planService = new PlanService();

const router = Router();

/* ──────────── GET /subscription ──────────── */
router.get(
  '/subscription',
  requireAuth,
  requireCompany,
  asyncHandler(async (req, res) => {
    const company = await companyService.findById(req.companyId);
    if (!company) {
      throw new AppError('NOT_FOUND', 'Company not found.', 404);
    }

    const sub = company.subscription || {};

    res.json({
      success: true,
      data: {
        planName: sub.planName,
        displayName: sub.displayName || sub.planName,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        limits: sub.limits || {},
        usage: sub.usage || {},
      },
    });
  }),
);

/* ──────────── GET /plans ──────────── */
router.get(
  '/plans',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const plans = await planService.findActivePlans();
    res.json({
      success: true,
      data: {
        plans: plans.map((p) => ({
          _id: p._id.toString(),
          name: p.name,
          displayName: p.displayName,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
          limits: p.limits,
        })),
      },
    });
  }),
);

/* ──────────── POST /subscription/checkout ──────────── */
router.post(
  '/subscription/checkout',
  requireAuth,
  requireCompany,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('CONFIG_ERROR', 'Stripe is not configured.', 500);
    }

    const { planId, billingInterval, successUrl, cancelUrl } = req.body;
    if (!planId || !successUrl || !cancelUrl) {
      throw new AppError('VALIDATION', 'planId, successUrl, and cancelUrl are required.', 400);
    }

    const plan = await planService.findById(planId);
    if (!plan) {
      throw new AppError('NOT_FOUND', 'Plan not found.', 404);
    }

    const priceId =
      billingInterval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) {
      throw new AppError('CONFIG_ERROR', 'No Stripe price ID configured for this plan.', 500);
    }

    const company = await companyService.findById(req.companyId);
    let customerId = company?.subscription?.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company.email,
        metadata: { companyId: req.companyId },
      });
      customerId = customer.id;
      await companyService.updateSubscription(req.companyId, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({
      success: true,
      data: { checkoutUrl: session.url },
    });
  }),
);

/* ──────────── POST /subscription/portal ──────────── */
router.post(
  '/subscription/portal',
  requireAuth,
  requireCompany,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('CONFIG_ERROR', 'Stripe is not configured.', 500);
    }

    const { returnUrl } = req.body;
    if (!returnUrl) {
      throw new AppError('VALIDATION', 'returnUrl is required.', 400);
    }

    const company = await companyService.findById(req.companyId);
    const customerId = company?.subscription?.stripeCustomerId;
    if (!customerId) {
      throw new AppError('BILLING_NOT_SETUP', 'No Stripe customer found. Subscribe to a plan first.', 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({
      success: true,
      data: { portalUrl: session.url },
    });
  }),
);

module.exports = router;
