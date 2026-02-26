/**
 * Collection Names - Single source of truth for all MongoDB collection names.
 * Use these constants throughout the application to avoid typos and enable easy renaming.
 */

const COLLECTIONS = {
  COMPANIES: 'companies',
  COMPANY_MEMBERS: 'company_members',
  REPOSITORIES: 'repositories',
  CONTRIBUTORS: 'contributors',
  CONTRIBUTOR_ACCOUNTS: 'contributor_accounts',
  MONITORED_CONTRIBUTORS: 'monitored_contributors',
  SUMMARY_RUNS: 'summary_runs',
  TEAMS: 'teams',
  INVITES: 'invites',
  PLANS: 'plans',
};

module.exports = { COLLECTIONS };
