import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { extractPdfText } from '../../services/pdf-extract.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '..', 'fixtures', 'pdfs');

const loadFixture = (name: string): Buffer => readFileSync(join(FIXTURES, name));

describe('extractPdfText', () => {
  it('extracts text from every page of a text PDF', async () => {
    const result = await extractPdfText(loadFixture('text-3pages.pdf'));

    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].text).toContain('databases');
    expect(result.pages[2].text).toContain('Page three');
    expect(result.searchable).toBe(true);
  });

  it('flags a PDF as non-searchable when most pages have no text', async () => {
    const result = await extractPdfText(loadFixture('scan-3pages.pdf'));

    expect(result.pages).toHaveLength(3);
    expect(result.pages.every(p => p.text.length < 50)).toBe(true);
    expect(result.searchable).toBe(false);
  });

  it('stays searchable when enough pages carry real text', async () => {
    // 3 pages with text, 2 without → 40% low-text, below the 50% threshold
    const result = await extractPdfText(loadFixture('mixed-searchable-5pages.pdf'));

    expect(result.pages).toHaveLength(5);
    expect(result.searchable).toBe(true);
  });

  it('flags as non-searchable when text-bearing pages are a minority', async () => {
    // 2 pages with text, 3 without → 60% low-text, above the 50% threshold
    const result = await extractPdfText(loadFixture('mixed-scan-5pages.pdf'));

    expect(result.pages).toHaveLength(5);
    expect(result.searchable).toBe(false);
  });

  it('numbers pages starting from 1', async () => {
    const result = await extractPdfText(loadFixture('text-3pages.pdf'));

    expect(result.pages.map(p => p.pageNumber)).toEqual([1, 2, 3]);
  });
});
