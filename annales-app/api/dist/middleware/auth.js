import { AuthUtils } from '../utils/auth.js';
import { UserModel } from '../models/User.js';
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
