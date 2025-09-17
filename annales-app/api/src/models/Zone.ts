import { Schema, model } from 'mongoose';

const ZoneSchema = new Schema({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  page: { type: Number, required: true },
  // coords normalisées 0..1 pour indépendance de la résolution
  x: Number, y: Number, w: Number, h: Number,
  kind: { type: String, enum: ['text', 'math', 'checkbox'], default: 'text' },
  label: String,
}, { timestamps: true });

export const Zone = model('Zone', ZoneSchema);