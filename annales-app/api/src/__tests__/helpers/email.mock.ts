/**
 * Mock email service pour les tests
 * Capture les emails envoyés au lieu de les envoyer réellement
 */
export class MockEmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
  }> = [];

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    this.sentEmails.push({
      to,
      subject: 'Vérification de votre compte',
      html: `Token: ${token}`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.sentEmails.push({
      to,
      subject: 'Réinitialisation de mot de passe',
      html: `Token: ${token}`,
    });
  }

  getSentEmails() {
    return this.sentEmails;
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear() {
    this.sentEmails = [];
  }
}

export const mockEmail = new MockEmailService();