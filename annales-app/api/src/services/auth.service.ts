import { UserModel } from '../models/User.js';
import { Exam } from '../models/Exam.js';
import { AnswerModel } from '../models/Answer.js';
import { ReportModel } from '../models/Report.js';
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

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
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
      if (existingUser.isVerified) {
        // Ne pas révéler que le compte existe — envoyer un email de notification
        await emailService.sendAccountExistsNotification(email);
        return { userId: existingUser._id.toString() };
      }
      // Remplacer le compte non vérifié
      await UserModel.findByIdAndDelete(existingUser._id);
    }

    // Hacher le mot de passe
    const hashedPassword = await AuthUtils.hashPassword(password);

    // Générer un token de vérification
    const verificationToken = AuthUtils.generateRandomToken();
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
      tokenVersion: user.tokenVersion ?? 0,
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

    const resetToken = AuthUtils.generateRandomToken();
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

    const verificationToken = AuthUtils.generateRandomToken();
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

  /**
   * Récupérer le profil de l'utilisateur
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Mettre à jour le profil (prénom/nom)
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileData
  ): Promise<Omit<UserProfile, 'createdAt'>> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;

    await user.save();

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
    };
  }

  /**
   * Changer le mot de passe (utilisateur authentifié)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    // Vérifier le mot de passe actuel
    const isValid = await AuthUtils.comparePassword(currentPassword, user.password);
    if (!isValid) {
      throw ServiceError.unauthorized('Mot de passe actuel incorrect');
    }

    // Hasher et sauvegarder le nouveau mot de passe
    user.password = await AuthUtils.hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
  }

  /**
   * Modifier l'adresse email
   */
  async changeEmail(userId: string, newEmail: string, password: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    // Vérifier le mot de passe
    const isValid = await AuthUtils.comparePassword(password, user.password);
    if (!isValid) {
      throw ServiceError.unauthorized('Mot de passe incorrect');
    }

    // Vérifier que le nouvel email n'est pas déjà utilisé
    const normalizedEmail = newEmail.toLowerCase().trim();
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      throw ServiceError.conflict('Cette adresse email est déjà utilisée');
    }

    // Mettre à jour l'email et réinitialiser la vérification
    user.email = normalizedEmail;
    user.isVerified = false;
    user.verificationToken = AuthUtils.generateRandomToken();
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;

    await user.save();

    // Envoyer un nouvel email de vérification
    await emailService.sendVerificationEmail(normalizedEmail, user.verificationToken);
  }

  /**
   * Exporter toutes les données utilisateur (RGPD - droit d'accès et portabilité)
   * Retourne toutes les données personnelles et le contenu créé par l'utilisateur
   */
  async exportUserData(userId: string): Promise<object> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    // 1. Données du profil
    const profile = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 2. Examens uploadés
    const exams = await Exam.find({ uploadedBy: userId })
      .select('title year module fileKey pages createdAt updatedAt')
      .lean();

    // 3. Commentaires et réponses
    const answers = await AnswerModel.find({ authorId: userId })
      .select('examId page yTop content parentId createdAt updatedAt')
      .lean();

    // 4. Signalements créés
    const reports = await ReportModel.find({ reportedBy: userId })
      .select('type targetId reason description status createdAt')
      .lean();

    return {
      exportDate: new Date().toISOString(),
      profile,
      statistics: {
        examsUploaded: exams.length,
        commentsPosted: answers.length,
        reportsSubmitted: reports.length,
      },
      data: {
        exams,
        comments: answers,
        reports,
      },
    };
  }

  /**
   * Supprimer le compte utilisateur (RGPD - droit à l'effacement)
   * Anonymise le contenu (examens, réponses) et supprime les données personnelles
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ServiceError.notFound('Utilisateur non trouvé');
    }

    // Vérifier le mot de passe
    const isValid = await AuthUtils.comparePassword(password, user.password);
    if (!isValid) {
      throw ServiceError.unauthorized('Mot de passe incorrect');
    }

    // 1. Anonymiser les examens (on garde le contenu)
    await Exam.updateMany({ uploadedBy: userId }, { $set: { uploadedBy: null } });

    // 2. Anonymiser les réponses (on garde le contenu)
    await AnswerModel.updateMany({ authorId: userId }, { $set: { authorId: null } });

    // 3. Supprimer les signalements créés par l'utilisateur
    await ReportModel.deleteMany({ reportedBy: userId });

    // 4. Supprimer le compte utilisateur
    await UserModel.findByIdAndDelete(userId);
  }
}

export const authService = new AuthService();
