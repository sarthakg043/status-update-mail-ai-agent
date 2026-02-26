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
    if (!githubUsers.length) return [];

    const coll = await this._collection();
    const userIds = githubUsers.map((u) => u.githubUserId);

    // Single query to find all existing contributors
    const existing = await coll.find({ githubUserId: { $in: userIds } }).toArray();
    const existingMap = new Map(existing.map((c) => [c.githubUserId, c]));

    const toInsert = [];
    const now = new Date();
    for (const user of githubUsers) {
      if (!existingMap.has(user.githubUserId)) {
        toInsert.push({
          githubUsername: user.githubUsername,
          githubUserId: user.githubUserId,
          githubProfileUrl: user.githubProfileUrl || null,
          avatarUrl: user.avatarUrl || null,
          discoveredEmails: [],
          hasAccount: false,
          clerkUserId: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (toInsert.length > 0) {
      const insertResult = await coll.insertMany(toInsert, { ordered: false });
      toInsert.forEach((doc, i) => {
        doc._id = insertResult.insertedIds[i];
        existingMap.set(doc.githubUserId, doc);
      });
    }

    // Return in the same order as the input
    return githubUsers.map((u) => existingMap.get(u.githubUserId));
  }
}

module.exports = { ContributorService };
