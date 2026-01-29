import request from 'supertest';
import express from 'express';
import { router as authRouter } from '../../routes/auth.js';
import { UserModel } from '../../models/User.js';
import { Exam } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { ReportModel, ReportType, ReportReason } from '../../models/Report.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await UserModel.create({
      email: 'profile@etu.unistra.fr',
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
    expect(response.body).toHaveProperty('email', 'profile@etu.unistra.fr');
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
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await UserModel.create({
      email: 'update@etu.unistra.fr',
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
    expect(response.body).toHaveProperty('message', 'Profil mis à jour');
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
    expect(response.body.error).toContain('Au moins un champ');
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
    expect(response.body.error).toContain('trop long');
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
    const response = await request(app)
      .patch('/api/auth/profile')
      .send({ firstName: 'Test' });

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
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('currentPassword123', 10);
    const user = await UserModel.create({
      email: 'changepwd@etu.unistra.fr',
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
    expect(response.body.message).toContain('modifié');

    // Vérifier qu'on peut se connecter avec le nouveau mot de passe
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'changepwd@etu.unistra.fr',
      password: 'newPassword456',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');
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
    expect(response.body.error).toContain('actuel incorrect');
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
    expect(response.body.error).toContain('8 caractères');
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
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('deleteMe123', 10);
    const user = await UserModel.create({
      email: 'todelete@etu.unistra.fr',
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
    expect(response.body.message).toContain('supprimé');

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
      email: 'other@etu.unistra.fr',
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
    expect(response.body.error).toContain('incorrect');

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
