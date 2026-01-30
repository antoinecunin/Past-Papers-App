import { Types } from 'mongoose';
import { Answer } from '../../models/Answer.js';

/**
 * Crée un objet Answer pour les tests
 */
export function createAnswerData(
  overrides: Partial<Answer> = {}
): Omit<Answer, '_id' | 'createdAt' | 'updatedAt'> {
  return {
    examId: new Types.ObjectId(),
    page: 1,
    yTop: 0.5,
    content: {
      type: 'text',
      data: 'Test comment',
    },
    authorId: new Types.ObjectId(),
    ...overrides,
  };
}

/**
 * Crée un commentaire LaTeX pour les tests
 */
export function createLatexAnswerData(examId: Types.ObjectId, authorId: Types.ObjectId) {
  return createAnswerData({
    examId,
    authorId,
    content: {
      type: 'latex',
      data: '\\int_0^1 x^2 dx',
      rendered: '<span>LaTeX rendered</span>',
    },
  });
}
