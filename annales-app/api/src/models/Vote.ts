import { Schema, model, Types } from 'mongoose';

export interface Vote {
  _id: Types.ObjectId;
  answerId: Types.ObjectId;
  userId: Types.ObjectId;
  value: 1 | -1;
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<Vote>(
  {
    answerId: { type: Schema.Types.ObjectId, ref: 'Answer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    value: { type: Number, enum: [1, -1], required: true },
  },
  { timestamps: true }
);

VoteSchema.index({ answerId: 1, userId: 1 }, { unique: true });

export const VoteModel = model<Vote>('Vote', VoteSchema);
