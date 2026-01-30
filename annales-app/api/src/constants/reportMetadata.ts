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
  // Raisons pour commentaires
  [ReportReason.INAPPROPRIATE_CONTENT]: {
    value: ReportReason.INAPPROPRIATE_CONTENT,
    label: 'Contenu inapproprié',
    description: 'Contenu offensant, vulgaire ou discriminatoire',
    forTypes: ['comment'],
  },
  [ReportReason.SPAM]: {
    value: ReportReason.SPAM,
    label: 'Spam ou publicité',
    description: 'Contenu publicitaire ou répétitif non sollicité',
    forTypes: ['comment'],
  },
  [ReportReason.OFF_TOPIC]: {
    value: ReportReason.OFF_TOPIC,
    label: 'Hors-sujet',
    description: "Contenu qui n'a pas sa place ici",
    forTypes: ['comment'],
  },
  // Raisons pour examens
  [ReportReason.WRONG_EXAM]: {
    value: ReportReason.WRONG_EXAM,
    label: 'Mauvais examen',
    description: 'Année ou module incorrect',
    forTypes: ['exam'],
  },
  [ReportReason.POOR_QUALITY]: {
    value: ReportReason.POOR_QUALITY,
    label: 'Qualité insuffisante',
    description: 'Document illisible ou incomplet',
    forTypes: ['exam'],
  },
  [ReportReason.DUPLICATE]: {
    value: ReportReason.DUPLICATE,
    label: 'Doublon',
    description: 'Cet examen existe déjà',
    forTypes: ['exam'],
  },
  // Raison commune
  [ReportReason.OTHER]: {
    value: ReportReason.OTHER,
    label: 'Autre',
    description: 'Autre raison (précisez dans la description)',
    forTypes: ['exam', 'comment'],
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
