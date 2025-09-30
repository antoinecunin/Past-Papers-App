import { ReportType, ReportReason, ReportStatus } from '../models/Report.js';

/**
 * Métadonnées pour les types de signalement
 */
export const REPORT_TYPE_METADATA = {
  [ReportType.EXAM]: {
    value: ReportType.EXAM,
    label: 'Examen',
    description: 'Signaler un examen inapproprié',
  },
  [ReportType.COMMENT]: {
    value: ReportType.COMMENT,
    label: 'Commentaire',
    description: 'Signaler un commentaire inapproprié',
  },
} as const;

/**
 * Métadonnées pour les raisons de signalement
 */
export const REPORT_REASON_METADATA = {
  [ReportReason.INAPPROPRIATE_CONTENT]: {
    value: ReportReason.INAPPROPRIATE_CONTENT,
    label: 'Contenu inapproprié',
    description: 'Contenu offensant, vulgaire ou discriminatoire',
  },
  [ReportReason.SPAM]: {
    value: ReportReason.SPAM,
    label: 'Spam ou publicité',
    description: 'Contenu publicitaire ou répétitif non sollicité',
  },
  [ReportReason.WRONG_SUBJECT]: {
    value: ReportReason.WRONG_SUBJECT,
    label: 'Hors sujet',
    description: "Contenu qui n'a pas sa place dans cette section",
  },
  [ReportReason.COPYRIGHT_VIOLATION]: {
    value: ReportReason.COPYRIGHT_VIOLATION,
    label: "Violation de droits d'auteur",
    description: "Contenu protégé par des droits d'auteur partagé sans autorisation",
  },
  [ReportReason.OTHER]: {
    value: ReportReason.OTHER,
    label: 'Autre',
    description: 'Autre raison (précisez dans la description)',
  },
} as const;

/**
 * Métadonnées pour les statuts de signalement
 */
export const REPORT_STATUS_METADATA = {
  [ReportStatus.PENDING]: {
    value: ReportStatus.PENDING,
    label: 'En attente',
    description: 'Signalement en attente de traitement',
  },
  [ReportStatus.APPROVED]: {
    value: ReportStatus.APPROVED,
    label: 'Approuvé',
    description: 'Signalement approuvé, contenu supprimé',
  },
  [ReportStatus.REJECTED]: {
    value: ReportStatus.REJECTED,
    label: 'Rejeté',
    description: 'Signalement rejeté, contenu conservé',
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