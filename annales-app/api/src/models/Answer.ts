import { Schema, model, Types } from 'mongoose';

export interface Answer {
  _id: Types.ObjectId;
  examId: Types.ObjectId;
  page: number;         // 1-based
  yTop: number;         // [0,1] position haut de l’ancre
  yBottom?: number;     // [0,1] optionnel (plage verticale)
  text: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<Answer>({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  page:   { type: Number, required: true, min: 1, index: true },
  yTop:   { type: Number, required: true, min: 0, max: 1 },
  yBottom:{ type: Number, min: 0, max: 1 },
  text:   { type: String, required: true, trim: true },
  author: { type: String, trim: true },
}, { timestamps: true });

AnswerSchema.index({ examId: 1, page: 1, yTop: 1 });

export const AnswerModel = model<Answer>('Answer', AnswerSchema);