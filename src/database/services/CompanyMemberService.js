/**
 * Company Member Service
 * Operations for the `company_members` collection.
 */

const { COLLECTIONS } = require('../collections');
const { BaseService } = require('./BaseService');

class CompanyMemberService extends BaseService {
  constructor() {
    super(COLLECTIONS.COMPANY_MEMBERS);
  }

  /** Add a member to a company. */
  async addMember({ companyId, clerkUserId, email, name = null, role = 'viewer' }) {
    return this.create({
      companyId: this._toObjectId(companyId),
      clerkUserId,
      email,
      name,
      role,
      isActive: true,
    });
  }

  /** Find all members of a company. */
  async findByCompany(companyId) {
    return this.find({ companyId: this._toObjectId(companyId), isActive: true });
  }

  /** Find a member by Clerk user ID (for auth middleware). */
  async findByClerkUserId(clerkUserId) {
    return this.findOne({ clerkUserId, isActive: true });
  }

  /** Find a specific member inside a specific company. */
  async findCompanyMember(companyId, clerkUserId) {
    return this.findOne({ companyId: this._toObjectId(companyId), clerkUserId });
  }

  /** Update a member's role. */
  async updateRole(companyId, clerkUserId, role) {
    return this.updateOne(
      { companyId: this._toObjectId(companyId), clerkUserId },
      { role },
    );
  }

  /** Deactivate a member (soft-delete). */
  async deactivateMember(companyId, clerkUserId) {
    return this.updateOne(
      { companyId: this._toObjectId(companyId), clerkUserId },
      { isActive: false },
    );
  }
}

module.exports = { CompanyMemberService };
