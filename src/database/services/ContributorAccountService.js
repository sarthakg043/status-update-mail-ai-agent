/**
 * Contributor Account Service
 * Operations for the `contributor_accounts` collection.
 * Created only when a contributor accepts a Clerk invite and onboards themselves.
 */

const { ObjectId } = require('mongodb');
const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class ContributorAccountService extends BaseService {
  constructor() {
    super(COLLECTIONS.CONTRIBUTOR_ACCOUNTS);
  }

  /** Create an account when a contributor onboards. */
  async createAccount({ contributorId, clerkUserId, name = null, personalEmail = null }) {
    return this.create({
      contributorId: this._toObjectId(contributorId),
      clerkUserId,
      name,
      personalEmail,
      mailConfig: null,
      savedTemplates: [],
    });
  }

  /** Find account by contributor ID. */
  async findByContributorId(contributorId) {
    return this.findOne({ contributorId: this._toObjectId(contributorId) });
  }

  /** Find account by Clerk user ID. */
  async findByClerkUserId(clerkUserId) {
    return this.findOne({ clerkUserId });
  }

  /** Update mail configuration (Gmail / Zoho app password). */
  async updateMailConfig(contributorId, mailConfig) {
    return this.updateOne(
      { contributorId: this._toObjectId(contributorId) },
      { mailConfig },
    );
  }

  /** Add a saved template. Content is capped at 5 000 characters. */
  async addTemplate(contributorId, title, content) {
    if (content && content.length > 5000) {
      throw new Error('Template content must not exceed 5000 characters');
    }
    const coll = await this._collection();
    const now = new Date();
    return coll.updateOne(
      { contributorId: this._toObjectId(contributorId) },
      {
        $push: { savedTemplates: { _id: new ObjectId(), title, content, createdAt: now, updatedAt: now } },
        $set: { updatedAt: now },
      },
    );
  }

  /** Update an existing saved template. */
  async updateTemplate(contributorId, templateId, { title, content }) {
    if (content && content.length > 5000) {
      throw new Error('Template content must not exceed 5000 characters');
    }
    const coll = await this._collection();
    const now = new Date();
    const setFields = { 'savedTemplates.$.updatedAt': now, updatedAt: now };
    if (title !== undefined) setFields['savedTemplates.$.title'] = title;
    if (content !== undefined) setFields['savedTemplates.$.content'] = content;

    return coll.updateOne(
      { contributorId: this._toObjectId(contributorId), 'savedTemplates._id': this._toObjectId(templateId) },
      { $set: setFields },
    );
  }

  /** Delete a saved template. */
  async deleteTemplate(contributorId, templateId) {
    const coll = await this._collection();
    return coll.updateOne(
      { contributorId: this._toObjectId(contributorId) },
      {
        $pull: { savedTemplates: { _id: this._toObjectId(templateId) } },
        $set: { updatedAt: new Date() },
      },
    );
  }
}

module.exports = { ContributorAccountService };
