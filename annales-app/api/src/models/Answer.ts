import { Schema, model, Types } from 'mongoose';

type ContentType = 'text' | 'image' | 'latex';

export interface AnswerContent {
  type: ContentType;
  data: string;
  rendered?: string; // Version rendue (pour LaTeX -> HTML)
}

export interface Answer {
  _id: Types.ObjectId;
  examId: Types.ObjectId;
  page: number; // 1-based
  yTop: number; // [0,1] position Y du commentaire
  content?: AnswerContent; // Nouveau format
  text?: string; // Ancien format (compatibilité)
  author?: string; // Ancien format (compatibilité)
  authorId?: Types.ObjectId; // Nouveau format - référence utilisateur
  createdAt: Date;
  updatedAt: Date;
}

const AnswerContentSchema = new Schema<AnswerContent>(
  {
    type: { type: String, enum: ['text', 'image', 'latex'], required: true },
    data: { type: String, required: true },
    rendered: { type: String },
  },
  { _id: false }
);

const AnswerSchema = new Schema<Answer>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    page: { type: Number, required: true, min: 1, index: true },
    yTop: { type: Number, required: true, min: 0, max: 1 },
    content: { type: AnswerContentSchema },
    text: { type: String, trim: true }, // Optionnel pour compatibilité
    author: { type: String, trim: true }, // Optionnel pour compatibilité
    authorId: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // Nouveau champ
  },
  { timestamps: true }
);

AnswerSchema.index({ examId: 1, page: 1, yTop: 1 });

export const AnswerModel = model<Answer>('Answer', AnswerSchema);
