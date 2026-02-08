import type { User, UserRole } from '../stores/authStore';

/**
 * Frontend permission utilities
 */
export class PermissionUtils {
  /**
   * Checks if the user is an administrator
   */
  static isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }

  /**
   * Checks if the user can delete a resource
   * (owner or admin)
   */
  static canDelete(user: User | null, resourceOwnerId: string): boolean {
    if (!user) return false;
    return this.isAdmin(user) || user.id === resourceOwnerId;
  }

  /**
   * Checks if the user can edit a resource
   * (owner only - admin cannot edit others' comments)
   */
  static canEdit(user: User | null, resourceOwnerId: string): boolean {
    if (!user) return false;
    return user.id === resourceOwnerId;
  }

  /**
   * Returns the user role label
   */
  static getRoleLabel(role: UserRole): string {
    return role === 'admin' ? 'Administrator' : 'User';
  }
}
