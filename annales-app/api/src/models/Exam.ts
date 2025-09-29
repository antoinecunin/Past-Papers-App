import { Schema, model } from 'mongoose';

const ExamSchema = new Schema(
  {
    title: { type: String, required: true },
    year: Number,
    module: String,
    fileKey: { type: String, required: true }, // chemin S3 (e.g. annales/2024/foo.pdf)
    pages: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // qui a uploadé
  },
  { timestamps: true }
);

export const Exam = model('Exam', ExamSchema);
