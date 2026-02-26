/**
 * Express application factory.
 *
 * Creates and configures the Express app with all route groups,
 * middleware, and error handling.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { clerkSession, errorHandler } = require('./middleware');
const { getMongoConnection } = require('../database/mongodb');
const {
  webhookRoutes,
  authRoutes,
  companyMemberRoutes,
  companyRepoRoutes,
  companyMonitoredContributorRoutes,
  companyTeamRoutes,
  companySummaryAnalyticsRoutes,
  companySubscriptionRoutes,
  contributorRoutes,
  internalRoutes,
} = require('./routes');

function createApp() {
  const app = express();

  /* ── Global middleware ─────────────────────────────────────────────── */
  app.use(helmet());
  app.use(cors());

  // Stripe webhook needs the raw body for signature verification.
  // Mount it BEFORE the global json parser.
  app.use(
    '/v1/webhooks/stripe',
    express.raw({ type: 'application/json' }),
  );

  // JSON body parser for everything else
  app.use(express.json());

  // Clerk session middleware (populates req.auth when a valid token is present)
  app.use(clerkSession);

  /* ── Health check ──────────────────────────────────────────────────── */
  app.get('/health', async (_req, res) => {
    const start = Date.now();

    // ── 1. MongoDB ────────────────────────────────────────────────────
    let mongoStatus = { status: 'ok', message: 'Connected' };
    try {
      const mongo = getMongoConnection();
      const db = await mongo.connect();
      await db.admin().command({ ping: 1 });
    } catch (err) {
      mongoStatus = { status: 'error', message: err.message };
    }

    // ── 2. Service config checks (env vars present, not exposed) ──────
    const services = {
      clerk: {
        vars: ['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'],
      },
      github: {
        vars: ['GITHUB_TOKEN', 'GITHUB_USERNAME'],
      },
      gemini: {
        vars: ['GEMINI_API_KEY'],
      },
      email: {
        vars: ['EMAIL_USER', 'EMAIL_APP_PASSWORD'],
      },
      stripe: {
        vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
      },
      clerkWebhook: {
        vars: ['CLERK_WEBHOOK_SECRET'],
      },
      internalWorker: {
        vars: ['INTERNAL_WORKER_SECRET'],
      },
      mongodb: {
        vars: ['MONGODB_USERNAME', 'MONGODB_PASSWORD'],
      },
    };

    const serviceChecks = {};
    for (const [name, { vars }] of Object.entries(services)) {
      const missing = vars.filter((v) => !process.env[v]);
      serviceChecks[name] = missing.length === 0
        ? { status: 'ok', configured: true }
        : { status: 'warning', configured: false, missing };
    }

    // ── 3. Route groups ───────────────────────────────────────────────
    const routes = {
      'POST /v1/webhooks/clerk': 'registered',
      'POST /v1/webhooks/stripe': 'registered',
      'GET|POST /v1/auth/*': 'registered',
      'GET|POST|PATCH|DELETE /v1/company/members/*': 'registered',
      'GET|POST|DELETE /v1/company/repos/*': 'registered',
      'GET|POST|PATCH|DELETE /v1/company/monitored-contributors/*': 'registered',
      'GET|POST|PATCH|DELETE /v1/company/teams/*': 'registered',
      'GET /v1/company/summary-runs': 'registered',
      'GET /v1/company/analytics/*': 'registered',
      'GET|POST /v1/company/subscription': 'registered',
      'GET /v1/company/plans': 'registered',
      'GET|PATCH /v1/contributor/*': 'registered',
      'POST /v1/internal/*': 'registered',
    };

    // ── 4. Aggregate overall status ───────────────────────────────────
    const hasError = mongoStatus.status === 'error';
    const hasWarning = Object.values(serviceChecks).some((s) => s.status === 'warning');
    const overallStatus = hasError ? 'error' : hasWarning ? 'degraded' : 'ok';

    const httpStatus = overallStatus === 'error' ? 503 : 200;

    res.status(httpStatus).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - start,
      checks: {
        database: mongoStatus,
        services: serviceChecks,
        routes,
      },
    });
  });

  /* ── API v1 routes ──────────────────────────────────────────────────── */
  const v1 = express.Router();

  // 1. Webhooks (no auth — use signature verification inside)
  v1.use('/webhooks', webhookRoutes);

  // 2. Auth
  v1.use('/auth', authRoutes);

  // 3-8. Company routes
  v1.use('/company/members', companyMemberRoutes);
  v1.use('/company/repos', companyRepoRoutes);
  v1.use('/company/monitored-contributors', companyMonitoredContributorRoutes);
  v1.use('/company/teams', companyTeamRoutes);
  v1.use('/company', companySummaryAnalyticsRoutes);          // /company/summary-runs & /company/analytics/*
  v1.use('/company', companySubscriptionRoutes);               // /company/subscription & /company/plans

  // 9-11. Contributor routes
  v1.use('/contributor', contributorRoutes);

  // 12. Internal scheduler/worker routes
  v1.use('/internal', internalRoutes);

  app.use('/v1', v1);

  /* ── 404 handler ───────────────────────────────────────────────────── */
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });

  /* ── Error handler (must be last) ──────────────────────────────────── */
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
