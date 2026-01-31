import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { UserModel } from '../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Crée un utilisateur de test et retourne son token JWT
 */
export async function createAuthenticatedUser(
  overrides: {
    email?: string;
    role?: 'user' | 'admin';
    isVerified?: boolean;
    firstName?: string;
    lastName?: string;
  } = {}
) {
  const user = await UserModel.create({
    email: overrides.email || 'test@etu.unistra.fr',
    password: 'hashedpassword123',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'user',
    isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
    verificationToken: null,
  });

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { user, token };
}

/**
 * Crée un token JWT invalide pour tester l'authentification
 */
export function createInvalidToken(): string {
  return jwt.sign(
    {
      userId: new Types.ObjectId().toString(),
      email: 'fake@example.com',
    },
    'wrong-secret',
    { expiresIn: '7d' }
  );
}

/**
 * Crée un token JWT expiré
 */
export function createExpiredToken(): string {
  return jwt.sign(
    {
      userId: new Types.ObjectId().toString(),
      email: 'expired@etu.unistra.fr',
    },
    JWT_SECRET,
    { expiresIn: '-1d' }
  );
}
