/**
 * Company Service
 * Operations for the `companies` collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');
const { Int32 } = require('mongodb');

class CompanyService extends BaseService {
  constructor() {
    super(COLLECTIONS.COMPANIES);
  }

  /** Find a company by its Clerk organization ID. */
  async findByClerkOrgId(clerkOrgId) {
    return this.findOne({ clerkOrgId });
  }

  /** Create a new company with sensible defaults. */
  async createCompany({ clerkOrgId, name, email, logoUrl = null, planName = 'free', limits, settings }) {
    const safeLimits = limits || { maxRepos: 1, maxContributors: 5, maxEmailsPerMonth: 50 };
    return this.create({
      clerkOrgId,
      name,
      email,
      logoUrl,
      subscription: {
        planName,
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        limits: {
          maxRepos: new Int32(safeLimits.maxRepos),
          maxContributors: new Int32(safeLimits.maxContributors),
          maxEmailsPerMonth: new Int32(safeLimits.maxEmailsPerMonth),
        },
        usage: {
          reposCount: new Int32(0),
          contributorsCount: new Int32(0),
          emailsSentThisMonth: new Int32(0),
          usagePeriodStart: new Date(),
        },
      },
      settings: settings || { defaultMonitoringType: 'ghost', timezone: 'UTC' },
    });
  }

  /** Update subscription details. */
  async updateSubscription(companyId, subscriptionData) {
    return this.updateById(companyId, {
      'subscription.planName': subscriptionData.planName,
      'subscription.status': subscriptionData.status,
      ...(subscriptionData.stripeCustomerId && { 'subscription.stripeCustomerId': subscriptionData.stripeCustomerId }),
      ...(subscriptionData.stripeSubscriptionId && { 'subscription.stripeSubscriptionId': subscriptionData.stripeSubscriptionId }),
      ...(subscriptionData.currentPeriodStart && { 'subscription.currentPeriodStart': subscriptionData.currentPeriodStart }),
      ...(subscriptionData.currentPeriodEnd && { 'subscription.currentPeriodEnd': subscriptionData.currentPeriodEnd }),
      ...(subscriptionData.limits && { 'subscription.limits': subscriptionData.limits }),
    });
  }

  /** Increment a usage counter atomically. */
  async incrementUsage(companyId, field, amount = 1) {
    const coll = await this._collection();
    const updateKey = `subscription.usage.${field}`;
    return coll.updateOne(
      { _id: this._toObjectId(companyId) },
      { $inc: { [updateKey]: amount }, $set: { updatedAt: new Date() } },
    );
  }

  /** Reset monthly usage counters (called at billing period start). */
  async resetMonthlyUsage(companyId) {
    return this.updateById(companyId, {
      'subscription.usage.emailsSentThisMonth': 0,
      'subscription.usage.usagePeriodStart': new Date(),
    });
  }

  /** Find all active companies. */
  async findActiveCompanies() {
    return this.find({ 'subscription.status': 'active' });
  }
}

module.exports = { CompanyService };
