const { OpenAI } = require('openai');

class AIService {
  constructor(apiKey, model, maxRetries = 3) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    this.model = model || 'gemini-2.5-flash';
    this.maxRetries = maxRetries;
    this.lastRequestTime = 0; // Track last API call for throttling
    this.minRequestInterval = 2000; // Minimum 2 seconds between requests
  }

  /**
   * Sleep for a specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Throttle API requests to prevent rate limiting
   * Ensures minimum delay between consecutive API calls
   * @returns {Promise<void>}
   */
  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`Throttling request: waiting ${Math.round(waitTime)}ms before next API call`);
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make an API call with retry logic and exponential backoff
   * @param {Function} apiCall - The API call function to execute
   * @param {number} retryCount - Current retry attempt (default: 0)
   * @returns {Promise<any>} API response
   */
  async makeRequestWithRetry(apiCall, retryCount = 0) {
    try {
      return await apiCall();
    } catch (error) {
      // Check if it's a rate limit error (429) or server error (5xx)
      const isRateLimitError = error.status === 429;
      const isServerError = error.status >= 500 && error.status < 600;
      const shouldRetry = (isRateLimitError || isServerError) && retryCount < this.maxRetries;

      if (shouldRetry) {
        // Exponential backoff with jitter: base delay * 15 + random jitter (0-5s)
        const base = Math.pow(2, retryCount) * 15;
        const jitter = Math.random() * 5;
        const delaySeconds = base + jitter;
        console.log(`Rate limit or server error encountered. Retrying in ${delaySeconds.toFixed(1)} seconds... (Attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(delaySeconds * 1000);
        return this.makeRequestWithRetry(apiCall, retryCount + 1);
      }

      // If we've exhausted retries or it's a different error, throw
      if (isRateLimitError) {
        throw new Error('API rate limit exceeded. Please try again later or check your API quota.');
      }
      throw error;
    }
  }

  /**
   * Generate a status update email based on PR data and user instructions
   * @param {Array} pullRequests - Array of PR objects
   * @param {string} userInstructions - User's instructions for email format
   * @returns {Promise<string>} Generated email content
   */
  async generateEmailContent(pullRequests, userInstructions) {
    try {
      if (pullRequests.length === 0) {
        return "No pull requests found for the specified date range.";
      }

      // Format PR data for the AI
      const prSummary = pullRequests.map((pr, index) => {
        let summary = `
PR ${index + 1}:
- Title: ${pr.title}
- Repository: ${pr.repository}
- Status: ${pr.state} ${pr.draft ? '(Draft)' : ''}
- Created: ${new Date(pr.createdAt).toLocaleDateString()}
- URL: ${pr.url}
- Description: ${pr.body.substring(0, 200)}${pr.body.length > 200 ? '...' : ''}
- Labels: ${pr.labels.join(', ') || 'None'}`;

        // Add code changes if available
        if (pr.files && pr.files.length > 0) {
          summary += '\n- Files Changed:';
          pr.files.forEach(file => {
            summary += `\n  * ${file.filename} (${file.status}): +${file.additions} -${file.deletions}`;
            if (file.patch) {
              summary += `\n    Code snippet:\n    ${file.patch.split('\n').map(line => '    ' + line).join('\n')}`;
            }
          });
        }

        return summary.trim();
      }).join('\n\n');

      const prompt = `
You are an AI assistant helping to draft a professional status update email.

User Instructions:
${userInstructions}

Pull Request Information:
${prSummary}

Please draft a well-formatted email body based on the above information and user instructions. 
The email should be professional, concise, and clearly communicate the status of the work.
Include relevant technical details from the code changes when appropriate to provide context.
Do not include subject line or greeting/signature - just the main body content.
Format the email in a clean, readable manner.
      `.trim();

      console.log('Sending prompt to Gemini:');
      console.log('---');
      console.log(prompt);
      console.log('---');

      // Throttle the request to prevent rate limiting
      await this.throttle();

      // Use retry logic for the API call
      const result = await this.makeRequestWithRetry(async () => {
        return await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
        });
      });

      const emailContent = result.choices[0].message.content;

      console.log('Email content generated successfully');
      return emailContent;
    } catch (error) {
      console.error('Error generating email content:', error.message);
      throw error;
    }
  }
}

module.exports = AIService;
