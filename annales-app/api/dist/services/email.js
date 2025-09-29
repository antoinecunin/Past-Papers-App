import nodemailer from 'nodemailer';
class EmailService {
    transporter;
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
    async sendEmail(options) {
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
        }
        catch (error) {
            console.error('Failed to send email:', error);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }
    async sendVerificationEmail(email, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Vérifiez votre adresse email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bienvenue sur Annales - Unistra</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Merci de vous être inscrit sur notre plateforme d'annales d'examens. Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Vérifier mon adresse email</a>
            </p>
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background-color: #eee; padding: 10px;">${verificationUrl}</p>
            <p>Ce lien est valide pendant 24 heures.</p>
            <p>Si vous n'avez pas créé ce compte, ignorez cet email.</p>
            <div class="footer">
              <p>Équipe Annales - Unistra<br>
              Université de Strasbourg</p>
            </div>
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
    async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Réinitialisation de mot de passe</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur Annales - Unistra.</p>
            <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </p>
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background-color: #eee; padding: 10px;">${resetUrl}</p>
            <p>Ce lien est valide pendant 1 heure.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            <div class="footer">
              <p>Équipe Annales - Unistra<br>
              Université de Strasbourg</p>
            </div>
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
