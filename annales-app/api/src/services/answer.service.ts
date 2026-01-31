import { Types } from 'mongoose';
import { AnswerModel, Answer, AnswerContent } from '../models/Answer.js';
import { UserModel } from '../models/User.js';
import { ServiceError } from './ServiceError.js';

export interface AuthorInfo {
  firstName: string;
  lastName: string;
}

export type AnswerWithAuthor = Answer & { replyCount: number; author: AuthorInfo | null };
export type ReplyWithAuthor = Answer & { author: AuthorInfo | null };

export interface CreateAnswerData {
  examId: string;
  page: number;
  yTop: number;
  content: AnswerContent;
  authorId: string;
  parentId?: string;
}

export interface UpdateAnswerData {
  content: AnswerContent;
}

class AnswerService {
  /**
   * Liste les commentaires racines d'un examen (optionnellement filtrés par page)
   * Retourne uniquement les commentaires sans parentId, avec un replyCount
   */
  async findByExam(examId: string, page?: number): Promise<AnswerWithAuthor[]> {
    const filter: Record<string, unknown> = { examId, parentId: null };
    if (page) {
      filter.page = page;
    }

    const answers = await AnswerModel.find(filter).sort({ page: 1, yTop: 1, createdAt: 1 }).lean();

    // Compter les réponses pour chaque commentaire racine
    const answerIds = answers.map(a => a._id);
    const replyCounts = await AnswerModel.aggregate([
      { $match: { parentId: { $in: answerIds } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);

    const replyCountMap = new Map<string, number>();
    for (const rc of replyCounts) {
      replyCountMap.set(rc._id.toString(), rc.count);
    }

    // Batch lookup des auteurs
    const authorMap = await this.buildAuthorMap(answers);

    return answers.map(a => ({
      ...a,
      replyCount: replyCountMap.get(a._id.toString()) || 0,
      author: a.authorId ? authorMap.get(a.authorId.toString()) ?? null : null,
    })) as AnswerWithAuthor[];
  }

  /**
   * Retourne les réponses d'un commentaire racine, paginées par curseur
   */
  async findReplies(
    parentId: string,
    cursor?: string,
    limit = 10
  ): Promise<{ replies: ReplyWithAuthor[]; hasMore: boolean }> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw ServiceError.badRequest('ID invalide');
    }

    const parent = await AnswerModel.findById(parentId);
    if (!parent) {
      throw ServiceError.notFound('Commentaire non trouvé');
    }

    const filter: Record<string, unknown> = { parentId: new Types.ObjectId(parentId) };
    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $gt: new Types.ObjectId(cursor) };
    }

    const replies = await AnswerModel.find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasMore = replies.length > limit;
    if (hasMore) {
      replies.pop();
    }

    // Batch lookup des auteurs
    const authorMap = await this.buildAuthorMap(replies);

    return {
      replies: replies.map(r => ({
        ...r,
        author: r.authorId ? authorMap.get(r.authorId.toString()) ?? null : null,
      })) as ReplyWithAuthor[],
      hasMore,
    };
  }

  /**
   * Crée un nouveau commentaire ou une réponse
   */
  async create(data: CreateAnswerData): Promise<{ id: string }> {
    const { examId, page, yTop, content, authorId, parentId } = data;

    // Validation du parent si c'est une réponse
    if (parentId) {
      const parent = await AnswerModel.findById(parentId);
      if (!parent) {
        throw ServiceError.notFound('Commentaire parent non trouvé');
      }

      // Pas de réponse à une réponse (un seul niveau de nesting)
      if (parent.parentId) {
        throw ServiceError.badRequest(
          'Impossible de répondre à une réponse (un seul niveau autorisé)'
        );
      }

      // Le parent doit appartenir au même examen
      if (parent.examId.toString() !== examId) {
        throw ServiceError.badRequest("Le commentaire parent n'appartient pas au même examen");
      }
    }

    const docData = {
      examId,
      page,
      yTop,
      authorId,
      parentId: parentId || null,
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
   * Supprime un commentaire (et ses réponses si c'est un commentaire racine)
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

    // Cascade delete des réponses si c'est un commentaire racine
    if (!existingAnswer.parentId) {
      await AnswerModel.deleteMany({ parentId: existingAnswer._id });
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

  /**
   * Construit une map authorId → { firstName, lastName } à partir d'une liste de documents
   */
  private async buildAuthorMap(
    docs: Array<{ authorId?: Types.ObjectId | null }>
  ): Promise<Map<string, AuthorInfo>> {
    const authorIds = [
      ...new Set(docs.map(d => d.authorId?.toString()).filter(Boolean)),
    ] as string[];

    if (!authorIds.length) return new Map();

    const authors = await UserModel.find({ _id: { $in: authorIds } })
      .select('firstName lastName')
      .lean();

    return new Map(
      authors.map(u => [u._id.toString(), { firstName: u.firstName, lastName: u.lastName }])
    );
  }
}

export const answerService = new AnswerService();
