import Swal from 'sweetalert2';

interface ReportData {
  reason: string;
  description: string;
}

type ReportType = 'exam' | 'comment';

const EXAM_REASONS = [
  { value: 'wrong_exam', label: 'Mauvais examen (année ou module incorrect)' },
  { value: 'poor_quality', label: 'Qualité insuffisante (illisible, incomplet)' },
  { value: 'duplicate', label: 'Doublon' },
  { value: 'other', label: 'Autre' },
];

const COMMENT_REASONS = [
  { value: 'inappropriate_content', label: 'Contenu inapproprié ou offensant' },
  { value: 'spam', label: 'Spam' },
  { value: 'off_topic', label: 'Hors-sujet' },
  { value: 'other', label: 'Autre' },
];

/**
 * Affiche un modal de signalement avec SweetAlert2
 * @param title - Titre du modal (ex: "Signaler cet examen")
 * @param type - Type de signalement ('exam' ou 'comment')
 * @returns Les données du signalement ou null si annulé
 */
export async function showReportModal(title: string, type: ReportType): Promise<ReportData | null> {
  const reasons = type === 'exam' ? EXAM_REASONS : COMMENT_REASONS;

  const optionsHtml = reasons
    .map(r => `<option value="${r.value}">${r.label}</option>`)
    .join('');

  const result = await Swal.fire({
    title,
    html: `<div style="text-align: left;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">Raison du signalement</label>
      <select id="swal-reason" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <option value="">Sélectionnez une raison</option>
        ${optionsHtml}
      </select>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">Description (optionnel)</label>
      <textarea id="swal-description" class="swal2-textarea" placeholder="Décrivez le problème..." style="margin: 0; width: 100%; min-height: 100px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
    </div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Envoyer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const reason = (document.getElementById('swal-reason') as HTMLSelectElement)?.value;
      const description = (document.getElementById('swal-description') as HTMLTextAreaElement)?.value;
      if (!reason) {
        Swal.showValidationMessage('Veuillez sélectionner une raison');
        return false;
      }
      return { reason, description };
    },
  });

  if (!result.isConfirmed || !result.value) {
    return null;
  }

  return result.value as ReportData;
}

/**
 * Affiche un message de succès pour un signalement
 */
export async function showReportSuccess(): Promise<void> {
  await Swal.fire({
    title: 'Succès',
    text: 'Signalement envoyé avec succès',
    icon: 'success',
    confirmButtonColor: '#2563eb',
  });
}

/**
 * Affiche un message d'erreur pour un signalement
 * @param message - Message d'erreur optionnel
 */
export async function showReportError(message?: string): Promise<void> {
  await Swal.fire({
    title: 'Erreur',
    text: message || 'Erreur lors du signalement',
    icon: 'error',
    confirmButtonColor: '#ef4444',
  });
}
