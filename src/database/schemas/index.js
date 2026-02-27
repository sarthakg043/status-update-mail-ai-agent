/**
 * Schemas Index - Exports all collection validators and index definitions.
 */

const { companiesValidator, companiesIndexes } = require('./companies');
const { companyMembersValidator, companyMembersIndexes } = require('./companyMembers');
const { repositoriesValidator, repositoriesIndexes } = require('./repositories');
const { contributorsValidator, contributorsIndexes } = require('./contributors');
const { contributorAccountsValidator, contributorAccountsIndexes } = require('./contributorAccounts');
const { monitoredContributorsValidator, monitoredContributorsIndexes } = require('./monitoredContributors');
const { summaryRunsValidator, summaryRunsIndexes } = require('./summaryRuns');
const { teamsValidator, teamsIndexes } = require('./teams');
const { invitesValidator, invitesIndexes } = require('./invites');
const { plansValidator, plansIndexes } = require('./plans');

module.exports = {
  companiesValidator,
  companiesIndexes,
  companyMembersValidator,
  companyMembersIndexes,
  repositoriesValidator,
  repositoriesIndexes,
  contributorsValidator,
  contributorsIndexes,
  contributorAccountsValidator,
  contributorAccountsIndexes,
  monitoredContributorsValidator,
  monitoredContributorsIndexes,
  summaryRunsValidator,
  summaryRunsIndexes,
  teamsValidator,
  teamsIndexes,
  invitesValidator,
  invitesIndexes,
  plansValidator,
  plansIndexes,
};
