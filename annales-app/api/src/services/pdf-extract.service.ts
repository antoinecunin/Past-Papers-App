import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const MIN_CHARS_PER_PAGE_FOR_SEARCHABLE = 50;
const MAX_LOW_TEXT_RATIO = 0.5;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  pages: ExtractedPage[];
  searchable: boolean;
}

/**
 * Extract text per page from a PDF buffer. A PDF is flagged non-searchable
 * when more than half its pages have negligible extractable text — a
 * reliable heuristic for scanned documents where text lives in images.
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  const data = new Uint8Array(buffer);
  const loadingTask = getDocument({
    data,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;

  try {
    const pages: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pages.push({ pageNumber, text });
      page.cleanup();
    }

    const lowTextPages = pages.filter(
      p => p.text.length < MIN_CHARS_PER_PAGE_FOR_SEARCHABLE
    ).length;
    const searchable = pages.length > 0 && lowTextPages / pages.length < MAX_LOW_TEXT_RATIO;

    return { pages, searchable };
  } finally {
    await doc.cleanup();
    await doc.destroy();
  }
}
