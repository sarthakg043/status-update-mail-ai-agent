/**
 * Summary Run Service
 * Operations for the `summary_runs` collection – the historical log.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class SummaryRunService extends BaseService {
  constructor() {
    super(COLLECTIONS.SUMMARY_RUNS);
  }

  /** Create a new summary run record. */
  async createRun({
    monitoredContributorId, companyId, contributorId, repositoryId,
    githubUsername, repoFullName,
    scheduledAt = null, triggerType = 'scheduled',
  }) {
    return this.create({
      monitoredContributorId: this._toObjectId(monitoredContributorId),
      companyId: this._toObjectId(companyId),
      contributorId: this._toObjectId(contributorId),
      repositoryId: this._toObjectId(repositoryId),
      githubUsername,
      repoFullName,
      scheduledAt,
      startedAt: new Date(),
      completedAt: null,
      fetchWindow: null,
      prStats: null,
      hasActivity: false,
      aiSummary: null,
      contributorNoteSnapshot: null,
      emailStatus: { status: 'pending', sentAt: null, recipients: [], failureReason: null },
      triggerType,
    });
  }

  /** Mark a run as completed with results. */
  async completeRun(runId, { fetchWindow, prStats, hasActivity, aiSummary, contributorNoteSnapshot }) {
    const coll = await this._collection();
    return coll.updateOne(
      { _id: this._toObjectId(runId) },
      {
        $set: {
          completedAt: new Date(),
          fetchWindow,
          prStats,
          hasActivity,
          aiSummary,
          contributorNoteSnapshot,
        },
      },
    );
  }

  /** Update the email status of a run. */
  async updateEmailStatus(runId, emailStatus) {
    const coll = await this._collection();
    return coll.updateOne(
      { _id: this._toObjectId(runId) },
      { $set: { emailStatus } },
    );
  }

  /** Get timeline for a specific monitoring slot (ordered newest first). */
  async getTimeline(monitoredContributorId, { limit = 20, skip = 0 } = {}) {
    return this.find(
      { monitoredContributorId: this._toObjectId(monitoredContributorId) },
      { sort: { createdAt: -1 }, limit, skip },
    );
  }

  /** Get all runs for a company (company-wide analytics). */
  async findByCompany(companyId, { limit = 50, skip = 0, startDate, endDate } = {}) {
    const query = { companyId: this._toObjectId(companyId) };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    return this.find(query, { sort: { createdAt: -1 }, limit, skip });
  }

  /** Get all runs for a contributor (contributor dashboard). */
  async findByContributor(contributorId, { limit = 50, skip = 0 } = {}) {
    return this.find(
      { contributorId: this._toObjectId(contributorId) },
      { sort: { createdAt: -1 }, limit, skip },
    );
  }

  /** Get all runs for a specific repository. */
  async findByRepository(repositoryId, { limit = 50, skip = 0 } = {}) {
    return this.find(
      { repositoryId: this._toObjectId(repositoryId) },
      { sort: { createdAt: -1 }, limit, skip },
    );
  }

  /** Get aggregated stats for a company over a date range. */
  async getCompanyStats(companyId, startDate, endDate) {
    const coll = await this._collection();
    const match = { companyId: this._toObjectId(companyId) };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const result = await coll.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          totalPRs: { $sum: '$prStats.totalPRsFetched' },
          runsWithActivity: { $sum: { $cond: ['$hasActivity', 1, 0] } },
          emailsSent: { $sum: { $cond: [{ $eq: ['$emailStatus.status', 'sent'] }, 1, 0] } },
        },
      },
    ]).toArray();

    return result[0] || { totalRuns: 0, totalPRs: 0, runsWithActivity: 0, emailsSent: 0 };
  }
}

module.exports = { SummaryRunService };
