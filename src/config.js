require('dotenv').config();

/**
 * Load and validate configuration from environment variables
 */
function loadConfig() {
  const config = {
    github: {
      token: process.env.GITHUB_TOKEN,
      username: process.env.GITHUB_USERNAME,
      repos: process.env.GITHUB_REPOS
        ? process.env.GITHUB_REPOS.split(',').map(r => r.trim()).filter(Boolean)
        : []
    },
    ai: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    },
    email: {
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER,
      appPassword: process.env.EMAIL_APP_PASSWORD,
      to: process.env.EMAIL_TO,
      subject: process.env.EMAIL_SUBJECT || 'Status Update'
    },
    dateRange: {
      startDate: process.env.START_DATE,
      endDate: process.env.END_DATE
    },
    userInstructions: process.env.USER_INSTRUCTIONS || 
      'Please draft a professional status update email summarizing my pull requests.'
  };

  // Validate required fields
  const requiredFields = [
    { key: 'github.token', value: config.github.token, name: 'GITHUB_TOKEN' },
    { key: 'github.username', value: config.github.username, name: 'GITHUB_USERNAME' },
    { key: 'ai.apiKey', value: config.ai.apiKey, name: 'GEMINI_API_KEY' },
    { key: 'email.user', value: config.email.user, name: 'EMAIL_USER' },
    { key: 'email.appPassword', value: config.email.appPassword, name: 'EMAIL_APP_PASSWORD' },
    { key: 'email.to', value: config.email.to, name: 'EMAIL_TO' }
  ];

  const missingFields = requiredFields.filter(field => !field.value);
  
  if (missingFields.length > 0) {
    const fieldNames = missingFields.map(f => f.name).join(', ');
    throw new Error(`Missing required environment variables: ${fieldNames}`);
  }

  return config;
}

/**
 * Parse date range from config or use default (today)
 */
function parseDateRange(dateRangeConfig) {
  const { startDate, endDate } = dateRangeConfig;
  
  let start, end;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else if (startDate && !endDate) {
    start = new Date(startDate);
    end = new Date(startDate);
  } else {
    // Default to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start = today;
    end = new Date(today);
    end.setHours(23, 59, 59, 999);
  }

  return { startDate: start, endDate: end };
}

module.exports = { loadConfig, parseDateRange };
