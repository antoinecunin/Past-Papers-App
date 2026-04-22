import { Schema, model, Types } from 'mongoose';

export interface IExam {
  _id: Types.ObjectId;
  title: string;
  year: number;
  module: string;
  fileKey: string;
  fileSize: number;
  pages?: number;
  searchable: boolean;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema(
  {
    title: { type: String, required: true },
    year: { type: Number, required: true },
    module: { type: String, required: true },
    fileKey: { type: String, required: true }, // chemin S3 (e.g. annales/2024/foo.pdf)
    fileSize: { type: Number, required: true }, // file size in bytes
    pages: Number,
    // Default true for backward compat; upload flow sets it to false when
    // extracted text is too sparse to be useful (scanned documents).
    searchable: { type: Boolean, default: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // qui a uploadé (indexé pour les requêtes GDPR par utilisateur)
  },
  { timestamps: true }
);

export const Exam = model('Exam', ExamSchema);
