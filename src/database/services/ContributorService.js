/**
 * Contributor Service
 * Operations for the `contributors` collection (global GitHub user registry).
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class ContributorService extends BaseService {
  constructor() {
    super(COLLECTIONS.CONTRIBUTORS);
  }

  /** Find or create a contributor by GitHub user ID. */
  async findOrCreate({ githubUsername, githubUserId, githubProfileUrl = null, avatarUrl = null }) {
    const existing = await this.findOne({ githubUserId });
    if (existing) return existing;

    return this.create({
      githubUsername,
      githubUserId,
      githubProfileUrl,
      avatarUrl,
      discoveredEmails: [],
      hasAccount: false,
      clerkUserId: null,
    });
  }

  /** Find a contributor by GitHub username. */
  async findByGithubUsername(githubUsername) {
    return this.findOne({ githubUsername });
  }

  /** Find a contributor by GitHub user ID. */
  async findByGithubUserId(githubUserId) {
    return this.findOne({ githubUserId });
  }

  /** Find a contributor by Clerk user ID (after onboarding). */
  async findByClerkUserId(clerkUserId) {
    return this.findOne({ clerkUserId });
  }

  /** Add a discovered email to the contributor. Avoids duplicates. */
  async addDiscoveredEmail(contributorId, email, source = 'commit') {
    const coll = await this._collection();
    return coll.updateOne(
      { _id: this._toObjectId(contributorId), 'discoveredEmails.email': { $ne: email } },
      {
        $push: { discoveredEmails: { email, source, discoveredAt: new Date() } },
        $set: { updatedAt: new Date() },
      },
    );
  }

  /** Link a Clerk account to this contributor (after they accept an invite). */
  async linkClerkAccount(contributorId, clerkUserId) {
    return this.updateById(contributorId, { clerkUserId, hasAccount: true });
  }

  /** Bulk find or create contributors from a list of GitHub users. */
  async bulkFindOrCreate(githubUsers) {
    const results = [];
    for (const user of githubUsers) {
      const contributor = await this.findOrCreate(user);
      results.push(contributor);
    }
    return results;
  }
}

module.exports = { ContributorService };
