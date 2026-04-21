import { jest } from '@jest/globals';
import type { Meilisearch } from 'meilisearch';
import {
  __setSearchClient,
  ensureIndex,
  indexExam,
  removeExam,
  search,
} from '../../services/search.service.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFn = (...args: any[]) => any;
type IndexStub = {
  addDocuments: jest.Mock<AnyFn>;
  deleteDocuments: jest.Mock<AnyFn>;
  search: jest.Mock<AnyFn>;
  updateSettings: jest.Mock<AnyFn>;
};

type ClientStub = {
  index: jest.Mock<AnyFn>;
  getIndex: jest.Mock<AnyFn>;
  createIndex: jest.Mock<AnyFn>;
  __index: IndexStub;
};

function buildClient(): ClientStub {
  const indexStub: IndexStub = {
    addDocuments: jest.fn<AnyFn>(() => Promise.resolve({ taskUid: 1 })),
    deleteDocuments: jest.fn<AnyFn>(() => Promise.resolve({ taskUid: 2 })),
    search: jest.fn<AnyFn>(() => Promise.resolve({ hits: [], estimatedTotalHits: 0 })),
    updateSettings: jest.fn<AnyFn>(() => Promise.resolve({ taskUid: 3 })),
  };
  return {
    index: jest.fn<AnyFn>(() => indexStub),
    getIndex: jest.fn<AnyFn>(() => Promise.resolve({})),
    createIndex: jest.fn<AnyFn>(() => Promise.resolve({})),
    __index: indexStub,
  };
}

describe('searchService', () => {
  let client: ClientStub;

  beforeEach(() => {
    client = buildClient();
    __setSearchClient(client as unknown as Meilisearch);
  });

  afterEach(() => {
    __setSearchClient(null);
  });

  describe('ensureIndex', () => {
    it('configures searchable and filterable attributes', async () => {
      await ensureIndex();
      expect(client.__index.updateSettings).toHaveBeenCalledWith({
        searchableAttributes: ['text', 'examTitle'],
        filterableAttributes: ['examId', 'module', 'year'],
        sortableAttributes: ['year', 'pageNumber'],
      });
    });

    it('creates the index if it does not exist', async () => {
      client.getIndex.mockRejectedValueOnce(new Error('not found'));
      await ensureIndex();
      expect(client.createIndex).toHaveBeenCalledWith(
        'papers',
        expect.objectContaining({ primaryKey: 'id' })
      );
    });

    it('skips creation when the index already exists', async () => {
      await ensureIndex();
      expect(client.createIndex).not.toHaveBeenCalled();
    });
  });

  describe('indexExam', () => {
    const metadata = {
      examId: 'abc',
      examTitle: 'Final Exam M12',
      module: 'M12-ALGO',
      year: 2022,
    };

    it('upserts one document per page with composite id', async () => {
      await indexExam(metadata, [
        { pageNumber: 1, text: 'page one text' },
        { pageNumber: 2, text: 'page two text' },
      ]);
      expect(client.__index.addDocuments).toHaveBeenCalledWith([
        {
          id: 'abc-1',
          examId: 'abc',
          pageNumber: 1,
          text: 'page one text',
          examTitle: 'Final Exam M12',
          module: 'M12-ALGO',
          year: 2022,
        },
        {
          id: 'abc-2',
          examId: 'abc',
          pageNumber: 2,
          text: 'page two text',
          examTitle: 'Final Exam M12',
          module: 'M12-ALGO',
          year: 2022,
        },
      ]);
    });

    it('does nothing when there are no pages', async () => {
      await indexExam(metadata, []);
      expect(client.__index.addDocuments).not.toHaveBeenCalled();
    });

    it('swallows Meili errors and logs a warning', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      client.__index.addDocuments.mockRejectedValueOnce(new Error('meili down'));
      await expect(indexExam(metadata, [{ pageNumber: 1, text: 'x' }])).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('meili down'));
      warnSpy.mockRestore();
    });
  });

  describe('removeExam', () => {
    it('deletes documents filtered by examId', async () => {
      await removeExam('abc');
      expect(client.__index.deleteDocuments).toHaveBeenCalledWith({
        filter: 'examId = "abc"',
      });
    });

    it('swallows Meili errors and logs a warning', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      client.__index.deleteDocuments.mockRejectedValueOnce(new Error('meili down'));
      await expect(removeExam('abc')).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('meili down'));
      warnSpy.mockRestore();
    });
  });

  describe('search', () => {
    it('forwards defaults and returns hits plus total', async () => {
      client.__index.search.mockResolvedValueOnce({
        hits: [{ id: 'abc-1', text: 'foo', examId: 'abc' }],
        estimatedTotalHits: 1,
      });
      const res = await search('foo');
      expect(client.__index.search).toHaveBeenCalledWith(
        'foo',
        expect.objectContaining({
          limit: 20,
          offset: 0,
          filter: undefined,
          attributesToHighlight: ['text'],
        })
      );
      expect(res.hits).toHaveLength(1);
      expect(res.estimatedTotalHits).toBe(1);
    });

    it('scopes the search when examId is given', async () => {
      await search('foo', { examId: 'abc' });
      expect(client.__index.search).toHaveBeenCalledWith(
        'foo',
        expect.objectContaining({ filter: 'examId = "abc"' })
      );
    });

    it('propagates errors from Meili', async () => {
      client.__index.search.mockRejectedValueOnce(new Error('boom'));
      await expect(search('foo')).rejects.toThrow('boom');
    });
  });
});
