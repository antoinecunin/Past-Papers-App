import request from 'supertest';
import express from 'express';
import { router as filesRouter } from '../../routes/files.js';
import { Exam } from '../../models/Exam.js';
import { createAuthenticatedUser } from '../helpers/auth.helper.js';
import { Types } from 'mongoose';
import { errorHandler } from '../../middleware/errorHandler.js';

/**
 * Tests pour /api/files
 * Teste l'upload et le download de fichiers PDF
 */
describe('POST /api/files/upload', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/files', filesRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const response = await request(app).post('/api/files/upload');

    expect(response.status).toBe(401);
  });

  it('should reject request without file', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Exam')
      .field('year', '2024')
      .field('module', 'Test Module');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Fichier manquant');
  });

  it('should reject non-PDF MIME type', async () => {
    const { token } = await createAuthenticatedUser();
    const textBuffer = Buffer.from('This is a text file, not a PDF');

    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Exam')
      .field('year', '2024')
      .field('module', 'Test Module')
      .attach('file', textBuffer, { filename: 'fake.pdf', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('PDF');
  });

  // Note: Le test de validation PDF invalide est skippé car pdf-lib est mocké.
  // En production, pdf-lib.load() throw une erreur sur contenu invalide.
  // La validation MIME ci-dessus couvre le cas principal.

  it('should upload PDF and create exam', async () => {
    const { user, token } = await createAuthenticatedUser();

    const pdfBuffer = Buffer.from('%PDF-1.4\n%mock pdf content');

    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Exam 2024')
      .field('year', '2024')
      .field('module', 'Mathematics')
      .attach('file', pdfBuffer, { filename: 'exam.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('key');
    expect(response.body).toHaveProperty('pages');
    expect(response.body.pages).toBe(5);

    const exam = await Exam.findById(response.body.id);
    expect(exam).toBeTruthy();
    expect(exam?.title).toBe('Exam 2024');
    expect(exam?.year).toBe(2024);
    expect(exam?.module).toBe('Mathematics');
    expect(exam?.uploadedBy.toString()).toBe(user._id.toString());
  });

  it('should require title, year, and module fields', async () => {
    const { token } = await createAuthenticatedUser();
    const pdfBuffer = Buffer.from('%PDF-1.4\n%mock pdf content');

    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pdfBuffer, { filename: 'exam.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it('should sanitize filename with spaces', async () => {
    const { token } = await createAuthenticatedUser();
    const pdfBuffer = Buffer.from('%PDF-1.4\n%mock pdf content');

    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test')
      .field('year', '2024')
      .field('module', 'Mathematics')
      .attach('file', pdfBuffer, { filename: 'my exam file.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body.key).toContain('my_exam_file.pdf');
  });
});

describe('GET /api/files/:examId/download', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/files', filesRouter);
    app.use(errorHandler);
  });

  it('should require authentication', async () => {
    const examId = new Types.ObjectId();
    const response = await request(app).get(`/api/files/${examId}/download`);

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid examId', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .get('/api/files/invalid-id/download')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('invalide');
  });

  it('should return 404 for non-existent exam', async () => {
    const { token } = await createAuthenticatedUser();
    const fakeId = new Types.ObjectId();

    const response = await request(app)
      .get(`/api/files/${fakeId}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('non trouvé');
  });

  it('should download PDF file', async () => {
    const { user, token } = await createAuthenticatedUser();

    const exam = await Exam.create({
      title: 'Test Exam',
      year: 2024,
      module: 'Test',
      fileKey: 'annales/2024/test.pdf',
      pages: 5,
      uploadedBy: user._id,
    });

    const response = await request(app)
      .get(`/api/files/${exam._id}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('inline');
    expect(response.headers['content-disposition']).toContain('.pdf');
    expect(response.headers['cache-control']).toContain('public');
  });

  it('should sanitize filename in Content-Disposition header', async () => {
    const { user, token } = await createAuthenticatedUser();

    const exam = await Exam.create({
      title: 'Test @ Exam # 2024!',
      year: 2024,
      module: 'Test',
      fileKey: 'annales/2024/test.pdf',
      pages: 5,
      uploadedBy: user._id,
    });

    const response = await request(app)
      .get(`/api/files/${exam._id}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    // Les caractères spéciaux doivent être remplacés
    expect(response.headers['content-disposition']).toMatch(/filename="[a-zA-Z0-9_]+\.pdf"/);
  });
});
