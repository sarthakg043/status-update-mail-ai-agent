const { Octokit } = require('@octokit/rest');

class GitHubService {
  constructor(token, username) {
    this.octokit = new Octokit({
      auth: token
    });
    this.username = username;
  }

  /**
   * Fetch pull requests created by the user within a date range
   * @param {Date} startDate - Start date for PR search
   * @param {Date} endDate - End date for PR search
   * @returns {Promise<Array>} Array of PR objects
   */
  async fetchPullRequests(startDate, endDate) {
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Search for PRs created by the user in the date range
      const query = `author:${this.username} is:pr created:${startDateStr}..${endDateStr}`;
      
      const response = await this.octokit.search.issuesAndPullRequests({
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
    } catch (error) {
      console.error('Error fetching pull requests:', error.message);
      throw error;
    }
  }
}

module.exports = GitHubService;
