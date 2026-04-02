import { Types } from 'mongoose';
import { AnswerModel, Answer, AnswerContent } from '../models/Answer.js';
import { UserModel } from '../models/User.js';
import { ServiceError } from './ServiceError.js';
import { voteService } from './vote.service.js';
import { imageService } from './image.service.js';
import { isValidImageKey } from '../constants/content.js';

export interface AuthorInfo {
  firstName: string;
  lastName: string;
}

export type AnswerWithAuthor = Answer & {
  replyCount: number;
  author: AuthorInfo | null;
  userVote: number | null;
};
export type ReplyWithAuthor = Answer & {
  author: AuthorInfo | null;
  mentionedAuthor: AuthorInfo | null;
  userVote: number | null;
};

export interface CreateAnswerData {
  examId: string;
  page: number;
  yTop: number;
  content: AnswerContent;
  authorId: string;
  parentId?: string;
  mentionedUserId?: string;
}

export interface UpdateAnswerData {
  content: AnswerContent;
}

class AnswerService {
  /**
   * Liste les commentaires racines d'un examen (optionnellement filtrés par page)
   * Retourne uniquement les commentaires sans parentId, avec un replyCount
   */
  async findByExam(examId: string, page?: number, userId?: string): Promise<AnswerWithAuthor[]> {
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

    // Batch lookup des auteurs + votes utilisateur
    const authorMap = await this.buildAuthorMap(answers);
    const voteMap = userId ? await voteService.getUserVotes(answerIds, userId) : new Map();

    return answers.map(a => ({
      ...a,
      replyCount: replyCountMap.get(a._id.toString()) || 0,
      author: a.authorId ? authorMap.get(a.authorId.toString()) ?? null : null,
      userVote: voteMap.get(a._id.toString()) ?? null,
    })) as AnswerWithAuthor[];
  }

