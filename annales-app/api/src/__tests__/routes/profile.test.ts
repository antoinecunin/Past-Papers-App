import request from 'supertest';
import express from 'express';
import { router as authRouter } from '../../routes/auth.js';
import { UserModel } from '../../models/User.js';
import { Exam } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { ReportModel, ReportType, ReportReason } from '../../models/Report.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../../middleware/errorHandler.js';
import { testEmail, getAllowedDomain } from '../helpers/auth.helper.js';

/**
 * Tests pour les routes de profil utilisateur
 * GET /api/auth/profile
 * PATCH /api/auth/profile
 * POST /api/auth/change-password
 * DELETE /api/auth/account
 */

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

describe('GET /api/auth/profile', () => {
  let app: express.Application;
  let testUser: { _id: string; email: string; token: string };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await UserModel.create({
      email: testEmail('profile'),
      password: hashedPassword,
      firstName: 'Profile',
      lastName: 'User',
      role: 'user',
      isVerified: true,
    });

    testUser = {
      _id: user._id.toString(),
      email: user.email,
      token: generateToken(user._id.toString(), user.email),
    };
  });

  it('should return user profile with valid token', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', testEmail('profile'));
    expect(response.body).toHaveProperty('firstName', 'Profile');
    expect(response.body).toHaveProperty('lastName', 'User');
    expect(response.body).toHaveProperty('role', 'user');
    expect(response.body).toHaveProperty('isVerified', true);
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).not.toHaveProperty('password');
  });

  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/auth/profile');

    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/auth/profile', () => {
  let app: express.Application;
  let testUser: { _id: string; email: string; token: string };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await UserModel.create({
      email: testEmail('update'),
      password: hashedPassword,
      firstName: 'Before',
      lastName: 'Update',
      role: 'user',
      isVerified: true,
    });

    testUser = {
      _id: user._id.toString(),
      email: user.email,
      token: generateToken(user._id.toString(), user.email),
    };
  });

  it('should update firstName only', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ firstName: 'NewFirst' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Profile updated');
    expect(response.body.user).toHaveProperty('firstName', 'NewFirst');
    expect(response.body.user).toHaveProperty('lastName', 'Update');

    // Vérifier en base
    const user = await UserModel.findById(testUser._id);
    expect(user?.firstName).toBe('NewFirst');
  });

  it('should update lastName only', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ lastName: 'NewLast' });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty('lastName', 'NewLast');
    expect(response.body.user).toHaveProperty('firstName', 'Before');
  });

  it('should update both firstName and lastName', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ firstName: 'NewFirst', lastName: 'NewLast' });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty('firstName', 'NewFirst');
    expect(response.body.user).toHaveProperty('lastName', 'NewLast');
  });

  it('should return 400 if no field provided', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('At least one field');
  });

  it('should return 400 for empty firstName', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ firstName: '' });

    expect(response.status).toBe(400);
  });

  it('should return 400 for too long firstName', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ firstName: 'a'.repeat(51) });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('too long');
  });

  it('should trim whitespace from names', async () => {
    const response = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ firstName: '  Trimmed  ' });

    expect(response.status).toBe(200);
    expect(response.body.user.firstName).toBe('Trimmed');
  });

  it('should return 401 without token', async () => {
    const response = await request(app).patch('/api/auth/profile').send({ firstName: 'Test' });

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  let app: express.Application;
  let testUser: { _id: string; email: string; token: string };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('currentPassword123', 10);
    const user = await UserModel.create({
      email: testEmail('changepwd'),
      password: hashedPassword,
      firstName: 'Change',
      lastName: 'Password',
      role: 'user',
      isVerified: true,
    });

    testUser = {
      _id: user._id.toString(),
      email: user.email,
      token: generateToken(user._id.toString(), user.email),
    };
  });

  it('should change password with valid current password', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        currentPassword: 'currentPassword123',
        newPassword: 'newPassword456',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('changed successfully');

    // Vérifier qu'on peut se connecter avec le nouveau mot de passe
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail('changepwd'),
        password: 'newPassword456',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers['set-cookie']).toBeDefined();
  });

  it('should reject wrong current password', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        currentPassword: 'wrongPassword123',
        newPassword: 'newPassword456',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Incorrect current password');
  });

  it('should reject weak new password', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        currentPassword: 'currentPassword123',
        newPassword: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('8 characters');
  });

  it('should reject new password without letter', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        currentPassword: 'currentPassword123',
        newPassword: '12345678',
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing currentPassword', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newPassword: 'newPassword456',
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing newPassword', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        currentPassword: 'currentPassword123',
      });

    expect(response.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const response = await request(app).post('/api/auth/change-password').send({
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword456',
    });

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/auth/account', () => {
  let app: express.Application;
  let testUser: { _id: string; email: string; token: string };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('deleteMe123', 10);
    const user = await UserModel.create({
      email: testEmail('todelete'),
      password: hashedPassword,
      firstName: 'To',
      lastName: 'Delete',
      role: 'user',
      isVerified: true,
    });

    testUser = {
      _id: user._id.toString(),
      email: user.email,
      token: generateToken(user._id.toString(), user.email),
    };
  });

  it('should delete account with correct password', async () => {
    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ password: 'deleteMe123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('deleted successfully');

    // Vérifier que l'utilisateur n'existe plus
    const user = await UserModel.findById(testUser._id);
    expect(user).toBeNull();
  });

  it('should anonymize associated exams and answers', async () => {
    // Créer un examen pour l'utilisateur
    const exam = await Exam.create({
      title: 'Test Exam',
      year: 2024,
      module: 'Test',
      fileKey: 'test/key.pdf',
      uploadedBy: testUser._id,
    });

    // Créer une réponse sur cet examen
    await AnswerModel.create({
      examId: exam._id,
      page: 1,
      yTop: 0.5,
      content: { type: 'text', data: 'Test answer' },
      authorId: testUser._id,
    });

    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ password: 'deleteMe123' });

    expect(response.status).toBe(200);

    // Vérifier que l'examen existe toujours mais est anonymisé
    const anonymizedExam = await Exam.findById(exam._id);
    expect(anonymizedExam).not.toBeNull();
    expect(anonymizedExam!.uploadedBy).toBeNull();

    // Vérifier que la réponse existe toujours mais est anonymisée
    const answers = await AnswerModel.find({ examId: exam._id });
    expect(answers).toHaveLength(1);
    expect(answers[0].authorId).toBeNull();
  });

  it('should delete user reports', async () => {
    // Créer un autre utilisateur pour avoir une cible de signalement
    const otherUser = await UserModel.create({
      email: testEmail('other'),
      password: 'hashedpwd',
      firstName: 'Other',
      lastName: 'User',
      isVerified: true,
    });

    const exam = await Exam.create({
      title: 'Other Exam',
      year: 2024,
      module: 'Other',
      fileKey: 'other/key.pdf',
      uploadedBy: otherUser._id,
    });

    // Créer un signalement par l'utilisateur à supprimer
    await ReportModel.create({
      type: ReportType.EXAM,
      targetId: exam._id,
      reason: ReportReason.WRONG_EXAM,
      reportedBy: testUser._id,
    });

    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ password: 'deleteMe123' });

    expect(response.status).toBe(200);

    // Vérifier que le signalement est supprimé
    const reports = await ReportModel.find({ reportedBy: testUser._id });
    expect(reports).toHaveLength(0);
  });

  it('should reject wrong password', async () => {
    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ password: 'wrongPassword123' });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Incorrect password');

    // Vérifier que l'utilisateur existe toujours
    const user = await UserModel.findById(testUser._id);
    expect(user).not.toBeNull();
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const response = await request(app)
      .delete('/api/auth/account')
      .send({ password: 'deleteMe123' });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/auth/data-export', () => {
  let app: express.Application;
  let testUser: { _id: string; email: string; token: string };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('export123', 10);
    const user = await UserModel.create({
      email: testEmail('export'),
      password: hashedPassword,
      firstName: 'Export',
      lastName: 'User',
      role: 'user',
      isVerified: true,
    });

    testUser = {
      _id: user._id.toString(),
      email: user.email,
      token: generateToken(user._id.toString(), user.email),
    };
  });

  it('should export user data with valid token', async () => {
    // Créer des données associées à l'utilisateur
    const exam = await Exam.create({
      title: 'Export Test Exam',
      year: 2024,
      module: 'Test',
      fileKey: 'test/key.pdf',
      uploadedBy: testUser._id,
    });

    await AnswerModel.create({
      examId: exam._id,
      authorId: testUser._id,
      page: 1,
      yTop: 0.5,
      content: { type: 'text', data: 'Test comment' },
    });

    await ReportModel.create({
      type: ReportType.EXAM,
      targetId: exam._id,
      reason: ReportReason.SPAM,
      reportedBy: testUser._id,
    });

    const response = await request(app)
      .get('/api/auth/data-export')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('exportDate');
    expect(response.body).toHaveProperty('profile');
    expect(response.body).toHaveProperty('statistics');
    expect(response.body).toHaveProperty('data');

    // Vérifier le profil
    expect(response.body.profile).toMatchObject({
      email: testEmail('export'),
      firstName: 'Export',
      lastName: 'User',
      role: 'user',
      isVerified: true,
    });

    // Vérifier les statistiques
    expect(response.body.statistics).toMatchObject({
      examsUploaded: 1,
      commentsPosted: 1,
      reportsSubmitted: 1,
    });

    // Vérifier les données
    expect(response.body.data.exams).toHaveLength(1);
    expect(response.body.data.exams[0].title).toBe('Export Test Exam');
    expect(response.body.data.comments).toHaveLength(1);
    expect(response.body.data.comments[0].content.type).toBe('text');
    expect(response.body.data.comments[0].content.data).toBe('Test comment');
    expect(response.body.data.reports).toHaveLength(1);
  });

  it('should export empty data for user without content', async () => {
    const response = await request(app)
      .get('/api/auth/data-export')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(response.status).toBe(200);
    expect(response.body.statistics).toMatchObject({
      examsUploaded: 0,
      commentsPosted: 0,
      reportsSubmitted: 0,
    });
    expect(response.body.data.exams).toHaveLength(0);
    expect(response.body.data.comments).toHaveLength(0);
    expect(response.body.data.reports).toHaveLength(0);
  });

  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/auth/data-export');

    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/data-export')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });
});

