// Mock complet du service email pour les tests
class MockEmailService {
  async sendEmail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    // Mock - ne fait rien, simule un envoi réussi
    console.log(`[MOCK] Email sent to ${options.to}`);
    return Promise.resolve();
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    // Mock - ne fait rien
    console.log(`[MOCK] Verification email sent to ${email}`);
    return Promise.resolve();
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    // Mock - ne fait rien
    console.log(`[MOCK] Password reset email sent to ${email}`);
    return Promise.resolve();
  }
}

export const emailService = new MockEmailService();