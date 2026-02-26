/**
 * POST /webhooks/clerk   – receives Clerk webhook events
 * POST /webhooks/stripe  – receives Stripe webhook events
 */

const { Router } = require('express');
const { Webhook } = require('svix');
const { asyncHandler, AppError } = require('../middleware');

const { CompanyService } = require('../../database/services/CompanyService');
const { CompanyMemberService } = require('../../database/services/CompanyMemberService');
const { ContributorService } = require('../../database/services/ContributorService');
const { ContributorAccountService } = require('../../database/services/ContributorAccountService');
const { MonitoredContributorService } = require('../../database/services/MonitoredContributorService');
const { InviteService } = require('../../database/services/InviteService');
const { PlanService } = require('../../database/services/PlanService');

const companyService = new CompanyService();
const companyMemberService = new CompanyMemberService();
const contributorService = new ContributorService();
const contributorAccountService = new ContributorAccountService();
const monitoredContributorService = new MonitoredContributorService();
const inviteService = new InviteService();
const planService = new PlanService();

const router = Router();

/* ──────────────────────────── Clerk Webhook ──────────────────────────── */

router.post(
  '/clerk',
  asyncHandler(async (req, res) => {
    const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!CLERK_WEBHOOK_SECRET) {
      throw new AppError('CONFIG_ERROR', 'Clerk webhook secret not configured.', 500);
    }

    // Verify the webhook signature with Svix
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    const payload = JSON.stringify(req.body);
    const headers = {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    };

    let event;
    try {
      event = wh.verify(payload, headers);
    } catch (err) {
      console.error('Clerk webhook verification failed:', err.message);
      throw new AppError('WEBHOOK_INVALID', 'Webhook signature verification failed.', 400);
    }

    const { type, data } = event;
    console.log(`[Clerk Webhook] Received event: ${type}`);

    switch (type) {
      case 'user.created': {
        // No-op or log — the user will trigger onboarding themselves
        console.log(`[Clerk Webhook] New user created: ${data.id}`);
        break;
      }

      case 'organizationMembership.created': {
        // A new member was added to a Clerk org — create company_member record
        const { organization, public_user_data } = data;
        const company = await companyService.findByClerkOrgId(organization.id);
        if (company) {
          await companyMemberService.addMember({
            companyId: company._id.toString(),
            clerkUserId: public_user_data.user_id,
            email: public_user_data.identifier || '',
            name: `${public_user_data.first_name || ''} ${public_user_data.last_name || ''}`.trim(),
            role: data.role === 'admin' ? 'admin' : 'viewer',
          });
        }
        break;
      }

      case 'organizationInvitation.accepted': {
        // A contributor accepted their Clerk invite
        const { email_address, organization_id, public_metadata } = data;
        const { contributorId, monitoredContributorId } = public_metadata || {};

        if (contributorId && monitoredContributorId) {
          // Mark the invite as accepted in our database
          const invites = await inviteService.findByMonitoredContributor(monitoredContributorId);
          const matchingInvite = invites.find(
            (inv) => inv.inviteEmail === email_address && inv.status === 'sent',
          );
          if (matchingInvite) {
            await inviteService.markAccepted(matchingInvite._id.toString());
          }

          // Update the monitored contributor invite status
          await monitoredContributorService.updateInviteStatus(
            monitoredContributorId,
            'accepted',
            email_address,
          );
        }
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${type}`);
    }

    res.status(200).json({ received: true });
  }),
);

/* ──────────────────────────── Stripe Webhook ──────────────────────────── */

router.post(
  '/stripe',
  asyncHandler(async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_WEBHOOK_SECRET) {
      throw new AppError('CONFIG_ERROR', 'Stripe webhook secret not configured.', 500);
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Stripe webhook verification failed:', err.message);
      throw new AppError('WEBHOOK_INVALID', 'Webhook signature verification failed.', 400);
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        // Find company by Stripe customer ID
        const companies = await companyService.find({
          'subscription.stripeCustomerId': subscription.customer,
        });
        const company = companies[0];
        if (company) {
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = priceId ? await planService.findByStripePriceId(priceId) : null;

          await companyService.updateSubscription(company._id.toString(), {
            status: subscription.status,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            ...(plan && { planName: plan.name, limits: plan.limits }),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const companies = await companyService.find({
          'subscription.stripeSubscriptionId': subscription.id,
        });
        const company = companies[0];
        if (company) {
          await companyService.updateSubscription(company._id.toString(), {
            status: 'canceled',
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const companies = await companyService.find({
          'subscription.stripeCustomerId': invoice.customer,
        });
        const company = companies[0];
        if (company) {
          await companyService.updateSubscription(company._id.toString(), {
            status: 'past_due',
          });
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  }),
);

module.exports = router;
