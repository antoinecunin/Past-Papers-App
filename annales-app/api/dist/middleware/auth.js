import { AuthUtils } from '../utils/auth.js';
import { UserModel, UserRole } from '../models/User.js';
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token manquant' });
            return;
        }
        const token = authHeader.substring(7);
        const payload = AuthUtils.verifyToken(token);
        const user = await UserModel.findById(payload.userId).select('-password');
        if (!user) {
            res.status(401).json({ error: 'Utilisateur non trouvé' });
            return;
        }
        if (!user.isVerified) {
            res.status(401).json({ error: 'Email non vérifié' });
            return;
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified,
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Token invalide' });
    }
};
export const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const payload = AuthUtils.verifyToken(token);
        const user = await UserModel.findById(payload.userId).select('-password');
        if (user && user.isVerified) {
            req.user = {
                id: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isVerified: user.isVerified,
            };
        }
        next();
    }
    catch (error) {
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
    static isAdmin(user) {
        return user?.role === UserRole.ADMIN;
    }
    /**
     * Vérifie si l'utilisateur peut supprimer une ressource
     * (propriétaire ou admin)
     */
    static canDelete(user, resourceOwnerId) {
        if (!user)
            return false;
        return this.isAdmin(user) || user.id === resourceOwnerId;
    }
    /**
     * Vérifie si l'utilisateur peut modifier une ressource
     * (propriétaire uniquement - admin ne peut pas modifier les commentaires d'autrui)
     */
    static canEdit(user, resourceOwnerId) {
        if (!user)
            return false;
        return user.id === resourceOwnerId;
    }
}
/**
 * Middleware pour vérifier que l'utilisateur est administrateur
 */
export const requireAdmin = (req, res, next) => {
    if (!AuthorizationUtils.isAdmin(req.user)) {
        res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        return;
    }
    next();
};
