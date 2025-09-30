import request from 'supertest';
import express from 'express';
import { router as examsRouter } from '../../routes/exams.js';
import { Exam as ExamModel } from '../../models/Exam.js';
import { AnswerModel } from '../../models/Answer.js';
import { createAuthenticatedUser } from '../helpers/auth.helper.js';
import { createExamData } from '../fixtures/exam.fixture.js';
import { Types } from 'mongoose';

/**
 * Tests pour /api/exams
 * Teste l'authentification, l'autorisation et la logique métier
 */
describe('GET /api/exams', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/exams', examsRouter);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/exams');

    expect(response.status).toBe(401);
  });

  it('should return empty array when no exams', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return all exams sorted by creation date', async () => {
    const { user, token } = await createAuthenticatedUser();

    // Créer plusieurs examens avec délai pour garantir l'ordre de création
    const exam1 = await ExamModel.create(
      createExamData({ title: 'Exam 1', year: 2024, uploadedBy: user._id })
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    const exam2 = await ExamModel.create(
      createExamData({ title: 'Exam 2', year: 2023, uploadedBy: user._id })
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    const exam3 = await ExamModel.create(
      createExamData({ title: 'Exam 3', year: 2022, uploadedBy: user._id })
    );

    const response = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    // Vérifie le tri par date de création décroissant (plus récent en premier)
    expect(response.body[0].title).toBe('Exam 3');
  });

  it('should include all exam fields', async () => {
    const { user, token } = await createAuthenticatedUser();

    await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const response = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${token}`);

    const exam = response.body[0];
    expect(exam).toHaveProperty('_id');
    expect(exam).toHaveProperty('title');
    expect(exam).toHaveProperty('year');
    expect(exam).toHaveProperty('module');
    expect(exam).toHaveProperty('fileKey');
    expect(exam).toHaveProperty('pages');
    expect(exam).toHaveProperty('uploadedBy');
    expect(exam).toHaveProperty('createdAt');
    expect(exam).toHaveProperty('updatedAt');
  });
});

describe('GET /api/exams/:id', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/exams', examsRouter);
  });

  it('should require authentication', async () => {
    const examId = new Types.ObjectId();
    const response = await request(app).get(`/api/exams/${examId}`);

    expect(response.status).toBe(401);
  });

  it('should return exam by id', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const response = await request(app)
      .get(`/api/exams/${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(exam._id.toString());
    expect(response.body.title).toBe(exam.title);
  });

  it('should return 400 for invalid ObjectId', async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .get('/api/exams/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ID invalide');
  });

  it('should return 404 for non-existent exam', async () => {
    const { token } = await createAuthenticatedUser();
    const fakeId = new Types.ObjectId();

    const response = await request(app)
      .get(`/api/exams/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Examen non trouvé');
  });
});

describe('DELETE /api/exams/:id', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/exams', examsRouter);
  });

  it('should require authentication', async () => {
    const examId = new Types.ObjectId();
    const response = await request(app).delete(`/api/exams/${examId}`);

    expect(response.status).toBe(401);
  });

  it('should allow owner to delete their exam', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const response = await request(app)
      .delete(`/api/exams/${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('supprimé');

    // Vérifier que l'examen a été supprimé
    const deletedExam = await ExamModel.findById(exam._id);
    expect(deletedExam).toBeNull();
  });

  it('should allow admin to delete any exam', async () => {
    const { user } = await createAuthenticatedUser();
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'admin@etu.unistra.fr',
      role: 'admin',
    });

    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const response = await request(app)
      .delete(`/api/exams/${exam._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const deletedExam = await ExamModel.findById(exam._id);
    expect(deletedExam).toBeNull();
  });

  it('should forbid non-owner non-admin from deleting exam', async () => {
    const { user } = await createAuthenticatedUser({ email: 'owner@etu.unistra.fr' });
    const { token: otherToken } = await createAuthenticatedUser({ email: 'other@etu.unistra.fr' });

    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    const response = await request(app)
      .delete(`/api/exams/${exam._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('propres examens');

    // Vérifier que l'examen n'a pas été supprimé
    const stillExists = await ExamModel.findById(exam._id);
    expect(stillExists).toBeTruthy();
  });

  it('should delete associated answers when deleting exam', async () => {
    const { user, token } = await createAuthenticatedUser();
    const exam = await ExamModel.create(createExamData({ uploadedBy: user._id }));

    // Créer des réponses associées
    await AnswerModel.create([
      {
        examId: exam._id,
        page: 1,
        yTop: 0.5,
        content: { type: 'text', data: 'Answer 1' },
        authorId: user._id,
      },
      {
        examId: exam._id,
        page: 2,
        yTop: 0.3,
        content: { type: 'text', data: 'Answer 2' },
        authorId: user._id,
      },
    ]);

    await request(app)
      .delete(`/api/exams/${exam._id}`)
      .set('Authorization', `Bearer ${token}`);

    // Vérifier que les réponses ont été supprimées
    const remainingAnswers = await AnswerModel.find({ examId: exam._id });
    expect(remainingAnswers).toHaveLength(0);
  });

  it('should return 404 for non-existent exam', async () => {
    const { token } = await createAuthenticatedUser();
    const fakeId = new Types.ObjectId();

    const response = await request(app)
      .delete(`/api/exams/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});