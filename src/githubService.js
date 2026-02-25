const { Octokit } = require('@octokit/rest');

class GitHubService {
  constructor(token, username, repos = [], maxCharsPerFile = 500) {
    this.octokit = new Octokit({
      auth: token
    });
    this.username = username;
    this.repos = repos;
    this.maxCharsPerFile = maxCharsPerFile;
  }

  /**
   * Fetch files changed in a PR with code snippets
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @returns {Promise<Array>} Array of file change objects
   */
  async fetchPRFiles(owner, repo, prNumber) {
    try {
      const response = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 10 // Limit to first 10 files to avoid overwhelming the AI
      });

      return response.data.map(file => {
        let codeSnippet = '';
        if (file.patch) {
          // Truncate patch to configured maxCharsPerFile
          codeSnippet = file.patch.length > this.maxCharsPerFile 
            ? file.patch.substring(0, this.maxCharsPerFile) + '...'
            : file.patch;
        }

        return {
          filename: file.filename,
          status: file.status, // 'added', 'modified', 'removed', etc.
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: codeSnippet
        };
      });
    } catch (error) {
      console.warn(`Could not fetch files for PR #${prNumber}: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch pull requests created by the user within a date range.
   * Uses per-repo pulls.list() when repos are specified (works with private repos),
   * otherwise falls back to the search API.
   * @param {Date} startDate - Start date for PR search
   * @param {Date} endDate - End date for PR search
   * @param {boolean} includeCode - Whether to fetch code changes (default: true)
   * @returns {Promise<Array>} Array of PR objects
   */
  async fetchPullRequests(startDate, endDate, includeCode = true) {
    try {
      let pullRequests;
      if (this.repos.length > 0) {
        pullRequests = await this.fetchFromRepos(startDate, endDate);
      } else {
        pullRequests = await this.fetchFromSearch(startDate, endDate);
      }

      // Fetch code changes for each PR if requested
      if (includeCode) {
        console.log(`Fetching code changes for PRs (max ${this.maxCharsPerFile} chars per file)...`);
        for (const pr of pullRequests) {
          const [owner, repo] = pr.repository.split('/');
          const prNumber = pr.url.split('/').pop();
          pr.files = await this.fetchPRFiles(owner, repo, parseInt(prNumber));
        }
      }

      return pullRequests;
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
              draft: pr.draft || false,
              number: pr.number
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
      draft: pr.draft || false,
      number: pr.number
    }));

    console.log(`Found ${pullRequests.length} pull request(s)`);
    return pullRequests;
  }
}

module.exports = GitHubService;
