/**
 * Plan Service
 * Operations for the `plans` collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class PlanService extends BaseService {
  constructor() {
    super(COLLECTIONS.PLANS);
  }

  /** Create a new plan definition. */
  async createPlan({ name, displayName, priceMonthly, priceYearly = null, stripePriceIdMonthly = null, stripePriceIdYearly = null, limits, isActive = true }) {
    return this.create({
      name,
      displayName,
      priceMonthly,
      priceYearly,
      stripePriceIdMonthly,
      stripePriceIdYearly,
      limits,
      isActive,
    });
  }

  /** Find a plan by name. */
  async findByName(name) {
    return this.findOne({ name });
  }

  /** Get all active plans. */
  async findActivePlans() {
    return this.find({ isActive: true });
  }

  /** Deactivate a plan (soft-delete). */
  async deactivatePlan(planId) {
    return this.updateById(planId, { isActive: false });
  }

  /** Find a plan by Stripe price ID (monthly or yearly). */
  async findByStripePriceId(stripePriceId) {
    return this.findOne({
      $or: [
        { stripePriceIdMonthly: stripePriceId },
        { stripePriceIdYearly: stripePriceId },
      ],
    });
  }
}

module.exports = { PlanService };
