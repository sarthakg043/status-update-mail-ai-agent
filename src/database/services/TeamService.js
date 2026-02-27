/**
 * Team Service
 * Operations for the `teams` collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class TeamService extends BaseService {
  constructor() {
    super(COLLECTIONS.TEAMS);
  }

  /** Create a new team. */
  async createTeam({ companyId, name, description = null, createdBy, memberContributorIds = [] }) {
    return this.create({
      companyId: this._toObjectId(companyId),
      name,
      description,
      createdBy,
      memberContributorIds: memberContributorIds.map((id) => this._toObjectId(id)),
    });
  }

  /** Find all teams for a company. */
  async findByCompany(companyId) {
    return this.find({ companyId: this._toObjectId(companyId) });
  }

  /** Find all teams a contributor belongs to. */
  async findByContributor(contributorId) {
    return this.find({ memberContributorIds: this._toObjectId(contributorId) });
  }

  /** Add a contributor to a team. */
  async addMember(teamId, contributorId) {
    const coll = await this._collection();
    return coll.updateOne(
      { _id: this._toObjectId(teamId) },
      {
        $addToSet: { memberContributorIds: this._toObjectId(contributorId) },
        $set: { updatedAt: new Date() },
      },
    );
  }

  /** Remove a contributor from a team. */
  async removeMember(teamId, contributorId) {
    const coll = await this._collection();
    return coll.updateOne(
      { _id: this._toObjectId(teamId) },
      {
        $pull: { memberContributorIds: this._toObjectId(contributorId) },
        $set: { updatedAt: new Date() },
      },
    );
  }

  /** Replace all members of a team. */
  async setMembers(teamId, contributorIds) {
    return this.updateById(teamId, {
      memberContributorIds: contributorIds.map((id) => this._toObjectId(id)),
    });
  }
}

module.exports = { TeamService };
