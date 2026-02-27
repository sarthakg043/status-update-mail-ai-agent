/**
 * Repository Service
 * Operations for the `repositories` collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');
const { Int32 } = require('mongodb');

class RepositoryService extends BaseService {
  constructor() {
    super(COLLECTIONS.REPOSITORIES);
  }

  /** Onboard a new repository for a company. */
  async onboardRepo({ companyId, githubRepoId, owner, name, fullName, isPrivate, encryptedAccessToken, tokenAddedBy }) {
    return this.create({
      companyId: this._toObjectId(companyId),
      githubRepoId: new Int32(githubRepoId),
      owner,
      name,
      fullName,
      isPrivate,
      encryptedAccessToken,
      tokenAddedBy: tokenAddedBy || null,
      status: 'active',
      lastSyncedAt: null,
    });
  }

  /** Find all repositories for a company. */
  async findByCompany(companyId, activeOnly = true) {
    const query = { companyId: this._toObjectId(companyId) };
    if (activeOnly) query.status = 'active';
    return this.find(query);
  }

  /** Find a repo by company + full name. */
  async findByFullName(companyId, fullName) {
    return this.findOne({ companyId: this._toObjectId(companyId), fullName });
  }

  /** Update the access token for a repo. */
  async updateToken(repoId, encryptedAccessToken, tokenAddedBy) {
    return this.updateById(repoId, {
      encryptedAccessToken,
      tokenAddedBy: tokenAddedBy || null,
      status: 'active',
    });
  }

  /** Mark a repo's token as errored or revoked. */
  async setStatus(repoId, status) {
    return this.updateById(repoId, { status });
  }

  /** Record the last time this repo's data was synced. */
  async updateLastSynced(repoId) {
    return this.updateById(repoId, { lastSyncedAt: new Date() });
  }
}

module.exports = { RepositoryService };
