const nodemailer = require('nodemailer');

class EmailService {
  constructor(config) {
    this.config = config;
    this.transporter = null;
  }

  /**
   * Initialize email transporter based on service type
   */
  initializeTransporter() {
    const { service, user, appPassword } = this.config;

    // Configuration for different email services
    const serviceConfig = {
      gmail: {
        service: 'gmail',
        auth: {
          user: user,
          pass: appPassword
        }
      },
      zoho: {
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
          user: user,
          pass: appPassword
        }
      }
    };

    const config = serviceConfig[service.toLowerCase()];
    if (!config) {
      throw new Error(`Unsupported email service: ${service}. Supported services: gmail, zoho`);
    }

    this.transporter = nodemailer.createTransport(config);
    console.log(`Email transporter initialized for ${service}`);
  }

  /**
   * Send email with the generated content
   * @param {string} to - Recipient email addresses (comma-separated)
   * @param {string} subject - Email subject
   * @param {string} content - Email body content
   * @returns {Promise<object>} Send result
   */
  async sendEmail(to, subject, content) {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
      }

      // Verify transporter configuration
      await this.transporter.verify();
      console.log('Email server connection verified');

      const mailOptions = {
        from: this.config.user,
        to: to,
        subject: subject,
        text: content,
        html: this.formatAsHTML(content)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw error;
    }
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
  }

  /**
   * Convert plain text to basic HTML format
   * @param {string} text - Plain text content
   * @returns {string} HTML formatted content
   */
  formatAsHTML(text) {
    const lines = text.split('\n');
    const htmlLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        htmlLines.push('<br>');
        continue;
      }

      const isListItem = trimmedLine.startsWith('-') || trimmedLine.startsWith('*');

      if (isListItem) {
        if (!inList) {
          htmlLines.push('<ul>');
          inList = true;
        }
        const content = this.escapeHtml(line.replace(/^[\s-*]+/, ''));
        htmlLines.push(`<li>${content}</li>`);
      } else {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }

        if (trimmedLine.startsWith('##')) {
          const content = this.escapeHtml(line.replace(/^##\s*/, ''));
          htmlLines.push(`<h2>${content}</h2>`);
        } else if (trimmedLine.startsWith('#')) {
          const content = this.escapeHtml(line.replace(/^#\s*/, ''));
          htmlLines.push(`<h1>${content}</h1>`);
        } else {
          const content = this.escapeHtml(line);
          htmlLines.push(`<p>${content}</p>`);
        }
      }
    }

    // Close any open list
    if (inList) {
      htmlLines.push('</ul>');
    }

    const htmlContent = htmlLines.join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    h1, h2 { color: #2c3e50; }
    p { margin: 10px 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `.trim();
  }
}

module.exports = EmailService;
