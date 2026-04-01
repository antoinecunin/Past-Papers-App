import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { UserModel, UserRole } from '../models/User.js';
import { instanceConfigService } from '../services/instance-config.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// Rate limiting for sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : process.env.NODE_ENV === 'development' ? 100 : 5,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 100 : 3,
  message: { error: 'Registration limit reached, please try again in 1 hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Zod validation schemas
const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters')
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    'Password must contain at least 8 characters, one letter and one number'
  );

const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email')
    .refine(
      (val) => instanceConfigService.isEmailDomainAllowed(val),
      (_val) => {
        const config = instanceConfigService.getConfig();
        const domains = config.email.allowedDomains.join(', ');
        return { message: `Email must end with one of the allowed domains: ${domains}` };
      }
    ),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  })
  .refine(data => data.firstName || data.lastName, {
    message: 'At least one field must be provided',
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const changeEmailSchema = z.object({
  newEmail: z
    .string()
    .email('Invalid email')
    .refine(
      (val) => instanceConfigService.isEmailDomainAllowed(val),
      (_val) => {
        const config = instanceConfigService.getConfig();
        const domains = config.email.allowedDomains.join(', ');
        return { message: `Email must end with one of the allowed domains: ${domains}` };
      }
    ),
  password: z.string().min(1, 'Password is required'),
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
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
 *                 description: University email (must match allowed domains)
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (8+ characters, letter + number)
 *               firstName:
 *                 type: string
 *                 description: First name
 *               lastName:
 *                 type: string
 *                 description: Last name
 *     responses:
 *       201:
 *         description: Registration successful, verification email sent
 *       400:
 *         description: Invalid data
 *       409:
 *         description: Email already in use
 */
router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { userId } = await authService.register(result.data);

    res.status(201).json({
      id: userId,
      message: 'Registration successful. Please check your email to activate your account.',
    });
  })
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
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
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Valid JWT for authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                     isVerified:
 *                       type: boolean
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Incorrect credentials or unverified email
 */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email, password } = result.data;
    const loginResult = await authService.login(email, password);

    res.cookie(COOKIE_NAME, loginResult.token, COOKIE_OPTIONS);
    res.json({ user: loginResult.user });
  })
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address
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
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token manquant' });
    }

    await authService.verifyEmail(token);

    res.json({ message: 'Email vérifié avec succès' });
  })
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset
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
 *         description: Reset email sent
 *       404:
 *         description: User not found
 */
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { email } = result.data;
    await authService.forgotPassword(email);

    // Always return the same message (security)
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
  })
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
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
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { token, password } = result.data;
    await authService.resetPassword(token, password);

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  })
);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification email
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
 *         description: Verification email resent
 *       400:
 *         description: User already verified or not found
 */
router.post(
  '/resend-verification',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email manquant' });
    }

    await authService.resendVerification(email);

    res.json({ message: 'Email de vérification renvoyé' });
  })
);

/**
 * @swagger
 * /auth/dev/verify-user:
 *   post:
 *     summary: Mark a user as verified (development only)
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
 *                 example: user@students.example.edu
 *     responses:
 *       200:
 *         description: User marked as verified
 *       400:
 *         description: Email not provided
 *       404:
 *         description: User not found
 *       403:
 *         description: Only available in development
 */
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/dev/verify-user',
    asyncHandler(async (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email requis' });
      }

      await authService.devVerifyUser(email);

      res.json({ message: 'Utilisateur marqué comme vérifié', email });
    })
  );
}

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 role:
 *                   type: string
 *                 isVerified:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const profile = await authService.getProfile(req.user!.id);
    res.json(profile);
  })
);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Not authenticated
 */
router.patch(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const user = await authService.updateProfile(req.user!.id, result.data);
    res.json({ message: 'Profil mis à jour', user });
  })
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password (authenticated user)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (8+ characters, letter + number)
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Incorrect current password
 */
router.post(
  '/change-password',
  authMiddleware,
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { currentPassword, newPassword } = result.data;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    res.json({ message: 'Mot de passe modifié avec succès' });
  })
);

/**
 * @swagger
 * /auth/email:
 *   put:
 *     summary: Change email address
 *     description: >
 *       Changes the user's email address. Requires current password for confirmation.
 *       The email will be reset as unverified and a new verification email will be sent.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *               - password
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *                 description: New email address (must match allowed domains)
 *               password:
 *                 type: string
 *                 description: Current password for confirmation
 *     responses:
 *       200:
 *         description: Email changed, verification required
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Incorrect password
 *       409:
 *         description: Email already in use
 */
