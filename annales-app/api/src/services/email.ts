import nodemailer from 'nodemailer';
import { instanceConfigService } from '../services/instance-config.service.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailAlert {
  color: string;
  bgColor: string;
  content: string;
}

interface EmailTemplateOptions {
  title: string;
  headerColor: string;
  greeting: string;
  bodyText: string;
  buttonText: string;
  buttonUrl: string;
  alerts: EmailAlert[];
  closingText?: string;
}

function buildEmailHtml(options: EmailTemplateOptions): string {
  const { title, headerColor, greeting, bodyText, buttonText, buttonUrl, alerts, closingText } =
    options;

  const config = instanceConfigService.getConfig();
  const teamName = config.instance.name;
  const orgName = config.instance.organizationName;

  const alertsHtml = alerts
    .map(
      alert => `
    <div style="background: ${alert.bgColor}; border-left: 4px solid ${alert.color}; padding: 1rem; border-radius: 0.5rem; margin: 1.5rem 0;">
      <p style="margin: 0; font-size: 0.875rem; color: ${alert.color};">${alert.content}</p>
    </div>
  `
    )
    .join('');

  const closingHtml = closingText ? `<p>${closingText}</p>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background: #f8fafc;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: ${headerColor};
      color: white;
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
      color: white;
    }
    .content {
      padding: 2.5rem 2rem;
    }
    .content p {
      margin-bottom: 1rem;
      color: #64748b;
    }
    .content p:first-child {
      font-weight: 600;
      color: #334155;
    }
    .button-container {
      text-align: center;
      margin: 2rem 0;
    }
    .link-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      word-break: break-all;
      font-size: 0.875rem;
      color: #64748b;
      margin: 1rem 0;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 1.5rem 2rem;
      text-align: center;
    }
    .footer p {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0.25rem 0;
    }
    .footer strong {
      color: #334155;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 1rem 0.5rem; }
      .header { padding: 2rem 1.5rem; }
      .content { padding: 2rem 1.5rem; }
      .header h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>${bodyText}</p>
      <div class="button-container">
        <a href="${buttonUrl}" style="display: inline-block; background: ${headerColor}; color: #ffffff; padding: 0.875rem 2rem; text-decoration: none; border-radius: 0.5rem; font-weight: 600;">${buttonText}</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="link-box">${buttonUrl}</div>
      ${alertsHtml}
      ${closingHtml}
    </div>
    <div class="footer">
      <p><strong>The ${teamName} team</strong></p>
      <p>${orgName}</p>
    </div>
  </div>
</body>
</html>`;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP_USER and SMTP_PASS variables are required');
    }
    if (!process.env.EMAIL_FROM_ADDRESS) {
      throw new Error('EMAIL_FROM_ADDRESS variable is required');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const config = instanceConfigService.getConfig();
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || config.instance.name,
        address: process.env.EMAIL_FROM_ADDRESS || 'no-reply@localhost',
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const config = instanceConfigService.getConfig();
    const instanceName = config.instance.name;

    const html = buildEmailHtml({
      title: 'Verify your email address',
      headerColor: '#2563eb',
      greeting: 'Hello,',
      bodyText:
        'Thank you for signing up on our exam archive platform. To activate your account and start using the platform, please verify your email address by clicking the button below:',
      buttonText: 'Verify my email address',
      buttonUrl: verificationUrl,
      alerts: [
        {
          color: '#1e40af',
          bgColor: '#dbeafe',
          content: '<strong>Important:</strong> This link is valid for 24 hours.',
        },
      ],
      closingText:
        "If you didn't create an account on our platform, you can safely ignore this email.",
    });

    const text = `
      Welcome to ${instanceName}

      Thank you for signing up on our exam archive platform.
      To activate your account, please click the following link:

      ${verificationUrl}

      This link is valid for 24 hours.
      If you didn't create this account, please ignore this email.

      The ${instanceName} team
      ${config.instance.organizationName}
    `;

    await this.sendEmail({
      to: email,
      subject: `Verify your email address - ${instanceName}`,
      html,
      text,
    });
  }

  async sendAccountExistsNotification(email: string): Promise<void> {
    const config = instanceConfigService.getConfig();
    const instanceName = config.instance.name;
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const resetUrl = `${process.env.FRONTEND_URL}/forgot-password`;

    const html = buildEmailHtml({
      title: 'Registration attempt',
      headerColor: '#f59e0b',
      greeting: 'Hello,',
      bodyText:
        'Someone tried to create an account with your email address on our exam archive platform. Since you already have an account, no new account was created.',
      buttonText: 'Sign in',
      buttonUrl: loginUrl,
      alerts: [
        {
          color: '#92400e',
          bgColor: '#fef3c7',
          content: `If you forgot your password, you can <a href="${resetUrl}" style="color: #92400e;">reset it here</a>.`,
        },
        {
          color: '#1e40af',
          bgColor: '#dbeafe',
          content:
            "If you didn't attempt this registration, you can safely ignore this email. Your account is secure.",
        },
      ],
    });

    const text = `
      ${instanceName} - Registration attempt

      Someone tried to create an account with your email address.
      Since you already have an account, no new account was created.

      Sign in: ${loginUrl}
      Forgot your password? ${resetUrl}

      If you didn't attempt this registration, you can safely ignore this email.

      The ${instanceName} team
    `;

    await this.sendEmail({
      to: email,
      subject: `Registration attempt - ${instanceName}`,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const config = instanceConfigService.getConfig();
    const instanceName = config.instance.name;

    const html = buildEmailHtml({
      title: 'Password reset',
      headerColor: '#f59e0b',
      greeting: 'Hello,',
      bodyText:
        'We received a password reset request for your account on the exam archive platform. To create a new password, click the button below:',
      buttonText: 'Reset my password',
      buttonUrl: resetUrl,
      alerts: [
        {
          color: '#92400e',
          bgColor: '#fef3c7',
          content: '<strong>Important:</strong> This link is valid for 1 hour only.',
        },
        {
          color: '#991b1b',
          bgColor: '#fee2e2',
          content:
            "<strong>Didn't request this reset?</strong><br>If you didn't initiate this request, please ignore this email and your password will remain unchanged. We recommend changing your password if you believe someone is trying to access your account.",
        },
      ],
    });

    const text = `
      Password reset - ${instanceName}

      You requested a password reset.
      Click the following link to create a new password:

      ${resetUrl}

      This link is valid for 1 hour.
      If you didn't request this reset, please ignore this email.

      The ${instanceName} team
      ${config.instance.organizationName}
    `;

    await this.sendEmail({
      to: email,
      subject: `Password reset - ${instanceName}`,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
