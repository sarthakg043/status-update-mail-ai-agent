/**
 * Monitored Contributor Service
 * Operations for the `monitored_contributors` collection – the central/core collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class MonitoredContributorService extends BaseService {
  constructor() {
    super(COLLECTIONS.MONITORED_CONTRIBUTORS);
  }

  /** Create a new monitoring slot. */
  async createMonitoring({
    companyId, contributorId, repositoryId,
    githubUsername, repoFullName,
    monitoringType = 'ghost', schedule, fetchConfig, emailConfig,
    addedBy = null,
  }) {
    return this.create({
      companyId: this._toObjectId(companyId),
      contributorId: this._toObjectId(contributorId),
      repositoryId: this._toObjectId(repositoryId),
      githubUsername,
      repoFullName,
      monitoringType,
      status: 'active',
      inviteStatus: monitoringType === 'open' ? 'not_sent' : 'not_sent',
      inviteEmail: null,
      schedule: {
        type: 'daily',
        config: {},
        time: '09:00',
        timezone: 'UTC',
        isActive: true,
        nextRunAt: null,
        lastRunAt: null,
        ...schedule,
      },
      fetchConfig: fetchConfig || { windowType: 'since_last_run', dateRange: null },
      emailConfig: emailConfig || { recipients: [] },
      contributorNote: null,
      addedBy: addedBy || null,
    });
  }

  /** Find all monitoring slots for a company. */
  async findByCompany(companyId) {
    return this.find({ companyId: this._toObjectId(companyId), status: { $ne: 'removed' } });
  }

  /** Find all monitoring slots for a contributor (contributor dashboard). */
  async findByContributor(contributorId) {
    return this.find({ contributorId: this._toObjectId(contributorId), status: { $ne: 'removed' } });
  }

  /** Find monitoring slots for a specific company + repo. */
  async findByCompanyAndRepo(companyId, repositoryId) {
    return this.find({
      companyId: this._toObjectId(companyId),
      repositoryId: this._toObjectId(repositoryId),
      status: { $ne: 'removed' },
    });
  }

  /**
   * Get all monitoring slots that are due to run.
   * Used by the scheduler cron job.
   */
  async findDueForRun(now = new Date()) {
    return this.find({
      'schedule.nextRunAt': { $lte: now },
      'schedule.isActive': true,
      status: 'active',
    });
  }

  /** Update the schedule for a monitoring slot. */
  async updateSchedule(monitoringId, schedule) {
    return this.updateById(monitoringId, { schedule });
  }

  /** Record that a run just happened: update lastRunAt and set next nextRunAt. */
  async recordRunCompleted(monitoringId, nextRunAt) {
    return this.updateById(monitoringId, {
      'schedule.lastRunAt': new Date(),
      'schedule.nextRunAt': nextRunAt,
    });
  }

  /** Update the contributor's note (typed by the contributor). */
  async updateContributorNote(monitoringId, note) {
    if (note && note.length > 5000) {
      throw new Error('Contributor note must not exceed 5000 characters');
    }
    return this.updateById(monitoringId, { contributorNote: note });
  }

  /** Update invite status after an invite is sent or accepted. */
  async updateInviteStatus(monitoringId, inviteStatus, inviteEmail = undefined) {
    const update = { inviteStatus };
    if (inviteEmail !== undefined) update.inviteEmail = inviteEmail;
    return this.updateById(monitoringId, update);
  }

  /** Pause monitoring. */
  async pause(monitoringId) {
    return this.updateById(monitoringId, { status: 'paused' });
  }

  /** Resume monitoring. */
  async resume(monitoringId) {
    return this.updateById(monitoringId, { status: 'active' });
  }

  /** Soft-remove monitoring. */
  async remove(monitoringId) {
    return this.updateById(monitoringId, { status: 'removed', 'schedule.isActive': false });
  }

  /** Update email recipients. */
  async updateRecipients(monitoringId, recipients) {
    return this.updateById(monitoringId, { 'emailConfig.recipients': recipients });
  }
}

module.exports = { MonitoredContributorService };
