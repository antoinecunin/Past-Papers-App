import request from 'supertest';
import express from 'express';
import { router as reportsRouter } from '../../routes/reports.js';
import { ReportModel, ReportStatus, ReportType, ReportReason } from '../../models/Report.js';
import { Exam } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { createAuthenticatedUser } from '../helpers/auth.helper.js';
import { Types } from 'mongoose';

/**
 * Tests pour /api/reports
 * Teste le système de signalement et modération
 */
describe('POST /api/reports', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).post('/api/reports');

    expect(response.status).toBe(401);
  });

  it('should reject invalid type', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'invalid_type',
        targetId: new Types.ObjectId().toString(),
        reason: 'spam',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Type de signalement invalide');
  });

  it('should reject invalid targetId', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'exam',
        targetId: 'invalid-id',
        reason: 'spam',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ID cible invalide');
  });

  it('should reject invalid reason', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'exam',
        targetId: new Types.ObjectId().toString(),
        reason: 'invalid_reason',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Raison de signalement invalide');
  });

  it('should return 404 for non-existent exam', async () => {
    const { token } = await createAuthenticatedUser();
    const fakeId = new Types.ObjectId();

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'exam',
        targetId: fakeId.toString(),
        reason: 'spam',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Examen non trouvé');
  });

  it('should return 404 for non-existent comment', async () => {
    const { token } = await createAuthenticatedUser();
    const fakeId = new Types.ObjectId();

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'comment',
        targetId: fakeId.toString(),
        reason: 'inappropriate_content',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Commentaire non trouvé');
  });

  it('should create report for exam', async () => {
    const { user, token } = await createAuthenticatedUser();

    // Créer un examen
    const exam = await Exam.create({
      title: 'Test Exam',
      year: 2024,
      module: 'Test',
      fileKey: 'test.pdf',
      pages: 5,
      uploadedBy: user._id,
    });

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'exam',
        targetId: exam._id.toString(),
        reason: 'spam',
        description: 'This is spam content',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('reportId');

    // Vérifier que le signalement a été créé
    const report = await ReportModel.findById(response.body.reportId);
    expect(report).toBeTruthy();
    expect(report?.type).toBe('exam');
    expect(report?.targetId.toString()).toBe(exam._id.toString());
    expect(report?.reason).toBe('spam');
    expect(report?.description).toBe('This is spam content');
    expect(report?.reportedBy.toString()).toBe(user._id.toString());
    expect(report?.status).toBe('pending');
  });

  it('should create report for comment', async () => {
    const { user, token } = await createAuthenticatedUser();

    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    const answer = await AnswerModel.create({
      examId: exam._id,
      page: 1,
      yTop: 0.5,
      content: { type: 'text', data: 'Test comment' },
      authorId: user._id,
    });

    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'comment',
        targetId: answer._id.toString(),
        reason: 'inappropriate_content',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('reportId');

    const report = await ReportModel.findById(response.body.reportId);
    expect(report?.type).toBe('comment');
    expect(report?.targetId.toString()).toBe(answer._id.toString());
  });

  it('should reject duplicate report', async () => {
    const { user, token } = await createAuthenticatedUser();

    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    const reportData = {
      type: 'exam',
      targetId: exam._id.toString(),
      reason: 'spam',
    };

    // Premier signalement
    await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send(reportData);

    // Deuxième signalement identique
    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send(reportData);

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('déjà signalé');
  });
});

