import { Request, Response, NextFunction } from 'express';
import { AuthUtils, JwtPayload } from '../utils/auth.js';
import { UserModel, UserRole } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isVerified: boolean;
    canComment: boolean;
    canUpload: boolean;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const token = authHeader.substring(7);
    const payload: JwtPayload = AuthUtils.verifyToken(token);

    const user = await UserModel.findById(payload.userId).select('-password');
    if (!user) {
      res.status(401).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    if (!user.isVerified) {
      res.status(401).json({ error: 'Email non vérifié' });
      return;
    }

    // Vérifier que le token n'a pas été révoqué (version mismatch)
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== (user.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      canComment: user.canComment ?? true,
      canUpload: user.canUpload ?? true,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload: JwtPayload = AuthUtils.verifyToken(token);

    const user = await UserModel.findById(payload.userId).select('-password');
    if (user && user.isVerified) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        canComment: user.canComment ?? true,
        canUpload: user.canUpload ?? true,
      };
    }

    next();
  } catch (error) {
    // Ignore les erreurs d'authentification en mode optionnel
    next();
  }
};

/**
 * Utilitaires d'autorisation pour vérifier les permissions
 */
export class AuthorizationUtils {
  /**
   * Vérifie si l'utilisateur est administrateur
   */
  static isAdmin(user: AuthenticatedRequest['user']): boolean {
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Vérifie si l'utilisateur peut supprimer une ressource
   * (propriétaire ou admin)
   */
  static canDelete(user: AuthenticatedRequest['user'], resourceOwnerId: string): boolean {
    if (!user) return false;
    return this.isAdmin(user) || user.id === resourceOwnerId;
  }

  /**
   * Vérifie si l'utilisateur peut modifier une ressource
   * (propriétaire uniquement - admin ne peut pas modifier les commentaires d'autrui)
   */
  static canEdit(user: AuthenticatedRequest['user'], resourceOwnerId: string): boolean {
    if (!user) return false;
    return user.id === resourceOwnerId;
  }
}

/**
 * Middleware pour vérifier que l'utilisateur est administrateur
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!AuthorizationUtils.isAdmin(req.user)) {
    res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    return;
  }
  next();
};
