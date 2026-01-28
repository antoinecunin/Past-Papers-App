import { Types } from 'mongoose';
import { AnswerModel, Answer, AnswerContent } from '../models/Answer.js';
import { ServiceError } from './ServiceError.js';

export interface CreateAnswerData {
  examId: string;
  page: number;
  yTop: number;
  content: AnswerContent;
  authorId: string;
}

export interface UpdateAnswerData {
  content: AnswerContent;
}

class AnswerService {
  /**
   * Liste les commentaires d'un examen (optionnellement filtrés par page)
   */
  async findByExam(examId: string, page?: number): Promise<Answer[]> {
    const filter: { examId: string; page?: number } = { examId };
    if (page) {
      filter.page = page;
    }

    const answers = await AnswerModel.find(filter)
      .sort({ page: 1, yTop: 1, createdAt: 1 })
      .lean();

    return answers as Answer[];
  }

  /**
   * Crée un nouveau commentaire
   */
  async create(data: CreateAnswerData): Promise<{ id: string }> {
    const { examId, page, yTop, content, authorId } = data;

    const docData = {
      examId,
      page,
      yTop,
      authorId,
      content: {
        type: content.type,
        data: content.data.trim(),
        ...(content.rendered && { rendered: content.rendered }),
      },
    };

    const doc = await AnswerModel.create(docData);
    return { id: doc._id.toString() };
  }

  /**
   * Met à jour un commentaire existant
   * @param id - ID du commentaire
   * @param data - Nouvelles données
   * @param userId - ID de l'utilisateur effectuant la modification
   */
  async update(id: string, data: UpdateAnswerData, userId: string): Promise<Answer> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('ID invalide');
    }

    const existingAnswer = await AnswerModel.findById(id);
    if (!existingAnswer) {
      throw ServiceError.notFound('Commentaire non trouvé');
    }

    // Seul le propriétaire peut modifier (pas les admins)
    const isOwner = existingAnswer.authorId?.toString() === userId;
    if (!isOwner) {
      throw ServiceError.forbidden('Vous ne pouvez modifier que vos propres commentaires');
    }

    const { content } = data;
    const updateData = {
      content: {
        type: content.type,
        data: content.data.trim(),
        ...(content.rendered && { rendered: content.rendered }),
      },
    };

    const doc = await AnswerModel.findByIdAndUpdate(id, updateData, { new: true });
    return doc as Answer;
  }

  /**
   * Supprime un commentaire
   * @param id - ID du commentaire
   * @param userId - ID de l'utilisateur effectuant la suppression
   * @param isAdmin - Si l'utilisateur est admin
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('ID invalide');
    }

    const existingAnswer = await AnswerModel.findById(id);
    if (!existingAnswer) {
      throw ServiceError.notFound('Commentaire non trouvé');
    }

    // Propriétaire ou admin peut supprimer
    const isOwner = existingAnswer.authorId?.toString() === userId;
    if (!isOwner && !isAdmin) {
      throw ServiceError.forbidden('Vous ne pouvez supprimer que vos propres commentaires');
    }

    await AnswerModel.findByIdAndDelete(id);
  }

  /**
   * Supprime tous les commentaires d'un examen
   * (Utilisé lors de la suppression d'un examen via report)
   */
  async deleteByExamId(examId: Types.ObjectId): Promise<number> {
    const result = await AnswerModel.deleteMany({ examId });
    return result.deletedCount;
  }
}

export const answerService = new AnswerService();
