import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export class AuthUtils {
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    static async comparePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
    static generateToken(payload) {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    }
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw new Error('Token invalide');
        }
    }
    static generateRandomToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    static generateVerificationToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    static generateResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.endsWith('@etu.unistra.fr');
    }
    static isValidPassword(password) {
        // Au moins 8 caractères, avec au moins une lettre et un chiffre
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        return passwordRegex.test(password);
    }
}
