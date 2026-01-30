import { Types } from 'mongoose';
import { ReportModel, ReportType, ReportReason, ReportStatus } from '../models/Report.js';
import { Exam } from '../models/Exam.js';
import { AnswerModel } from '../models/Answer.js';
import { deleteFile } from './s3.js';
import { ServiceError } from './ServiceError.js';

export interface CreateReportData {
  type: ReportType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  reportedBy: string;
}

export interface GetReportsOptions {
  status?: ReportStatus;
  type?: ReportType;
  limit: number;
  offset: number;
}

export interface TargetDetails {
  // Pour les examens
  title?: string;
  module?: string;
  year?: number;
  // Pour les commentaires
  examId?: string;
  page?: number;
  // Indique si le contenu existe encore
  exists: boolean;
}

export interface ReportWithTarget {
  _id: string;
  type: ReportType;
  targetId: string;
  reason: string;
  description?: string;
  reportedBy: { _id: string; firstName: string; lastName: string; email: string };
  status: ReportStatus;
  reviewedBy?: { _id: string; firstName: string; lastName: string; email: string };
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
  target: TargetDetails;
}

export interface ReportsResult {
  reports: ReportWithTarget[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class ReportService {
  /**
   * Crée un signalement
   */
  async create(data: CreateReportData): Promise<{ reportId: string }> {
    const { type, targetId, reason, description, reportedBy } = data;

    // Vérifier que la cible existe
    if (type === ReportType.EXAM) {
      const exam = await Exam.findById(targetId);
      if (!exam) {
        throw ServiceError.notFound('Examen non trouvé');
      }
    } else if (type === ReportType.COMMENT) {
      const comment = await AnswerModel.findById(targetId);
      if (!comment) {
        throw ServiceError.notFound('Commentaire non trouvé');
      }
    }

    try {
      const report = await ReportModel.create({
        type,
        targetId: new Types.ObjectId(targetId),
        reason,
        description: description?.trim() || undefined,
        reportedBy: new Types.ObjectId(reportedBy),
      });

      return { reportId: report._id.toString() };
    } catch (error) {
      // Gestion de l'erreur de doublon (index unique)
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw ServiceError.conflict('Vous avez déjà signalé ce contenu');
      }
      throw error;
    }
  }

  /**
   * Liste les signalements avec filtres et pagination
   */
  async findAll(options: GetReportsOptions): Promise<ReportsResult> {
    const { status, type, limit, offset } = options;

    // Construire le filtre
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }

    // Récupérer les signalements avec les détails des utilisateurs
    const reports = await ReportModel.find(filter)
      .populate('reportedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Compter le total pour la pagination
    const total = await ReportModel.countDocuments(filter);

    // Enrichir chaque signalement avec les détails de la cible
    // Note: populate() transforme les ObjectId en objets avec les détails utilisateur
    const enrichedReports: ReportWithTarget[] = await Promise.all(
      reports.map(async (report) => {
        const targetDetails = await this.getTargetDetails(
          report.type as ReportType,
          report.targetId.toString()
        );
        return {
          ...report,
          _id: report._id.toString(),
          targetId: report.targetId.toString(),
          target: targetDetails,
        } as unknown as ReportWithTarget;
      })
    );

    return {
      reports: enrichedReports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Récupère les détails du contenu cible d'un signalement
   */
  private async getTargetDetails(type: ReportType, targetId: string): Promise<TargetDetails> {
    if (type === ReportType.EXAM) {
      const exam = await Exam.findById(targetId).select('title module year').lean();
      if (!exam) {
        return { exists: false };
      }
      return {
        title: exam.title,
        module: exam.module,
        year: exam.year,
        exists: true,
      };
    } else if (type === ReportType.COMMENT) {
      const comment = await AnswerModel.findById(targetId).select('examId page').lean();
      if (!comment) {
        return { exists: false };
      }
      return {
        examId: comment.examId.toString(),
        page: comment.page,
        exists: true,
      };
    }
    return { exists: false };
  }

  /**
   * Traite un signalement (approve/reject)
   * @param id - ID du signalement
   * @param action - 'approve' ou 'reject'
   * @param reviewerId - ID de l'admin traitant le signalement
   * @param note - Note optionnelle
   */
  async review(
    id: string,
    action: 'approve' | 'reject',
    reviewerId: string,
    note?: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw ServiceError.badRequest('ID invalide');
    }

    const report = await ReportModel.findById(id);
    if (!report) {
      throw ServiceError.notFound('Signalement non trouvé');
    }

    if (report.status !== ReportStatus.PENDING) {
      throw ServiceError.badRequest('Ce signalement a déjà été traité');
    }

    // Si approuvé, supprimer le contenu signalé
    if (action === 'approve') {
      if (report.type === ReportType.EXAM) {
        const exam = await Exam.findById(report.targetId);
        if (exam) {
          // Supprimer le fichier S3
          try {
            await deleteFile(exam.fileKey);
          } catch (s3Error) {
            console.error('Erreur suppression S3:', s3Error);
          }

          // Supprimer les commentaires associés
          await AnswerModel.deleteMany({ examId: exam._id });

          // Supprimer l'examen
          await Exam.findByIdAndDelete(exam._id);
        }
      } else if (report.type === ReportType.COMMENT) {
        // Cascade delete des réponses si c'est un commentaire racine
        const comment = await AnswerModel.findById(report.targetId);
        if (comment && !comment.parentId) {
          await AnswerModel.deleteMany({ parentId: comment._id });
        }
        await AnswerModel.findByIdAndDelete(report.targetId);
      }
    }

    // Mettre à jour le signalement
    await ReportModel.findByIdAndUpdate(id, {
      status: action === 'approve' ? ReportStatus.APPROVED : ReportStatus.REJECTED,
      reviewedBy: new Types.ObjectId(reviewerId),
      reviewedAt: new Date(),
      reviewNote: note?.trim() || undefined,
    });
  }
}

export const reportService = new ReportService();
