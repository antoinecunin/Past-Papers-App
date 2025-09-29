import { Schema, model } from 'mongoose';
export var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["ADMIN"] = "admin";
})(UserRole || (UserRole = {}));
const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (email) => {
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
}, { timestamps: true });
// Index pour améliorer les performances des requêtes de vérification
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ email: 1 });
export const UserModel = model('User', UserSchema);
