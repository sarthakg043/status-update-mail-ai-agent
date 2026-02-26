/**
 * Invites Collection Schema
 * Tracks Clerk invitations sent to contributors for open monitoring.
 */

const invitesValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['monitoredContributorId', 'companyId', 'contributorId', 'githubUsername', 'inviteEmail', 'status', 'createdAt'],
    properties: {
      monitoredContributorId: { bsonType: 'objectId' },
      companyId: { bsonType: 'objectId' },
      contributorId: { bsonType: 'objectId' },
      githubUsername: { bsonType: 'string' },
      inviteEmail: { bsonType: 'string' },
      clerkInvitationId: { bsonType: ['string', 'null'] },
      status: { bsonType: 'string', enum: ['sent', 'accepted', 'expired', 'revoked'] },
      sentAt: { bsonType: ['date', 'null'] },
      acceptedAt: { bsonType: ['date', 'null'] },
      expiresAt: { bsonType: ['date', 'null'] },
      createdAt: { bsonType: 'date' },
    },
  },
};

const invitesIndexes = [
  { key: { monitoredContributorId: 1 }, options: { name: 'monitoredContributorId' } },
  { key: { clerkInvitationId: 1 }, options: { unique: true, sparse: true, name: 'clerkInvitationId_unique' } },
  { key: { status: 1 }, options: { name: 'status' } },
];

module.exports = { invitesValidator, invitesIndexes };
