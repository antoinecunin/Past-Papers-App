// Mock de pdf-lib pour les tests
export class PDFDocument {
  static async load(_buffer: Buffer | Uint8Array): Promise<PDFDocument> {
    return new PDFDocument();
  }

  getPageCount(): number {
    return 5; // Nombre de pages fictif pour les tests
  }
}