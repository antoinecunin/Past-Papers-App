import { Schema, model } from 'mongoose';
export var ReportType;
(function (ReportType) {
    ReportType["EXAM"] = "exam";
    ReportType["COMMENT"] = "comment";
})(ReportType || (ReportType = {}));
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "pending";
    ReportStatus["APPROVED"] = "approved";
    ReportStatus["REJECTED"] = "rejected";
})(ReportStatus || (ReportStatus = {}));
export var ReportReason;
(function (ReportReason) {
    ReportReason["INAPPROPRIATE_CONTENT"] = "inappropriate_content";
    ReportReason["SPAM"] = "spam";
    ReportReason["WRONG_SUBJECT"] = "wrong_subject";
    ReportReason["COPYRIGHT_VIOLATION"] = "copyright_violation";
    ReportReason["OTHER"] = "other";
})(ReportReason || (ReportReason = {}));
const ReportSchema = new Schema({
    type: {
        type: String,
        enum: Object.values(ReportType),
        required: true,
        index: true,
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    reason: {
        type: String,
        enum: Object.values(ReportReason),
        required: true,
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true,
    },
    reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(ReportStatus),
        default: ReportStatus.PENDING,
        required: true,
        index: true,
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedAt: {
        type: Date,
    },
    reviewNote: {
        type: String,
        maxlength: 200,
        trim: true,
    },
}, { timestamps: true });
// Index composé pour éviter les doublons de signalements
ReportSchema.index({ type: 1, targetId: 1, reportedBy: 1 }, { unique: true });
// Index pour les requêtes admin
ReportSchema.index({ status: 1, createdAt: -1 });
export const ReportModel = model('Report', ReportSchema);