describe('GET /api/reports', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/reports');

    expect(response.status).toBe(401);
  });

  it('should forbid non-admin users', async () => {
    const { token } = await createAuthenticatedUser({ role: 'user' });

    const response = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('administrateurs');
  });

  it('should return reports list for admin', async () => {
    const { token: adminToken, user: admin } = await createAuthenticatedUser({
      email: 'admin@etu.unistra.fr',
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: 'user@etu.unistra.fr' });

    // Créer un examen et des signalements
    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    // Créer un autre examen pour éviter duplicate key
    const exam2 = await Exam.create({
      title: 'Test2',
      fileKey: 'test2.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    await ReportModel.create([
      {
        type: 'exam',
        targetId: exam._id,
        reason: 'spam',
        reportedBy: user._id,
      },
      {
        type: 'exam',
        targetId: exam2._id,
        reason: 'inappropriate_content',
        reportedBy: user._id,
      },
    ]);

    const response = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reports');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('offset');
    expect(Array.isArray(response.body.reports)).toBe(true);
    expect(response.body.reports.length).toBeGreaterThan(0);
  });

  it('should filter reports by status', async () => {
    const { token: adminToken, user: admin } = await createAuthenticatedUser({
      email: 'admin2@etu.unistra.fr',
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: 'user2@etu.unistra.fr' });

    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    await ReportModel.create({
      type: 'exam',
      targetId: exam._id,
      reason: 'spam',
      reportedBy: user._id,
      status: 'pending',
    });

    const response = await request(app)
      .get('/api/reports?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.reports.length).toBeGreaterThan(0);
    expect(response.body.reports.every((r: any) => r.status === 'pending')).toBe(true);
  });

  it('should paginate results', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'admin3@etu.unistra.fr',
      role: 'admin',
    });

    const response = await request(app)
      .get('/api/reports?limit=5&offset=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination.limit).toBe(5);
    expect(response.body.pagination.offset).toBe(0);
    expect(response.body.reports.length).toBeLessThanOrEqual(5);
  });
});

describe('PUT /api/reports/:id/review', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  it('should require authentication', async () => {
    const reportId = new Types.ObjectId();
    const response = await request(app).put(`/api/reports/${reportId}/review`);

    expect(response.status).toBe(401);
  });

  it('should forbid non-admin users', async () => {
    const { token } = await createAuthenticatedUser();
    const reportId = new Types.ObjectId();

    const response = await request(app)
      .put(`/api/reports/${reportId}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid action', async () => {
    const { token: adminToken, user: admin } = await createAuthenticatedUser({
      email: 'admin4@etu.unistra.fr',
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: 'user4@etu.unistra.fr' });

    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    const report = await ReportModel.create({
      type: 'exam',
      targetId: exam._id,
      reason: 'spam',
      reportedBy: user._id,
    });

    const response = await request(app)
      .put(`/api/reports/${report._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'invalid_action' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Action invalide');
  });

  it('should approve and delete content', async () => {
    const { token: adminToken, user: admin } = await createAuthenticatedUser({
      email: 'admin5@etu.unistra.fr',
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: 'user5@etu.unistra.fr' });

    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    const report = await ReportModel.create({
      type: 'exam',
      targetId: exam._id,
      reason: 'spam',
      reportedBy: user._id,
    });

    const response = await request(app)
      .put(`/api/reports/${report._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('approuvé');

    // Vérifier que le signalement a été mis à jour
    const updatedReport = await ReportModel.findById(report._id);
    expect(updatedReport?.status).toBe('approved');
    expect(updatedReport?.reviewedBy?.toString()).toBe(admin._id.toString());

    // Vérifier que l'examen a été supprimé
    const deletedExam = await Exam.findById(exam._id);
    expect(deletedExam).toBeNull();
  });

  it('should reject report', async () => {
    const { token: adminToken, user: admin } = await createAuthenticatedUser({
      email: 'admin6@etu.unistra.fr',
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: 'user6@etu.unistra.fr' });

    const exam = await Exam.create({
      title: 'Test',
      fileKey: 'test.pdf',
      pages: 1,
      uploadedBy: user._id,
    });

    const report = await ReportModel.create({
      type: 'exam',
      targetId: exam._id,
      reason: 'spam',
      reportedBy: user._id,
    });

    const response = await request(app)
      .put(`/api/reports/${report._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'reject' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('rejeté');

    // Vérifier que le signalement a été rejeté
    const updatedReport = await ReportModel.findById(report._id);
    expect(updatedReport?.status).toBe('rejected');

    // Vérifier que l'examen n'a PAS été supprimé
    const stillExistingExam = await Exam.findById(exam._id);
    expect(stillExistingExam).toBeTruthy();
  });
});