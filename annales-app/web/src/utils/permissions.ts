import type { User, UserRole } from '../stores/authStore';

/**
 * Utilitaires de permissions côté frontend
 */
export class PermissionUtils {
  /**
   * Vérifie si l'utilisateur est administrateur
   */
  static isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }

  /**
   * Vérifie si l'utilisateur peut supprimer une ressource
   * (propriétaire ou admin)
   */
  static canDelete(user: User | null, resourceOwnerId: string): boolean {
    if (!user) return false;
    return this.isAdmin(user) || user.id === resourceOwnerId;
  }

  /**
   * Vérifie si l'utilisateur peut modifier une ressource
   * (propriétaire uniquement - admin ne peut pas modifier les commentaires d'autrui)
   */
  static canEdit(user: User | null, resourceOwnerId: string): boolean {
    if (!user) return false;
    return user.id === resourceOwnerId;
  }

  /**
   * Retourne le libellé du rôle utilisateur
   */
  static getRoleLabel(role: UserRole): string {
    return role === 'admin' ? 'Administrateur' : 'Utilisateur';
  }
}