import { Schema, model, Types } from 'mongoose';
import { ALLOWED_EMAIL_DOMAIN } from '../constants/auth.js';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface User {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
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
          return email.endsWith(ALLOWED_EMAIL_DOMAIN);
        },
        message: `L'email doit se terminer par ${ALLOWED_EMAIL_DOMAIN}`,
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
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index pour améliorer les performances des requêtes de vérification
// sparse: true permet d'exclure les documents où le champ est null/undefined
UserSchema.index({ verificationToken: 1 }, { sparse: true });
UserSchema.index({ resetPasswordToken: 1 }, { sparse: true });

export const UserModel = model<User>('User', UserSchema);
