import request from 'supertest';
import express from 'express';
import { router as healthRouter } from '../../routes/health.js';

/**
 * Tests pour /api/health
 * FIRST: Fast, Independent, Repeatable, Self-validating, Timely
 */
describe('GET /api/health', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/api/health', healthRouter);
  });

  // F: Fast - Le test s'exécute rapidement sans dépendances externes
  // I: Independent - Ne dépend d'aucun autre test
  // R: Repeatable - Peut être exécuté plusieurs fois avec le même résultat
  // S: Self-validating - Le test se valide lui-même avec des assertions
  // T: Timely - Testé avant le déploiement
  it('should return 200 with ok:true', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('should return JSON content-type', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('should not require authentication', async () => {
    // Health endpoint doit être accessible sans auth pour le monitoring
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
  });
});