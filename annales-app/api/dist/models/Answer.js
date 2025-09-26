import { Schema, model } from 'mongoose';
const AnswerContentSchema = new Schema({
    type: { type: String, enum: ['text', 'image', 'latex'], required: true },
    data: { type: String, required: true },
    rendered: { type: String },
}, { _id: false });
const AnswerSchema = new Schema({
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    page: { type: Number, required: true, min: 1, index: true },
    yTop: { type: Number, required: true, min: 0, max: 1 },
    content: { type: AnswerContentSchema },
    text: { type: String, trim: true }, // Optionnel pour compatibilité
    author: { type: String, trim: true },
}, { timestamps: true });
AnswerSchema.index({ examId: 1, page: 1, yTop: 1 });
export const AnswerModel = model('Answer', AnswerSchema);
