const { Octokit } = require('@octokit/rest');

class GitHubService {
  constructor(token, username, repos = []) {
    this.octokit = new Octokit({
      auth: token
    });
    this.username = username;
    this.repos = repos;
  }

  /**
   * Fetch pull requests created by the user within a date range.
   * Uses per-repo pulls.list() when repos are specified (works with private repos),
   * otherwise falls back to the search API.
   * @param {Date} startDate - Start date for PR search
   * @param {Date} endDate - End date for PR search
   * @returns {Promise<Array>} Array of PR objects
   */
  async fetchPullRequests(startDate, endDate) {
    try {
      if (this.repos.length > 0) {
        return await this.fetchFromRepos(startDate, endDate);
      }
      return await this.fetchFromSearch(startDate, endDate);
    } catch (error) {
      console.error('Error fetching pull requests:', error.message);
      throw error;
    }
  }

  /**
   * Fetch PRs from specific repositories using the pulls.list() API.
   * This works reliably with private repos the token has access to.
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of PR objects
   */
  async fetchFromRepos(startDate, endDate) {
    const allPullRequests = [];

    for (const repoFullName of this.repos) {
      const [owner, repo] = repoFullName.split('/');
      if (!owner || !repo) {
        console.warn(`Skipping invalid repo format: "${repoFullName}" (expected "owner/repo")`);
        continue;
      }

      console.log(`  Checking ${repoFullName}...`);

      try {
        // Fetch both open and closed PRs to cover all states
        for (const state of ['open', 'closed']) {
          const response = await this.octokit.rest.pulls.list({
            owner,
            repo,
            state,
            sort: 'created',
            direction: 'desc',
            per_page: 100
          });

          const filtered = response.data.filter(pr => {
            const isAuthor = pr.user.login.toLowerCase() === this.username.toLowerCase();
            const createdAt = new Date(pr.created_at);
            return isAuthor && createdAt >= startDate && createdAt <= endDate;
          });

          for (const pr of filtered) {
            allPullRequests.push({
              title: pr.title,
              url: pr.html_url,
              state: pr.state,
              repository: `${owner}/${repo}`,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              body: pr.body || 'No description provided',
              labels: pr.labels.map(label => label.name),
              draft: pr.draft || false
            });
          }
        }
      } catch (error) {
        console.warn(`  Warning: Could not fetch PRs from ${repoFullName}: ${error.message}. Skipping...`);
      }
    }

    // Sort by created date descending
    allPullRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`Found ${allPullRequests.length} pull request(s)`);
    return allPullRequests;
  }

  /**
   * Fetch PRs using the GitHub search API (works for public repos and repos owned by the user).
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of PR objects
   */
  async fetchFromSearch(startDate, endDate) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Search for PRs created by the user in the date range
    const query = `author:${this.username} is:pr created:${startDateStr}..${endDateStr}`;
    
    const response = await this.octokit.rest.search.issuesAndPullRequests({
      q: query,
      sort: 'created',
      order: 'desc',
      per_page: 100
    });

    // Extract relevant PR information
    const pullRequests = response.data.items.map(pr => ({
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      repository: pr.repository_url.split('/').slice(-2).join('/'),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      body: pr.body || 'No description provided',
      labels: pr.labels.map(label => label.name),
      draft: pr.draft || false
    }));

    console.log(`Found ${pullRequests.length} pull request(s)`);
    return pullRequests;
  }
}

module.exports = GitHubService;
