const webhookRoutes = require('./webhooks');
const authRoutes = require('./auth');
const companyMemberRoutes = require('./companyMembers');
const companyRepoRoutes = require('./companyRepos');
const companyMonitoredContributorRoutes = require('./companyMonitoredContributors');
const companyTeamRoutes = require('./companyTeams');
const companySummaryAnalyticsRoutes = require('./companySummaryAnalytics');
const companySubscriptionRoutes = require('./companySubscription');
const contributorRoutes = require('./contributor');
const internalRoutes = require('./internal');

module.exports = {
  webhookRoutes,
  authRoutes,
  companyMemberRoutes,
  companyRepoRoutes,
  companyMonitoredContributorRoutes,
  companyTeamRoutes,
  companySummaryAnalyticsRoutes,
  companySubscriptionRoutes,
  contributorRoutes,
  internalRoutes,
};
