// Maintenance script: regenerate PDF fixtures used by pdf-extract.service tests.
// Run with: npx tsx api/scripts/generate-test-pdfs.ts

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_DIR = resolve(__dirname, '..', 'src', '__tests__', 'fixtures', 'pdfs');

const SAMPLE_TEXT =
  'This is a long exam question about databases. Explain the differences between normalization and denormalization, and provide concrete examples for each approach.';

async function build(pageTexts: (string | null)[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = pdf.addPage([595, 842]);
    if (text === null) {
      page.drawRectangle({
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        color: rgb(0.8, 0.8, 0.8),
      });
    } else {
      page.drawText(text, { x: 50, y: 780, size: 12, font, maxWidth: 500 });
    }
  }
  return pdf.save();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const fixtures: Record<string, (string | null)[]> = {
    'text-3pages.pdf': [
      `${SAMPLE_TEXT} Page one.`,
      `${SAMPLE_TEXT} Page two.`,
      `${SAMPLE_TEXT} Page three.`,
    ],
    'scan-3pages.pdf': [null, null, null],
    'mixed-searchable-5pages.pdf': [
      SAMPLE_TEXT,
      SAMPLE_TEXT,
      SAMPLE_TEXT,
      null,
      null,
    ],
    'mixed-scan-5pages.pdf': [SAMPLE_TEXT, SAMPLE_TEXT, null, null, null],
  };

  for (const [name, pages] of Object.entries(fixtures)) {
    const bytes = await build(pages);
    writeFileSync(join(OUT_DIR, name), bytes);
    console.log(`Wrote ${name} (${bytes.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
