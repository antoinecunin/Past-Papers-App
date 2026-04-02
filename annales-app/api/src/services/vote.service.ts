import { Types } from 'mongoose';
import { VoteModel } from '../models/Vote.js';
import { AnswerModel } from '../models/Answer.js';
import { ServiceError } from './ServiceError.js';

class VoteService {
  /**
   * Vote sur un commentaire.
   * - Pas de vote existant : crée le vote
   * - Même valeur : annule le vote (toggle)
   * - Valeur opposée : change le vote
   */
  async vote(
    answerId: string,
    userId: string,
    value: 1 | -1
  ): Promise<{ score: number; userVote: number | null }> {
    if (!Types.ObjectId.isValid(answerId)) {
      throw ServiceError.badRequest('Invalid ID');
    }

    const answer = await AnswerModel.findById(answerId);
    if (!answer) {
      throw ServiceError.notFound('Comment not found');
    }

    const existingVote = await VoteModel.findOne({ answerId, userId });

    let scoreDelta: number;
    let newUserVote: number | null;

    if (!existingVote) {
      // Nouveau vote
      await VoteModel.create({ answerId, userId, value });
      scoreDelta = value;
      newUserVote = value;
    } else if (existingVote.value === value) {
      // Même valeur : annulation (toggle)
      await VoteModel.deleteOne({ _id: existingVote._id });
      scoreDelta = -value;
      newUserVote = null;
    } else {
      // Valeur opposée : changement de vote
      existingVote.value = value;
      await existingVote.save();
      scoreDelta = 2 * value; // swing de -1 à +1 ou inversement
      newUserVote = value;
    }

    const updated = await AnswerModel.findByIdAndUpdate(
      answerId,
      { $inc: { score: scoreDelta } },
      { new: true }
    );

    return { score: updated!.score, userVote: newUserVote };
  }

  /**
   * Supprime tous les votes associés à une liste de commentaires
   */
  async deleteByAnswerIds(answerIds: Types.ObjectId[]): Promise<number> {
    if (!answerIds.length) return 0;
    const result = await VoteModel.deleteMany({ answerId: { $in: answerIds } });
    return result.deletedCount;
  }

  /**
   * Récupère les votes d'un utilisateur pour une liste de commentaires
   * Retourne une Map answerId → value
   */
  async getUserVotes(answerIds: Types.ObjectId[], userId: string): Promise<Map<string, number>> {
    if (!answerIds.length) return new Map();

    const votes = await VoteModel.find({
      answerId: { $in: answerIds },
      userId,
    }).lean();

    return new Map(votes.map(v => [v.answerId.toString(), v.value]));
  }
}

export const voteService = new VoteService();
