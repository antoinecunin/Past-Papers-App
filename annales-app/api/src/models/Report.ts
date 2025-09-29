import { Schema, model, Types } from 'mongoose';

export enum ReportType {
  EXAM = 'exam',
  COMMENT = 'comment',
}

export enum ReportStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  WRONG_SUBJECT = 'wrong_subject',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  OTHER = 'other',
}

export interface Report {
  _id: Types.ObjectId;
  type: ReportType;
  targetId: Types.ObjectId; // ID de l'examen ou du commentaire signalé
  reason: ReportReason;
  description?: string;
  reportedBy: Types.ObjectId; // ID de l'utilisateur qui signale
  status: ReportStatus;
  reviewedBy?: Types.ObjectId; // ID de l'admin qui a traité le signalement
  reviewedAt?: Date;
  reviewNote?: string; // Note de l'admin lors du traitement
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<Report>(
  {
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNote: {
      type: String,
      maxlength: 200,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index composé pour éviter les doublons de signalements
ReportSchema.index({ type: 1, targetId: 1, reportedBy: 1 }, { unique: true });

// Index pour les requêtes admin
ReportSchema.index({ status: 1, createdAt: -1 });

export const ReportModel = model<Report>('Report', ReportSchema);