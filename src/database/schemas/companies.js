/**
 * Companies Collection Schema
 * Represents a subscribed company. One document per company.
 */

const companiesValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['clerkOrgId', 'name', 'email', 'subscription', 'createdAt', 'updatedAt'],
    properties: {
      clerkOrgId: { bsonType: 'string', description: 'Clerk organization ID' },
      name: { bsonType: 'string', description: 'Company name' },
      email: { bsonType: 'string', description: 'Company admin email' },
      logoUrl: { bsonType: ['string', 'null'], description: 'Company logo URL' },
      subscription: {
        bsonType: 'object',
        required: ['planName', 'status'],
        properties: {
          planId: { bsonType: 'objectId', description: 'Reference to plans collection' },
          planName: { bsonType: 'string', enum: ['free', 'starter', 'pro', 'enterprise'] },
          status: { bsonType: 'string', enum: ['active', 'past_due', 'canceled', 'trialing'] },
          stripeCustomerId: { bsonType: ['string', 'null'] },
          stripeSubscriptionId: { bsonType: ['string', 'null'] },
          currentPeriodStart: { bsonType: ['date', 'null'] },
          currentPeriodEnd: { bsonType: ['date', 'null'] },
          limits: {
            bsonType: 'object',
            properties: {
              maxRepos: { bsonType: 'int' },
              maxContributors: { bsonType: 'int' },
              maxEmailsPerMonth: { bsonType: 'int' },
            },
          },
          usage: {
            bsonType: 'object',
            properties: {
              reposCount: { bsonType: 'int' },
              contributorsCount: { bsonType: 'int' },
              emailsSentThisMonth: { bsonType: 'int' },
              usagePeriodStart: { bsonType: ['date', 'null'] },
            },
          },
        },
      },
      settings: {
        bsonType: 'object',
        properties: {
          defaultMonitoringType: { bsonType: 'string', enum: ['ghost', 'open'] },
          timezone: { bsonType: 'string' },
        },
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const companiesIndexes = [
  { key: { clerkOrgId: 1 }, options: { unique: true, name: 'clerkOrgId_unique' } },
  { key: { 'subscription.status': 1 }, options: { name: 'subscription_status' } },
];

module.exports = { companiesValidator, companiesIndexes };