router.put(
  '/email',
  authMiddleware,
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = changeEmailSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { newEmail, password } = result.data;
    await authService.changeEmail(req.user!.id, newEmail, password);

    res.json({
      message: 'Email modifié avec succès. Veuillez vérifier votre nouvelle adresse email.',
    });
  })
);

/**
 * @swagger
 * /auth/data-export:
 *   get:
 *     summary: Export all user data (GDPR)
 *     description: >
 *       Returns all personal data and content created by the user in JSON format
 *       (right of access and right to data portability).
 *       Includes: profile, uploaded exams, comments, reports.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exportDate:
 *                   type: string
 *                   format: date-time
 *                 profile:
 *                   type: object
 *                 statistics:
 *                   type: object
 *                 data:
 *                   type: object
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/data-export',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const exportData = await authService.exportUserData(req.user!.id);
    res.json(exportData);
  })
);

/**
 * @swagger
 * /auth/account:
 *   delete:
 *     summary: Delete user account (GDPR)
 *     description: >
 *       Deletes the user's personal data.
 *       Exams and answers are kept but anonymized (author set to null).
 *       Reports are deleted.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Password to confirm deletion
 *     responses:
 *       200:
 *         description: Account deleted, content anonymized
 *       400:
 *         description: Password missing
 *       401:
 *         description: Incorrect password
 */
router.delete(
  '/account',
  authMiddleware,
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = deleteAccountSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    await authService.deleteAccount(req.user!.id, result.data.password);

    res.json({ message: 'Compte supprimé avec succès' });
  })
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout (invalidate all existing tokens)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await UserModel.findByIdAndUpdate(req.user!.id, { $inc: { tokenVersion: 1 } });
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.json({ message: 'Déconnexion réussie' });
  })
);

// ─── Admin: user management ───

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'role must be "user" or "admin"' }),
  }),
});

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not admin
 */
router.get(
  '/users',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const users = await UserModel.find()
      .select('email firstName lastName role isVerified canComment canUpload createdAt')
      .sort({ createdAt: 1 })
      .lean();

    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase();
    const callerIsInitialAdmin = !!initialAdminEmail && req.user!.email === initialAdminEmail;

    return res.json({ users, canManageRoles: callerIsInitialAdmin });
  })
);

/**
 * @swagger
 * /auth/users/{id}/role:
 *   put:
 *     summary: Change a user's role (initial admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid role or cannot change this user
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the initial admin
 *       404:
 *         description: User not found
 */
router.put(
  '/users/:id/role',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Only the initial admin can change roles
    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase();
    if (!initialAdminEmail || req.user!.email !== initialAdminEmail) {
      return res.status(403).json({ error: 'Only the initial admin can manage roles' });
    }

    const result = updateRoleSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { id } = req.params;
    const { role } = result.data;

    // Cannot change own role
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot change the initial admin's role
    if (targetUser.email === initialAdminEmail) {
      return res.status(400).json({ error: 'Cannot change the initial admin role' });
    }

    targetUser.role = role as UserRole;
    if (role === 'admin') {
      targetUser.canComment = true;
      targetUser.canUpload = true;
    }
    await targetUser.save();

    return res.json({
      success: true,
      user: {
        _id: targetUser._id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
      },
    });
  })
);

const updatePermissionsSchema = z.object({
  canComment: z.boolean().optional(),
  canUpload: z.boolean().optional(),
}).refine(data => data.canComment !== undefined || data.canUpload !== undefined, {
  message: 'At least one permission must be provided',
});

/**
 * @swagger
 * /auth/users/{id}/permissions:
 *   put:
 *     summary: Update user permissions (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               canComment:
 *                 type: boolean
 *               canUpload:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Permissions updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not admin
 *       404:
 *         description: User not found
 */
router.put(
  '/users/:id/permissions',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = updatePermissionsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { id } = req.params;

    // Cannot change own permissions
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own permissions' });
    }

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot change admin permissions
    if (targetUser.role === UserRole.ADMIN) {
      return res.status(400).json({ error: 'Cannot change admin permissions' });
    }

    const { canComment, canUpload } = result.data;
    if (canComment !== undefined) targetUser.canComment = canComment;
    if (canUpload !== undefined) targetUser.canUpload = canUpload;
    await targetUser.save();

    return res.json({
      success: true,
      user: {
        _id: targetUser._id,
        canComment: targetUser.canComment,
        canUpload: targetUser.canUpload,
      },
    });
  })
);

export { router };
