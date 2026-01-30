import { Types } from 'mongoose';
import { IExam } from '../../models/Exam.js';

/**
 * Crée un objet Exam pour les tests
 */
export function createExamData(
  overrides: Partial<IExam> = {}
): Omit<IExam, '_id' | 'createdAt' | 'updatedAt'> {
  return {
    title: 'Test Exam',
    year: 2024,
    module: 'TEST-MODULE',
    fileKey: 'annales/2024/test-exam.pdf',
    pages: 5,
    uploadedBy: new Types.ObjectId(),
    ...overrides,
  };
}

/**
 * Génère un buffer PDF minimal valide pour les tests
 */
export function createMockPdfBuffer(): Buffer {
  // PDF minimal valide
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
190
%%EOF`;

  return Buffer.from(pdfContent, 'utf-8');
}
