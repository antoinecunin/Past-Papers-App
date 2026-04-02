import { Types } from 'mongoose';
import { Exam } from '../models/Exam.js';
import { AnswerModel } from '../models/Answer.js';
import { deleteFile } from './s3.js';
import { ServiceError } from './ServiceError.js';

export interface ExamData {
  _id: Types.ObjectId;
  title: string;
  year: number;
  module: string;
  fileKey: string;
  pages: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

class ExamService {
  /**
   * Liste tous les examens
   */
  async findAll(): Promise<ExamData[]> {
    const items = await Exam.find().sort({ createdAt: -1 }).lean();
    return items as ExamData[];
  }

  /**
   * Récupère un examen par son ID
   */
  async findById(id: string): Promise<ExamData> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('Invalid ID');
    }

    const exam = await Exam.findById(id).lean();
    if (!exam) {
      throw ServiceError.notFound('Exam not found');
    }

    return exam as ExamData;
  }

  /**
   * Supprime un examen et ses ressources associées
   * @param id - ID de l'examen
   * @param userId - ID de l'utilisateur effectuant la suppression
   * @param isAdmin - Si l'utilisateur est admin
   */
  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('Invalid ID');
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      throw ServiceError.notFound('Exam not found');
    }

    // Vérifier les permissions (propriétaire ou admin)
    const isOwner = exam.uploadedBy.toString() === userId;
    if (!isOwner && !isAdmin) {
      throw ServiceError.forbidden('You can only delete your own exams');
    }

    // Supprimer le fichier de S3
    try {
      await deleteFile(exam.fileKey);
    } catch (s3Error) {
      console.error('S3 deletion error:', s3Error);
      // On continue même si la suppression S3 échoue
    }

    // Supprimer tous les commentaires associés
    try {
      const deletedAnswers = await AnswerModel.deleteMany({ examId: new Types.ObjectId(id) });
      console.log(`Deleting ${deletedAnswers.deletedCount} comments for exam ${id}`);
    } catch (answerError) {
      console.error('Comment deletion error:', answerError);
      // On continue même si la suppression des commentaires échoue
    }

    // Supprimer l'examen
    await Exam.findByIdAndDelete(id);
  }
}

export const examService = new ExamService();
