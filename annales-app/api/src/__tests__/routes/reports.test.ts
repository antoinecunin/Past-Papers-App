import request from 'supertest';
import express from 'express';
import { router as reportsRouter } from '../../routes/reports.js';
import { ReportModel } from '../../models/Report.js';
import { Exam } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { Types } from 'mongoose';
import { errorHandler } from '../../middleware/errorHandler.js';

/**
 * Tests pour /api/reports
 * Teste le système de signalement et modération
 */
describe('GET /api/reports/metadata', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
    app.use(errorHandler);
  });

  it('should return report metadata without authentication', async () => {
    const response = await request(app).get('/api/reports/metadata');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('types');
    expect(response.body).toHaveProperty('reasons');
    expect(response.body).toHaveProperty('statuses');
  });

  it('should return types with labels', async () => {
    const response = await request(app).get('/api/reports/metadata');

    expect(Array.isArray(response.body.types)).toBe(true);
    expect(response.body.types.length).toBeGreaterThan(0);
    expect(response.body.types[0]).toHaveProperty('value');
    expect(response.body.types[0]).toHaveProperty('label');
    expect(response.body.types[0]).toHaveProperty('description');
  });

  it('should return reasons with labels', async () => {
    const response = await request(app).get('/api/reports/metadata');

    expect(Array.isArray(response.body.reasons)).toBe(true);
    expect(response.body.reasons.length).toBeGreaterThan(0);
    expect(response.body.reasons[0]).toHaveProperty('value');
    expect(response.body.reasons[0]).toHaveProperty('label');
    expect(response.body.reasons[0]).toHaveProperty('description');
  });

  it('should return statuses with labels', async () => {
    const response = await request(app).get('/api/reports/metadata');

    expect(Array.isArray(response.body.statuses)).toBe(true);
    expect(response.body.statuses.length).toBeGreaterThan(0);
    expect(response.body.statuses[0]).toHaveProperty('value');
    expect(response.body.statuses[0]).toHaveProperty('label');
    expect(response.body.statuses[0]).toHaveProperty('description');
  });

  it('should include all expected report types', async () => {
    const response = await request(app).get('/api/reports/metadata');

    const types = response.body.types.map((t: { value: string }) => t.value);
    expect(types).toContain('exam');
    expect(types).toContain('comment');
  });

  it('should include all expected report reasons', async () => {
    const response = await request(app).get('/api/reports/metadata');

    const reasons = response.body.reasons.map((r: { value: string }) => r.value);
    // Raisons pour commentaires
    expect(reasons).toContain('inappropriate_content');
    expect(reasons).toContain('spam');
    expect(reasons).toContain('off_topic');
    // Raisons pour examens
    expect(reasons).toContain('wrong_exam');
    expect(reasons).toContain('poor_quality');
    expect(reasons).toContain('duplicate');
    // Raison commune
    expect(reasons).toContain('other');
  });
});

describe('POST /api/reports', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await ReportModel.deleteMany({});
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
    expect(response.body.error).toContain('Invalid report type');
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
    expect(response.body.error).toContain('Invalid targetId (ObjectId)');
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
    expect(response.body.error).toContain('Invalid report reason');
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
    expect(response.body.error).toContain('Exam not found');
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
    expect(response.body.error).toContain('Comment not found');
  });

  it('should create report for exam', async () => {
    const { user, token } = await createAuthenticatedUser();

    // Créer un examen
    const exam = await Exam.create({
      title: 'Test Exam',
      year: 2024,
      module: 'Test',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body).toHaveProperty('id');

    // Vérifier que le signalement a été créé
    const report = await ReportModel.findById(response.body.id);
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
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body).toHaveProperty('id');

    const report = await ReportModel.findById(response.body.id);
    expect(report?.type).toBe('comment');
    expect(report?.targetId.toString()).toBe(answer._id.toString());
  });

  it('should reject duplicate report', async () => {
    const { user, token } = await createAuthenticatedUser();

    const exam = await Exam.create({
      title: 'Test',
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body.error).toContain('already reported');
  });
});

describe('GET /api/reports', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/reports');

    expect(response.status).toBe(401);
  });

  it('should forbid non-admin users', async () => {
    const { token } = await createAuthenticatedUser({ role: 'user' });

    const response = await request(app).get('/api/reports').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Admin access required');
  });

  it('should return reports list for admin', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: testEmail('admin'),
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: testEmail('user') });

    // Créer un examen et des signalements
    const exam = await Exam.create({
      title: 'Test',
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
      pages: 1,
      uploadedBy: user._id,
    });

    // Créer un autre examen pour éviter duplicate key
    const exam2 = await Exam.create({
      title: 'Test2',
      year: 2024,
      module: 'Test Module 2',
      fileKey: 'test2.pdf',
      fileSize: 1024,
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

    // Vérifier que les détails de la cible sont inclus
    const report = response.body.reports[0];
    expect(report).toHaveProperty('target');
    expect(report.target).toHaveProperty('exists');
    expect(report.target.exists).toBe(true);
    expect(report.target).toHaveProperty('title');
  });

  it('should filter reports by status', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: testEmail('admin2'),
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: testEmail('user2') });

    const exam = await Exam.create({
      title: 'Test',
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body.reports.every((r: { status: string }) => r.status === 'pending')).toBe(
      true
    );
  });

  it('should paginate results', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: testEmail('admin3'),
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
    app.use(errorHandler);
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
    const { token: adminToken } = await createAuthenticatedUser({
      email: testEmail('admin4'),
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: testEmail('user4') });

    const exam = await Exam.create({
      title: 'Test',
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body.error).toContain('Invalid action');
  });

  it('should approve and delete content', async () => {
    const { token: adminToken, user: _admin } = await createAuthenticatedUser({
      email: testEmail('admin5'),
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: testEmail('user5') });

    const exam = await Exam.create({
      title: 'Test',
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body.message).toContain('approved');

    // Vérifier que le signalement a été mis à jour
    const updatedReport = await ReportModel.findById(report._id);
    expect(updatedReport?.status).toBe('approved');
    expect(updatedReport?.reviewedBy?.toString()).toBe(_admin._id.toString());

    // Vérifier que l'examen a été supprimé
    const deletedExam = await Exam.findById(exam._id);
    expect(deletedExam).toBeNull();
  });

  it('should reject report', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: testEmail('admin6'),
      role: 'admin',
    });

    const { user } = await createAuthenticatedUser({ email: testEmail('user6') });

    const exam = await Exam.create({
      title: 'Test',
      year: 2024,
      module: 'Test Module',
      fileKey: 'test.pdf',
      fileSize: 1024,
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
    expect(response.body.message).toContain('rejected');

    // Vérifier que le signalement a été rejeté
    const updatedReport = await ReportModel.findById(report._id);
    expect(updatedReport?.status).toBe('rejected');

    // Vérifier que l'examen n'a PAS été supprimé
    const stillExistingExam = await Exam.findById(exam._id);
    expect(stillExistingExam).toBeTruthy();
  });
});
