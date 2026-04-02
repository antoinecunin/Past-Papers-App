import { ReportType, ReportReason, ReportStatus } from '../models/Report.js';

/**
 * Métadonnées pour les types de signalement
 */
export const REPORT_TYPE_METADATA = {
  [ReportType.EXAM]: {
    value: ReportType.EXAM,
    label: 'Exam',
    description: 'Report an inappropriate exam',
  },
  [ReportType.COMMENT]: {
    value: ReportType.COMMENT,
    label: 'Comment',
    description: 'Report an inappropriate comment',
  },
} as const;

/**
 * Métadonnées pour les raisons de signalement
 */
export const REPORT_REASON_METADATA = {
  // Raisons pour commentaires
  [ReportReason.INAPPROPRIATE_CONTENT]: {
    value: ReportReason.INAPPROPRIATE_CONTENT,
    label: 'Inappropriate content',
    description: 'Offensive, vulgar, or discriminatory content',
    forTypes: ['comment'],
  },
  [ReportReason.SPAM]: {
    value: ReportReason.SPAM,
    label: 'Spam or advertising',
    description: 'Unsolicited advertising or repetitive content',
    forTypes: ['comment'],
  },
  [ReportReason.OFF_TOPIC]: {
    value: ReportReason.OFF_TOPIC,
    label: 'Off-topic',
    description: 'Content that does not belong here',
    forTypes: ['comment'],
  },
  // Raisons pour examens
  [ReportReason.WRONG_EXAM]: {
    value: ReportReason.WRONG_EXAM,
    label: 'Wrong exam',
    description: 'Incorrect year or module',
    forTypes: ['exam'],
  },
  [ReportReason.POOR_QUALITY]: {
    value: ReportReason.POOR_QUALITY,
    label: 'Poor quality',
    description: 'Unreadable or incomplete document',
    forTypes: ['exam'],
  },
  [ReportReason.DUPLICATE]: {
    value: ReportReason.DUPLICATE,
    label: 'Duplicate',
    description: 'This exam already exists',
    forTypes: ['exam'],
  },
  // Raison commune
  [ReportReason.OTHER]: {
    value: ReportReason.OTHER,
    label: 'Other',
    description: 'Other reason (please specify in the description)',
    forTypes: ['exam', 'comment'],
  },
} as const;

/**
 * Métadonnées pour les statuts de signalement
 */
export const REPORT_STATUS_METADATA = {
  [ReportStatus.PENDING]: {
    value: ReportStatus.PENDING,
    label: 'Pending',
    description: 'Report awaiting review',
  },
  [ReportStatus.APPROVED]: {
    value: ReportStatus.APPROVED,
    label: 'Approved',
    description: 'Report approved, content deleted',
  },
  [ReportStatus.REJECTED]: {
    value: ReportStatus.REJECTED,
    label: 'Rejected',
    description: 'Report rejected, content kept',
  },
} as const;

/**
 * Liste des types de signalement disponibles
 */
export const REPORT_TYPES = Object.values(REPORT_TYPE_METADATA);

/**
 * Liste des raisons de signalement disponibles
 */
export const REPORT_REASONS = Object.values(REPORT_REASON_METADATA);

/**
 * Liste des statuts de signalement disponibles
 */
export const REPORT_STATUSES = Object.values(REPORT_STATUS_METADATA);
