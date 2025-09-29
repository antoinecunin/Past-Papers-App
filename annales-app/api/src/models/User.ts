import { Schema, model, Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => {
          return email.endsWith('@etu.unistra.fr');
        },
        message: "L'email doit se terminer par @etu.unistra.fr",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      sparse: true,
    },
    verificationExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      sparse: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index pour améliorer les performances des requêtes de vérification
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ email: 1 });

export const UserModel = model<User>('User', UserSchema);
