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
   * Convert plain text to basic HTML format
   * @param {string} text - Plain text content
   * @returns {string} HTML formatted content
   */
  formatAsHTML(text) {
    // Basic HTML formatting: convert line breaks to <br> and preserve structure
    const htmlContent = text
      .split('\n')
      .map(line => {
        if (line.trim() === '') return '<br>';
        if (line.startsWith('##')) {
          return `<h2>${line.replace(/^##\s*/, '')}</h2>`;
        }
        if (line.startsWith('#')) {
          return `<h1>${line.replace(/^#\s*/, '')}</h1>`;
        }
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          return `<li>${line.replace(/^[\s-*]+/, '')}</li>`;
        }
        return `<p>${line}</p>`;
      })
      .join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    h1, h2 { color: #2c3e50; }
    p { margin: 10px 0; }
    li { margin-left: 20px; }
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
