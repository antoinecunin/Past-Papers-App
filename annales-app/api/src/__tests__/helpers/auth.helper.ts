import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { UserModel } from '../../models/User.js';
import { instanceConfigService } from '../../services/instance-config.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Returns the first allowed email domain from instance config (e.g. "@etu.unistra.fr")
 */
export function getAllowedDomain(): string {
  return instanceConfigService.getConfig().email.allowedDomains[0];
}

/**
 * Builds a test email using the configured allowed domain.
 * Example: testEmail('admin') => 'admin@etu.unistra.fr'
 */
export function testEmail(prefix: string): string {
  return `${prefix}${getAllowedDomain()}`;
}

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
    email: overrides.email || testEmail('test'),
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
      tokenVersion: 0,
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
      email: testEmail('expired'),
    },
    JWT_SECRET,
    { expiresIn: '-1d' }
  );
}
