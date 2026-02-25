const { OpenAI } = require('openai');

class AIService {
  constructor(apiKey, model) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    this.model = model || 'gemini-2.0-flash';
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
        return `
PR ${index + 1}:
- Title: ${pr.title}
- Repository: ${pr.repository}
- Status: ${pr.state} ${pr.draft ? '(Draft)' : ''}
- Created: ${new Date(pr.createdAt).toLocaleDateString()}
- URL: ${pr.url}
- Description: ${pr.body.substring(0, 200)}${pr.body.length > 200 ? '...' : ''}
- Labels: ${pr.labels.join(', ') || 'None'}
        `.trim();
      }).join('\n\n');

      const prompt = `
You are an AI assistant helping to draft a professional status update email.

User Instructions:
${userInstructions}

Pull Request Information:
${prSummary}

Please draft a well-formatted email body based on the above information and user instructions. 
The email should be professional, concise, and clearly communicate the status of the work.
Do not include subject line or greeting/signature - just the main body content.
Format the email in a clean, readable manner.
      `.trim();

      const result = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
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
