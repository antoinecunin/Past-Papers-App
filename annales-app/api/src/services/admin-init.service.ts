import { UserModel, UserRole } from '../models/User.js';
import { AuthUtils } from '../utils/auth.js';

/**
 * Service pour initialiser automatiquement le premier utilisateur admin
 * au démarrage de l'API si aucun admin n'existe dans la base.
 */
export class AdminInitService {
  /**
   * Vérifie si au moins un admin existe dans la base de données.
   */
  private static async hasAnyAdmin(): Promise<boolean> {
    const adminCount = await UserModel.countDocuments({ role: UserRole.ADMIN });
    return adminCount > 0;
  }

  /**
   * Crée le premier utilisateur admin à partir des variables d'environnement.
   * Cette méthode est appelée automatiquement au démarrage de l'API.
   *
   * Conditions pour créer l'admin :
   * - Aucun admin n'existe dans la base
   * - Les variables d'environnement INITIAL_ADMIN_* sont toutes définies
   *
   * L'admin créé est automatiquement vérifié (isVerified: true).
   */
  static async initializeFirstAdmin(): Promise<void> {
    try {
      // Vérifier si un admin existe déjà
      const hasAdmin = await this.hasAnyAdmin();
      if (hasAdmin) {
        console.log('[admin-init] Admin already exists, skipping initialization');
        return;
      }

      // Récupérer les variables d'environnement
      const email = process.env.INITIAL_ADMIN_EMAIL;
      const password = process.env.INITIAL_ADMIN_PASSWORD;
      const firstName = process.env.INITIAL_ADMIN_FIRSTNAME;
      const lastName = process.env.INITIAL_ADMIN_LASTNAME;

      // Vérifier que toutes les variables sont définies
      if (!email || !password || !firstName || !lastName) {
        console.log(
          '[admin-init] INITIAL_ADMIN_* variables not set, skipping admin initialization'
        );
        return;
      }

      // Valider l'email
      if (!AuthUtils.isValidEmail(email)) {
        console.error(`[admin-init] Invalid email or unauthorized domain: ${email}`);
        return;
      }

      // Valider le mot de passe
      if (!AuthUtils.isValidPassword(password)) {
        console.error(
          '[admin-init] Invalid password (minimum 8 characters, with at least one letter and one number)'
        );
        return;
      }

      // Vérifier si l'utilisateur existe déjà (par email)
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        console.log(
          `[admin-init] User with email ${email} already exists, skipping initialization`
        );
        return;
      }

      // Hasher le mot de passe
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Créer l'utilisateur admin
      const admin = await UserModel.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.ADMIN,
        isVerified: true, // Admin créé automatiquement est déjà vérifié
      });

      console.log(`[admin-init] First admin user created successfully: ${admin.email}`);
      console.log(
        '[admin-init] For better security, you can now remove the INITIAL_ADMIN_* variables from your .env'
      );
    } catch (error) {
      console.error('[admin-init] Error creating first admin:', error);
      // Ne pas throw l'erreur pour ne pas empêcher le démarrage de l'API
      // Si l'admin n'est pas créé, l'utilisateur devra le faire manuellement
    }
  }
}