  /**
   * Retourne les réponses d'un commentaire racine, paginées par curseur
   */
  async findReplies(
    parentId: string,
    cursor?: string,
    limit = 10,
    userId?: string
  ): Promise<{ replies: ReplyWithAuthor[]; hasMore: boolean }> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw ServiceError.badRequest('Invalid ID');
    }

    const parent = await AnswerModel.findById(parentId);
    if (!parent) {
      throw ServiceError.notFound('Comment not found');
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

    // Batch lookup des auteurs + mentionedUserIds + votes utilisateur
    const mentionedUserIds = replies
      .map(r => r.mentionedUserId)
      .filter((id): id is Types.ObjectId => id != null);
    const allUserDocs = [...replies, ...mentionedUserIds.map(id => ({ authorId: id }))];
    const authorMap = await this.buildAuthorMap(allUserDocs);
    const replyIds = replies.map(r => r._id);
    const voteMap = userId ? await voteService.getUserVotes(replyIds, userId) : new Map();

    return {
      replies: replies.map(r => ({
        ...r,
        author: r.authorId ? authorMap.get(r.authorId.toString()) ?? null : null,
        mentionedAuthor: r.mentionedUserId ? authorMap.get(r.mentionedUserId.toString()) ?? null : null,
        userVote: voteMap.get(r._id.toString()) ?? null,
      })) as ReplyWithAuthor[],
      hasMore,
    };
  }

  /**
   * Crée un nouveau commentaire ou une réponse
   */
  async create(data: CreateAnswerData): Promise<{ id: string }> {
    const { examId, page, yTop, content, authorId, parentId, mentionedUserId } = data;

    // Validation du parent si c'est une réponse
    if (parentId) {
      const parent = await AnswerModel.findById(parentId);
      if (!parent) {
        throw ServiceError.notFound('Parent comment not found');
      }

      // Pas de réponse à une réponse (un seul niveau de nesting)
      if (parent.parentId) {
        throw ServiceError.badRequest(
          'Cannot reply to a reply (only one level of nesting allowed)'
        );
      }

      // Le parent doit appartenir au même examen
      if (parent.examId.toString() !== examId) {
        throw ServiceError.badRequest('Parent comment does not belong to the same exam');
      }
    }

    // Validation de mentionedUserId
    if (mentionedUserId && !parentId) {
      throw ServiceError.badRequest('mentionedUserId can only be used for replies');
    }

    const docData = {
      examId,
      page,
      yTop,
      authorId,
      parentId: parentId || null,
      mentionedUserId: mentionedUserId || null,
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
      throw ServiceError.badRequest('Invalid ID');
    }

    const existingAnswer = await AnswerModel.findById(id);
    if (!existingAnswer) {
      throw ServiceError.notFound('Comment not found');
    }

    // Seul le propriétaire peut modifier (pas les admins)
    const isOwner = existingAnswer.authorId?.toString() === userId;
    if (!isOwner) {
      throw ServiceError.forbidden('You can only edit your own comments');
    }

    const { content } = data;

    // Supprimer l'ancienne image si le contenu change
    const oldContent = existingAnswer.content;
    if (oldContent?.type === 'image' && isValidImageKey(oldContent.data)) {
      if (content.type !== 'image' || content.data !== oldContent.data) {
        await imageService.delete(oldContent.data).catch(() => {});
      }
    }

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
   * Toggle le marquage "meilleure réponse" sur un commentaire racine (admin only)
   */
  async toggleBestAnswer(id: string): Promise<{ isBestAnswer: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('Invalid ID');
    }

    const answer = await AnswerModel.findById(id);
    if (!answer) {
      throw ServiceError.notFound('Comment not found');
    }

    if (answer.parentId) {
      throw ServiceError.badRequest('Only root comments can be marked as best answer');
    }

    answer.isBestAnswer = !answer.isBestAnswer;
    await answer.save();
    return { isBestAnswer: answer.isBestAnswer };
  }

  /**
   * Supprime un commentaire (et ses réponses si c'est un commentaire racine)
   * @param id - ID du commentaire
   * @param userId - ID de l'utilisateur effectuant la suppression
   * @param isAdmin - Si l'utilisateur est admin
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('Invalid ID');
    }

    const existingAnswer = await AnswerModel.findById(id);
    if (!existingAnswer) {
      throw ServiceError.notFound('Comment not found');
    }

    // Propriétaire ou admin peut supprimer
    const isOwner = existingAnswer.authorId?.toString() === userId;
    if (!isOwner && !isAdmin) {
      throw ServiceError.forbidden('You can only delete your own comments');
    }

    // Cascade delete des réponses, votes et images si c'est un commentaire racine
    if (!existingAnswer.parentId) {
      const replies = await AnswerModel.find({ parentId: existingAnswer._id }).select('_id content').lean();
      const replyIds = replies.map(r => r._id);
      await voteService.deleteByAnswerIds([...replyIds, existingAnswer._id]);
      await this.deleteAnswerImages([...replies, existingAnswer]);
      await AnswerModel.deleteMany({ parentId: existingAnswer._id });
    } else {
      await voteService.deleteByAnswerIds([existingAnswer._id]);
      await this.deleteAnswerImages([existingAnswer]);
    }

    await AnswerModel.findByIdAndDelete(id);
  }

  /**
   * Supprime tous les commentaires d'un examen
   * (Utilisé lors de la suppression d'un examen via report)
   */
  async deleteByExamId(examId: Types.ObjectId): Promise<number> {
    const answers = await AnswerModel.find({ examId }).select('_id content').lean();
    const answerIds = answers.map(a => a._id);
    await voteService.deleteByAnswerIds(answerIds);
    await this.deleteAnswerImages(answers);
    const result = await AnswerModel.deleteMany({ examId });
    return result.deletedCount;
  }

  /**
   * Supprime les images S3 associées à une liste de commentaires
   */
  private async deleteAnswerImages(
    answers: Array<{ content?: AnswerContent }>
  ): Promise<void> {
    const imageKeys = answers
      .filter(a => a.content?.type === 'image' && isValidImageKey(a.content.data))
      .map(a => a.content!.data);
    await Promise.all(imageKeys.map(key => imageService.delete(key).catch(() => {})));
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