describe('PUT /api/auth/email', () => {
  let app: express.Application;
  let testUser: { _id: string; email: string; token: string };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('changemail123', 10);
    const user = await UserModel.create({
      email: testEmail('old'),
      password: hashedPassword,
      firstName: 'Change',
      lastName: 'Email',
      role: 'user',
      isVerified: true,
    });

    testUser = {
      _id: user._id.toString(),
      email: user.email,
      token: generateToken(user._id.toString(), user.email),
    };
  });

  it('should change email with valid data', async () => {
    const response = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newEmail: testEmail('new'),
        password: 'changemail123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Email changed successfully');

    // Vérifier que l'email a été changé
    const user = await UserModel.findById(testUser._id);
    expect(user?.email).toBe(testEmail('new'));
    expect(user?.isVerified).toBe(false);
    expect(user?.verificationToken).toBeTruthy();
    expect(user?.verificationExpires).toBeTruthy();
  });

  it('should normalize email to lowercase', async () => {
    const response = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newEmail: testEmail('NEW'),
        password: 'changemail123',
      });

    expect(response.status).toBe(200);

    const user = await UserModel.findById(testUser._id);
    expect(user?.email).toBe(testEmail('new'));
  });

  it('should reject invalid email format', async () => {
    const response = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newEmail: 'invalid-email',
        password: 'changemail123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid email');
  });

  it('should reject email from unauthorized domain', async () => {
    const response = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newEmail: 'test@gmail.com',
        password: 'changemail123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(getAllowedDomain());
  });

  it('should reject wrong password', async () => {
    const response = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newEmail: testEmail('new'),
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Incorrect password');

    // Vérifier que l'email n'a pas changé
    const user = await UserModel.findById(testUser._id);
    expect(user?.email).toBe(testEmail('old'));
  });

  it('should reject email already in use', async () => {
    // Créer un autre utilisateur avec l'email cible
    await UserModel.create({
      email: testEmail('existing'),
      password: 'hashedpwd',
      firstName: 'Existing',
      lastName: 'User',
      isVerified: true,
    });

    const response = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        newEmail: testEmail('existing'),
        password: 'changemail123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('already in use');
  });

  it('should return 400 for missing fields', async () => {
    const response1 = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ password: 'changemail123' });

    expect(response1.status).toBe(400);

    const response2 = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ newEmail: testEmail('new') });

    expect(response2.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const response = await request(app)
      .put('/api/auth/email')
      .send({
        newEmail: testEmail('new'),
        password: 'changemail123',
      });

    expect(response.status).toBe(401);
  });
});
