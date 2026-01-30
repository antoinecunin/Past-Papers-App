import nodemailer from 'nodemailer';

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
      <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
      <div class="link-box">${buttonUrl}</div>
      ${alertsHtml}
      ${closingHtml}
    </div>
    <div class="footer">
      <p><strong>Équipe Annales</strong></p>
      <p>Université de Strasbourg</p>
    </div>
  </div>
</body>
</html>`;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Validation des variables d'environnement requises
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Variables SMTP_USER et SMTP_PASS requises');
    }
    if (!process.env.EMAIL_FROM_ADDRESS) {
      throw new Error('Variable EMAIL_FROM_ADDRESS requise');
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
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Annales - Unistra',
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
      throw new Error("Erreur lors de l'envoi de l'email");
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = buildEmailHtml({
      title: 'Vérifiez votre adresse email',
      headerColor: '#2563eb',
      greeting: 'Bonjour,',
      bodyText:
        "Merci de vous être inscrit sur notre plateforme d'annales d'examens. Pour activer votre compte et commencer à utiliser la plateforme, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :",
      buttonText: 'Vérifier mon adresse email',
      buttonUrl: verificationUrl,
      alerts: [
        {
          color: '#1e40af',
          bgColor: '#dbeafe',
          content: '<strong>Important :</strong> Ce lien est valide pendant 24 heures.',
        },
      ],
      closingText:
        "Si vous n'avez pas créé de compte sur notre plateforme, vous pouvez ignorer cet email en toute sécurité.",
    });

    const text = `
      Bienvenue sur Annales - Unistra

      Merci de vous être inscrit sur notre plateforme d'annales d'examens.
      Pour activer votre compte, veuillez cliquer sur le lien suivant :

      ${verificationUrl}

      Ce lien est valide pendant 24 heures.
      Si vous n'avez pas créé ce compte, ignorez cet email.

      Équipe Annales - Unistra
      Université de Strasbourg
    `;

    await this.sendEmail({
      to: email,
      subject: 'Vérifiez votre adresse email - Annales Unistra',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = buildEmailHtml({
      title: 'Réinitialisation de mot de passe',
      headerColor: '#f59e0b',
      greeting: 'Bonjour,',
      bodyText:
        "Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte sur la plateforme d'annales. Pour créer un nouveau mot de passe, cliquez sur le bouton ci-dessous :",
      buttonText: 'Réinitialiser mon mot de passe',
      buttonUrl: resetUrl,
      alerts: [
        {
          color: '#92400e',
          bgColor: '#fef3c7',
          content: '<strong>Important :</strong> Ce lien est valide pendant 1 heure uniquement.',
        },
        {
          color: '#991b1b',
          bgColor: '#fee2e2',
          content:
            "<strong>Vous n'avez pas demandé cette réinitialisation ?</strong><br>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et votre mot de passe restera inchangé. Nous vous recommandons de modifier votre mot de passe si vous pensez que quelqu'un tente d'accéder à votre compte.",
        },
      ],
    });

    const text = `
      Réinitialisation de mot de passe - Annales Unistra

      Vous avez demandé la réinitialisation de votre mot de passe.
      Cliquez sur le lien suivant pour créer un nouveau mot de passe :

      ${resetUrl}

      Ce lien est valide pendant 1 heure.
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

      Équipe Annales - Unistra
      Université de Strasbourg
    `;

    await this.sendEmail({
      to: email,
      subject: 'Réinitialisation de mot de passe - Annales Unistra',
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
