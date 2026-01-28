import { UserModel } from '../models/User.js';
import { AuthUtils } from '../utils/auth.js';
import { emailService } from './email.js';
import { ServiceError } from './ServiceError.js';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
  };
}

class AuthService {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(data: RegisterData): Promise<{ userId: string }> {
    const { email, password, firstName, lastName } = data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw ServiceError.conflict('Cet email est déjà utilisé');
    }

    // Hacher le mot de passe
    const hashedPassword = await AuthUtils.hashPassword(password);

    // Générer un token de vérification
    const verificationToken = AuthUtils.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Créer l'utilisateur
    const user = new UserModel({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      verificationToken,
      verificationExpires,
    });

    await user.save();

    // Envoyer l'email de vérification
    await emailService.sendVerificationEmail(email, verificationToken);

    return { userId: user._id.toString() };
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Trouver l'utilisateur
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw ServiceError.unauthorized('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isValidPassword = await AuthUtils.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw ServiceError.unauthorized('Email ou mot de passe incorrect');
    }

    // Vérifier que l'email est vérifié
    if (!user.isVerified) {
      throw new ServiceError('Email non vérifié. Vérifiez votre boîte mail.', 401, {
        requiresVerification: true,
      });
    }

    // Générer le token JWT
    const token = AuthUtils.generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Vérification de l'email
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await UserModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw ServiceError.badRequest('Token invalide ou expiré');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
  }

  /**
   * Demande de réinitialisation de mot de passe
   * Note: Ne révèle pas si l'email existe (sécurité)
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      // Ne pas révéler si l'email existe
      return;
    }

    const resetToken = AuthUtils.generateResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw ServiceError.badRequest('Token invalide ou expiré');
    }

    const hashedPassword = await AuthUtils.hashPassword(newPassword);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }

  /**
   * Renvoi de l'email de vérification
   */
  async resendVerification(email: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    if (user.isVerified) {
      throw ServiceError.badRequest('Email déjà vérifié');
    }

    const verificationToken = AuthUtils.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    await emailService.sendVerificationEmail(email, verificationToken);
  }

  /**
   * Vérification manuelle d'un utilisateur (dev uniquement)
   */
  async devVerifyUser(email: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
  }
}

export const authService = new AuthService();
