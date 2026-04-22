import { Meilisearch } from 'meilisearch';
import type { ExtractedPage } from './pdf-extract.service.js';
import { escapeMeiliFilter } from '../utils/meili-filter.js';

const INDEX_NAME = process.env.MEILI_INDEX || 'papers';
const MEILI_HOST = process.env.MEILI_HOST || 'http://meili:7700';
const MEILI_MASTER_KEY = process.env.MEILI_MASTER_KEY || '';

export interface ExamIndexMetadata {
  examId: string;
  examTitle: string;
  module: string;
  year: number;
}

export interface SearchHit {
  id: string;
  examId: string;
  examTitle: string;
  module: string;
  year: number;
  pageNumber: number;
  text: string;
  _formatted?: { text: string };
}

export interface SearchResponse {
  hits: SearchHit[];
  estimatedTotalHits: number;
}

export interface SearchOptions {
  examId?: string;
  limit?: number;
  offset?: number;
}

let clientOverride: Meilisearch | null = null;
let clientSingleton: Meilisearch | null = null;

function getClient(): Meilisearch {
  if (clientOverride) return clientOverride;
  if (!clientSingleton) {
    clientSingleton = new Meilisearch({
      host: MEILI_HOST,
      apiKey: MEILI_MASTER_KEY,
    });
  }
  return clientSingleton;
}

// Test hook: inject a fake client or reset to the real one.
export function __setSearchClient(c: Meilisearch | null): void {
  clientOverride = c;
}

/**
 * Create the index if missing and ensure searchable/filterable attributes
 * are configured. Safe to call repeatedly — Meili dedupes settings updates.
 */
export async function ensureIndex(): Promise<void> {
  const client = getClient();
  try {
    await client.getIndex(INDEX_NAME);
  } catch {
    await client.createIndex(INDEX_NAME, { primaryKey: 'id' });
  }
  await client.index(INDEX_NAME).updateSettings({
    searchableAttributes: ['text', 'examTitle'],
    filterableAttributes: ['examId', 'module', 'year'],
    sortableAttributes: ['year', 'pageNumber'],
  });
}

/**
 * Upsert pages of an exam into the index. Failures are logged but swallowed
 * so a search outage never blocks the upload flow — a backfill reconciles later.
 */
export async function indexExam(
  metadata: ExamIndexMetadata,
  pages: ExtractedPage[]
): Promise<void> {
  if (pages.length === 0) return;
  const docs = pages.map(p => ({
    id: `${metadata.examId}-${p.pageNumber}`,
    examId: metadata.examId,
    pageNumber: p.pageNumber,
    text: p.text,
    examTitle: metadata.examTitle,
    module: metadata.module,
    year: metadata.year,
  }));
  try {
    await getClient().index(INDEX_NAME).addDocuments(docs);
  } catch (err) {
    console.warn(`[search] failed to index exam ${metadata.examId}: ${(err as Error).message}`);
  }
}

/**
 * Remove every document that belongs to an exam. Same fire-and-forget
 * contract as indexExam so the delete flow cannot be blocked by Meili.
 */
export async function removeExam(examId: string): Promise<void> {
  try {
    await getClient()
      .index(INDEX_NAME)
      .deleteDocuments({ filter: `examId = ${escapeMeiliFilter(examId)}` });
  } catch (err) {
    console.warn(`[search] failed to remove exam ${examId}: ${(err as Error).message}`);
  }
}

/**
 * Run a search. Unlike the indexing helpers this throws on error — the
 * caller (search route) needs to surface the failure to the client.
 */
export async function search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const filters: string[] = [];
  if (options.examId) filters.push(`examId = ${escapeMeiliFilter(options.examId)}`);
  const result = await getClient()
    .index(INDEX_NAME)
    .search<SearchHit>(query, {
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      // Highlight in the full text; the API layer trims around the first match
      // to the nearest sentence boundary rather than relying on Meili's word-based crop.
      attributesToHighlight: ['text'],
    });
  return {
    hits: result.hits,
    estimatedTotalHits: result.estimatedTotalHits ?? 0,
  };
}
