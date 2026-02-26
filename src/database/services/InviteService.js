/**
 * Invite Service
 * Operations for the `invites` collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class InviteService extends BaseService {
  constructor() {
    super(COLLECTIONS.INVITES);
  }

  /** Create a new invite record. */
  async createInvite({ monitoredContributorId, companyId, contributorId, githubUsername, inviteEmail, clerkInvitationId = null, expiresAt = null }) {
    return this.create({
      monitoredContributorId: this._toObjectId(monitoredContributorId),
      companyId: this._toObjectId(companyId),
      contributorId: this._toObjectId(contributorId),
      githubUsername,
      inviteEmail,
      clerkInvitationId,
      status: 'sent',
      sentAt: new Date(),
      acceptedAt: null,
      expiresAt,
    });
  }

  /** Find an invite by Clerk invitation ID (for webhook callbacks). */
  async findByClerkInvitationId(clerkInvitationId) {
    return this.findOne({ clerkInvitationId });
  }

  /** Find all invites for a monitored contributor. */
  async findByMonitoredContributor(monitoredContributorId) {
    return this.find(
      { monitoredContributorId: this._toObjectId(monitoredContributorId) },
      { sort: { createdAt: -1 } },
    );
  }

  /** Mark an invite as accepted. */
  async markAccepted(inviteId) {
    return this.updateById(inviteId, { status: 'accepted', acceptedAt: new Date() });
  }

  /** Mark an invite as expired. */
  async markExpired(inviteId) {
    return this.updateById(inviteId, { status: 'expired' });
  }

  /** Revoke an invite. */
  async revoke(inviteId) {
    return this.updateById(inviteId, { status: 'revoked' });
  }

  /** Expire all invites that have passed their expiresAt date. */
  async expireOldInvites(now = new Date()) {
    return this.updateMany(
      { status: 'sent', expiresAt: { $lte: now } },
      { status: 'expired' },
    );
  }
}

module.exports = { InviteService };
