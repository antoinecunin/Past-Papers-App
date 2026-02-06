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
        console.log('[admin-init] Admin déjà existant, initialisation ignorée');
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
          '[admin-init] Variables INITIAL_ADMIN_* non définies, initialisation admin ignorée'
        );
        return;
      }

      // Valider l'email
      if (!AuthUtils.isValidEmail(email)) {
        console.error(
          `[admin-init] Email invalide ou domaine non autorisé: ${email}`
        );
        return;
      }

      // Valider le mot de passe
      if (!AuthUtils.isValidPassword(password)) {
        console.error(
          '[admin-init] Mot de passe invalide (minimum 8 caractères, avec au moins une lettre et un chiffre)'
        );
        return;
      }

      // Vérifier si l'utilisateur existe déjà (par email)
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        console.log(
          `[admin-init] Utilisateur avec email ${email} existe déjà, initialisation ignorée`
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

      console.log(
        `[admin-init] Premier utilisateur admin créé avec succès: ${admin.email}`
      );
      console.log(
        '[admin-init] Pour plus de sécurité, vous pouvez maintenant supprimer les variables INITIAL_ADMIN_* de votre .env'
      );
    } catch (error) {
      console.error('[admin-init] Erreur lors de la création du premier admin:', error);
      // Ne pas throw l'erreur pour ne pas empêcher le démarrage de l'API
      // Si l'admin n'est pas créé, l'utilisateur devra le faire manuellement
    }
  }
}
