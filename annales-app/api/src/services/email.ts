import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vérifiez votre adresse email</title>
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
            background: #2563eb;
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
          .button:hover {
            background: #1d4ed8;
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
          .info-box {
            background: #dbeafe;
            border-left: 4px solid #2563eb;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1.5rem 0;
          }
          .info-box p {
            margin: 0;
            font-size: 0.875rem;
            color: #1e40af;
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
            <h1>Vérifiez votre adresse email</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Merci de vous être inscrit sur notre plateforme d'annales d'examens. Pour activer votre compte et commencer à utiliser la plateforme, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
            <div class="button-container">
              <a href="${verificationUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 0.875rem 2rem; text-decoration: none; border-radius: 0.5rem; font-weight: 600;">Vérifier mon adresse email</a>
            </div>
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <div class="link-box">${verificationUrl}</div>
            <div class="info-box">
              <p><strong>Important :</strong> Ce lien est valide pendant 24 heures.</p>
            </div>
            <p>Si vous n'avez pas créé de compte sur notre plateforme, vous pouvez ignorer cet email en toute sécurité.</p>
          </div>
          <div class="footer">
            <p><strong>Équipe Annales</strong></p>
            <p>Université de Strasbourg</p>
          </div>
        </div>
      </body>
      </html>
    `;

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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe</title>
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
            background: #f59e0b;
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
          .button:hover {
            background: #d97706;
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
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1.5rem 0;
          }
          .warning-box p {
            margin: 0;
            font-size: 0.875rem;
            color: #92400e;
          }
          .security-box {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1.5rem 0;
          }
          .security-box p {
            margin: 0;
            font-size: 0.875rem;
            color: #991b1b;
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
            <h1>Réinitialisation de mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte sur la plateforme d'annales. Pour créer un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>
            <div class="button-container">
              <a href="${resetUrl}" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 0.875rem 2rem; text-decoration: none; border-radius: 0.5rem; font-weight: 600;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <div class="link-box">${resetUrl}</div>
            <div class="warning-box">
              <p><strong>Important :</strong> Ce lien est valide pendant 1 heure uniquement.</p>
            </div>
            <div class="security-box">
              <p><strong>Vous n'avez pas demandé cette réinitialisation ?</strong></p>
              <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et votre mot de passe restera inchangé. Nous vous recommandons de modifier votre mot de passe si vous pensez que quelqu'un tente d'accéder à votre compte.</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>Équipe Annales</strong></p>
            <p>Université de Strasbourg</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
