import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { UserModel } from '../models/User.js';
import { AuthUtils } from '../utils/auth.js';
import { emailService } from '../services/email.js';

const router = Router();

// Rate limiting pour les routes sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : process.env.NODE_ENV === 'development' ? 100 : 5,
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: process.env.NODE_ENV === 'test' ? 100 : 3, // Permissif en test
  message: { error: "Limite d'inscriptions atteinte, réessayez dans 1 heure" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Schémas de validation Zod
const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    'Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre'
  );

const registerSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .refine((val) => val.endsWith('@etu.unistra.fr'), {
      message: "L'email doit se terminer par @etu.unistra.fr",
    }),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'Prénom requis').max(50, 'Prénom trop long'),
  lastName: z.string().trim().min(1, 'Nom requis').max(50, 'Nom trop long'),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: passwordSchema,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email universitaire (@etu.unistra.fr)
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Mot de passe (8+ caractères, lettre + chiffre)
 *               firstName:
 *                 type: string
 *                 description: Prénom
 *               lastName:
 *                 type: string
 *                 description: Nom
 *     responses:
 *       201:
 *         description: Inscription réussie, email de vérification envoyé
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email, password, firstName, lastName } = result.data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
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

    res.status(201).json({
      message: 'Inscription réussie. Vérifiez votre email pour activer votre compte.',
      userId: user._id,
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Identifiants incorrects ou email non vérifié
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email, password } = result.data;

    // Trouver l'utilisateur
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await AuthUtils.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier que l'email est vérifié
    if (!user.isVerified) {
      return res.status(401).json({
        error: 'Email non vérifié. Vérifiez votre boîte mail.',
        requiresVerification: true,
      });
    }

    // Générer le token JWT
    const token = AuthUtils.generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Vérification de l'adresse email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email vérifié avec succès
 *       400:
 *         description: Token invalide ou expiré
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token manquant' });
    }

    const user = await UserModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email vérifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demande de réinitialisation de mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé
 *       404:
 *         description: Utilisateur non trouvé
 */
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email } = result.data;

    const user = await UserModel.findOne({ email });
    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
    }

    const resetToken = AuthUtils.generateResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialisation du mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Token invalide ou expiré
 */
router.post('/reset-password', async (req, res) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { token, password } = result.data;

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const hashedPassword = await AuthUtils.hashPassword(password);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Renvoyer l'email de vérification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de vérification renvoyé
 *       400:
 *         description: Utilisateur déjà vérifié ou non trouvé
 */
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email manquant' });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    const verificationToken = AuthUtils.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    await emailService.sendVerificationEmail(email, verificationToken);

    res.json({ message: 'Email de vérification renvoyé' });
  } catch (error) {
    console.error('Erreur lors du renvoi de vérification:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * @swagger
 * /api/auth/dev/verify-user:
 *   post:
 *     summary: Marquer un utilisateur comme vérifié (développement uniquement)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@etu.unistra.fr
 *     responses:
 *       200:
 *         description: Utilisateur marqué comme vérifié
 *       400:
 *         description: Email non fourni
 *       404:
 *         description: Utilisateur non trouvé
 *       403:
 *         description: Disponible uniquement en développement
 */
router.post('/dev/verify-user', async (req, res) => {
  // Route disponible uniquement en développement
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Route disponible uniquement en développement' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Marquer comme vérifié
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ message: 'Utilisateur marqué comme vérifié', email });
  } catch (error) {
    console.error('Erreur lors de la vérification dev:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export { router };
