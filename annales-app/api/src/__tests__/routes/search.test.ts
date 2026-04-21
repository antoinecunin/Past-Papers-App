import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import type { Meilisearch } from 'meilisearch';
import { router as searchRouter } from '../../routes/search.js';
import { __setSearchClient } from '../../services/search.service.js';
import { Exam } from '../../models/Exam.js';
import { createAuthenticatedUser, testEmail } from '../helpers/auth.helper.js';
import { errorHandler } from '../../middleware/errorHandler.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFn = (...args: any[]) => any;

type IndexStub = {
  addDocuments: jest.Mock<AnyFn>;
  deleteDocuments: jest.Mock<AnyFn>;
  search: jest.Mock<AnyFn>;
  updateSettings: jest.Mock<AnyFn>;
};

function stubClient(searchImpl: (...args: unknown[]) => unknown) {
  const indexStub: IndexStub = {
    addDocuments: jest.fn<AnyFn>(() => Promise.resolve({ taskUid: 0 })),
    deleteDocuments: jest.fn<AnyFn>(() => Promise.resolve({ taskUid: 0 })),
    search: jest.fn<AnyFn>(searchImpl as AnyFn),
    updateSettings: jest.fn<AnyFn>(() => Promise.resolve({ taskUid: 0 })),
  };
  return {
    index: jest.fn<AnyFn>(() => indexStub),
    getIndex: jest.fn<AnyFn>(() => Promise.resolve({})),
    createIndex: jest.fn<AnyFn>(() => Promise.resolve({})),
    __index: indexStub,
  };
}

describe('GET /api/search', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/search', searchRouter);
    app.use(errorHandler);
  });

  afterEach(() => {
    __setSearchClient(null);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/search').query({ q: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects empty query', async () => {
    const { token } = await createAuthenticatedUser({
      email: testEmail('search-empty'),
    });
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: '  ' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid examId', async () => {
    const { token } = await createAuthenticatedUser({
      email: testEmail('search-badid'),
    });
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'hello', examId: 'not-an-objectid' });
    expect(res.status).toBe(400);
  });

  it('returns hits mapped to the API shape', async () => {
    const { token } = await createAuthenticatedUser({
      email: testEmail('search-ok'),
    });

    const client = stubClient(() =>
      Promise.resolve({
        hits: [
          {
            id: 'exam1-2',
            examId: 'exam1',
            examTitle: 'Final Exam M12',
            module: 'M12-ALGO',
            year: 2022,
            pageNumber: 2,
            text: 'Full text of page two about databases',
            _formatted: {
              text: 'Full text of page two about <em>databases</em>',
            },
          },
        ],
        estimatedTotalHits: 1,
      })
    );
    __setSearchClient(client as unknown as Meilisearch);

    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'databases' });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.results).toEqual([
      {
        examId: 'exam1',
        examTitle: 'Final Exam M12',
        module: 'M12-ALGO',
        year: 2022,
        pageNumber: 2,
        snippet: 'Full text of page two about <em>databases</em>',
      },
    ]);
    expect(client.__index.search).toHaveBeenCalledWith(
      'databases',
      expect.objectContaining({ limit: 20, offset: 0 })
    );
  });

  it('forwards examId filter and pagination', async () => {
    const { token } = await createAuthenticatedUser({
      email: testEmail('search-paging'),
    });
    const examObjectId = new Types.ObjectId().toString();

    const client = stubClient(() => Promise.resolve({ hits: [], estimatedTotalHits: 0 }));
    __setSearchClient(client as unknown as Meilisearch);

    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'foo', examId: examObjectId, limit: '5', offset: '10' });

    expect(res.status).toBe(200);
    expect(client.__index.search).toHaveBeenCalledWith(
      'foo',
      expect.objectContaining({
        limit: 5,
        offset: 10,
        filter: `examId = "${examObjectId}"`,
      })
    );
  });

  it('counts exams excluded because non-searchable', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: testEmail('search-excluded'),
    });
    await Exam.create({
      title: 'Scanned',
      year: 2024,
      module: 'M99',
      fileKey: 'annales/2024/scan.pdf',
      fileSize: 100,
      pages: 1,
      searchable: false,
      uploadedBy: user._id,
    });
    await Exam.create({
      title: 'OK',
      year: 2024,
      module: 'M99',
      fileKey: 'annales/2024/ok.pdf',
      fileSize: 100,
      pages: 1,
      searchable: true,
      uploadedBy: user._id,
    });

    __setSearchClient(
      stubClient(() =>
        Promise.resolve({ hits: [], estimatedTotalHits: 0 })
      ) as unknown as Meilisearch
    );

    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'anything' });

    expect(res.status).toBe(200);
    expect(res.body.scannedExamsExcluded).toBe(1);
  });

  it('returns 503 when Meili is down', async () => {
    const { token } = await createAuthenticatedUser({
      email: testEmail('search-down'),
    });

    __setSearchClient(
      stubClient(() => Promise.reject(new Error('meili unreachable'))) as unknown as Meilisearch
    );

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'foo' });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('Search engine');
    warnSpy.mockRestore();
  });
});
