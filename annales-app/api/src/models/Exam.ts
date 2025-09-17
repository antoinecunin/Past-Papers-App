import { Schema, model } from 'mongoose';

const ExamSchema = new Schema({
  title: { type: String, required: true },
  year: Number,
  module: String,
  fileKey: { type: String, required: true }, // chemin S3 (e.g. annales/2024/foo.pdf)
  pages: Number
}, { timestamps: true });

export const Exam = model('Exam', ExamSchema);