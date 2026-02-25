const { loadConfig, parseDateRange } = require('./config');
const GitHubService = require('./githubService');
const AIService = require('./aiService');
const EmailService = require('./emailService');

/**
 * Main application entry point
 */
async function main() {
  console.log('=== Status Update Mail AI Agent ===\n');

  try {
    // Load configuration
    console.log('Loading configuration...');
    const config = loadConfig();
    console.log('Configuration loaded successfully\n');

    // Parse date range
    const { startDate, endDate } = parseDateRange(config.dateRange);
    console.log(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

    // Initialize services
    console.log('Initializing services...');
    const githubService = new GitHubService(config.github.token, config.github.username, config.github.repos, config.maxCharsPerFile);
    const aiService = new AIService(config.ai.apiKey, config.ai.model);
    const emailService = new EmailService(config.email);
    console.log('Services initialized\n');

    // Fetch pull requests
    console.log('Fetching pull requests from GitHub...');
    const pullRequests = await githubService.fetchPullRequests(startDate, endDate, config.includeCode);
    console.log(`Retrieved ${pullRequests.length} pull request(s)\n`);

    if (pullRequests.length === 0) {
      console.log('No pull requests found for the specified date range.');
      console.log('Exiting without sending email.');
      return;
    }

    // Display PR summary
    console.log('Pull Requests Summary:');
    pullRequests.forEach((pr, index) => {
      console.log(`  ${index + 1}. ${pr.title} (${pr.state}) - ${pr.repository}`);
    });
    console.log();

    // Generate email content using AI
    console.log('Generating email content with AI...');
    const emailContent = await aiService.generateEmailContent(
      pullRequests,
      config.userInstructions
    );
    console.log('Email content generated\n');

    console.log('--- Generated Email Preview ---');
    console.log(`To: ${config.email.to}`);
    console.log(`Subject: ${config.email.subject}`);
    console.log('---');
    console.log(emailContent);
    console.log('--- End of Preview ---\n');

    // Send email
    console.log('Sending email...');
    await emailService.sendEmail(
      config.email.to,
      config.email.subject,
      emailContent
    );
    console.log('\n✓ Email sent successfully!');
    console.log(`✓ Recipients: ${config.email.to}`);
    console.log(`✓ Subject: ${config.email.subject}`);

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
}

module.exports = main;
