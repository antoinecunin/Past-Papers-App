import request from 'supertest';
import express from 'express';
import { router as authRouter } from '../../routes/auth.js';
import { UserModel } from '../../models/User.js';
import bcrypt from 'bcryptjs';
import { errorHandler } from '../../middleware/errorHandler.js';
import { testEmail, getAllowedDomain } from '../helpers/auth.helper.js';

/**
 * Tests pour /api/auth
 * Test des routes d'authentification avec doublures pour l'email
 * Le service email est mocké dans setup.ts
 */
describe('POST /api/auth/register', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  describe('Validation des données', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject email from unauthorized domain', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test@gmail.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(getAllowedDomain());
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail('test'),
          password: '123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail('test'),
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Inscription réussie', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: testEmail('newuser'),
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app).post('/api/auth/register').send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');

      // Vérifier que l'utilisateur a été créé
      const user = await UserModel.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user?.firstName).toBe(userData.firstName);
      expect(user?.isVerified).toBe(false);
      expect(user?.verificationToken).toBeTruthy();
    });

    it('should hash password', async () => {
      const password = 'password123';
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail('hashtest'),
          password,
          firstName: 'Hash',
          lastName: 'Test',
        });

      const user = await UserModel.findOne({ email: testEmail('hashtest') });
      expect(user?.password).not.toBe(password);
      expect(user?.password.length).toBeGreaterThan(20);
    });

    it('should allow re-registration with unverified email', async () => {
      const userData = {
        email: testEmail('duplicate'),
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app).post('/api/auth/register').send(userData);
      const response = await request(app).post('/api/auth/register').send(userData);

      expect(response.status).toBe(201);
    });

    it('should silently succeed when email is already verified (no enumeration)', async () => {
      const email = testEmail('verified-dup');
      await UserModel.create({
        email,
        password: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe',
        isVerified: true,
      });

      const response = await request(app).post('/api/auth/register').send({
        email,
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      // Returns success to prevent email enumeration
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });
});

describe('POST /api/auth/login', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Créer un utilisateur vérifié pour les tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: testEmail('verified'),
      password: hashedPassword,
      firstName: 'Verified',
      lastName: 'User',
      role: 'user',
      isVerified: true,
      verificationToken: null,
    });
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('verified'),
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testEmail('verified'));
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should reject invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('verified'),
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Incorrect email or password');
  });

  it('should reject non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('nonexistent'),
        password: 'password123',
      });

    expect(response.status).toBe(401);
  });

  it('should reject unverified user', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: testEmail('unverified'),
      password: hashedPassword,
      firstName: 'Unverified',
      lastName: 'User',
      role: 'user',
      isVerified: false,
      verificationToken: 'some-token',
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('unverified'),
        password: 'password123',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Email not verified');
  });

  it('should return user data without sensitive fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('verified'),
        password: 'password123',
      });

    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('verificationToken');
    expect(response.body.user).not.toHaveProperty('passwordResetToken');
  });
});

describe('POST /api/auth/verify-email', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  it('should verify email with valid token', async () => {
    const token = 'valid-verification-token';
    const hashedPassword = await bcrypt.hash('password123', 10);
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

    await UserModel.create({
      email: testEmail('toverify'),
      password: hashedPassword,
      firstName: 'To',
      lastName: 'Verify',
      role: 'user',
      isVerified: false,
      verificationToken: token,
      verificationExpires: futureDate,
    });

    const response = await request(app).post('/api/auth/verify-email').send({ token });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('verified');

    const user = await UserModel.findOne({ email: testEmail('toverify') });
    expect(user?.isVerified).toBe(true);
    expect(user?.verificationToken).toBeUndefined();
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'invalid-token' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid or expired token');
  });

  it('should reject already verified user', async () => {
    const token = 'already-used-token';
    const hashedPassword = await bcrypt.hash('password123', 10);

    await UserModel.create({
      email: testEmail('alreadyverified'),
      password: hashedPassword,
      firstName: 'Already',
      lastName: 'Verified',
      role: 'user',
      isVerified: true,
      verificationToken: null,
    });

    const response = await request(app).post('/api/auth/verify-email').send({ token });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/forgot-password', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app).post('/api/auth/forgot-password').send({});

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app).post('/api/auth/forgot-password').send({
      email: 'not-an-email',
    });

    expect(response.status).toBe(400);
  });

  it('should send reset email for existing user', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: testEmail('resetme'),
      password: hashedPassword,
      firstName: 'Reset',
      lastName: 'Me',
      role: 'user',
      isVerified: true,
    });

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        email: testEmail('resetme'),
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBeTruthy();

    // Vérifier que le token a été enregistré
    const user = await UserModel.findOne({ email: testEmail('resetme') });
    expect(user?.resetPasswordToken).toBeTruthy();
    expect(user?.resetPasswordExpires).toBeTruthy();
  });

  it('should not reveal if email does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        email: testEmail('nonexistent'),
      });

    // Même message pour ne pas révéler si l'email existe
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('If this email exists');
  });
});

describe('POST /api/auth/reset-password', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  it('should return 400 for missing fields', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'some-token',
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid token', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'invalid-token',
      password: 'newPassword123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid or expired token');
  });

  it('should return 400 for expired token', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // -1h

    await UserModel.create({
      email: testEmail('expired-reset'),
      password: hashedPassword,
      firstName: 'Expired',
      lastName: 'Token',
      role: 'user',
      isVerified: true,
      resetPasswordToken: 'expired-token',
      resetPasswordExpires: expiredDate,
    });

    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'expired-token',
      password: 'newPassword123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid or expired token');
  });

  it('should reset password with valid token', async () => {
    const hashedPassword = await bcrypt.hash('oldPassword123', 10);
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // +1h

    await UserModel.create({
      email: testEmail('resetvalid'),
      password: hashedPassword,
      firstName: 'Reset',
      lastName: 'Valid',
      role: 'user',
      isVerified: true,
      resetPasswordToken: 'valid-reset-token',
      resetPasswordExpires: futureDate,
    });

    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'valid-reset-token',
      password: 'newPassword123',
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('reset successfully');

    // Vérifier que le mot de passe a été changé et les tokens supprimés
    const user = await UserModel.findOne({ email: testEmail('resetvalid') });
    expect(user?.password).not.toBe(hashedPassword);
    expect(user?.resetPasswordToken).toBeUndefined();
    expect(user?.resetPasswordExpires).toBeUndefined();

    // Vérifier qu'on peut se connecter avec le nouveau mot de passe
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('resetvalid'),
        password: 'newPassword123',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers['set-cookie']).toBeDefined();
  });
});
