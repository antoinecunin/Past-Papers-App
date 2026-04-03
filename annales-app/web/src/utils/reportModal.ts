import Swal from 'sweetalert2';
import i18n from '../i18n';

interface ReportData {
  reason: string;
  description: string;
}

type ReportType = 'exam' | 'comment';

const EXAM_REASONS = [
  { value: 'wrong_exam', labelKey: 'admin.reports.reason_wrong_exam' },
  { value: 'poor_quality', labelKey: 'admin.reports.reason_poor_quality' },
  { value: 'duplicate', labelKey: 'admin.reports.reason_duplicate' },
  { value: 'other', labelKey: 'admin.reports.reason_other' },
];

const COMMENT_REASONS = [
  { value: 'inappropriate_content', labelKey: 'admin.reports.reason_inappropriate' },
  { value: 'spam', labelKey: 'admin.reports.reason_spam' },
  { value: 'off_topic', labelKey: 'admin.reports.reason_off_topic' },
  { value: 'other', labelKey: 'admin.reports.reason_other' },
];

/**
 * Displays a report modal with SweetAlert2
 * @param title - Modal title (e.g. "Report this exam")
 * @param type - Report type ('exam' or 'comment')
 * @returns The report data or null if cancelled
 */
export async function showReportModal(title: string, type: ReportType): Promise<ReportData | null> {
  const reasons = type === 'exam' ? EXAM_REASONS : COMMENT_REASONS;

  const optionsHtml = reasons.map(r => `<option value="${r.value}">${i18n.t(r.labelKey)}</option>`).join('');

  const result = await Swal.fire({
    title,
    html: `<div style="text-align: left;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">${i18n.t('reports.reason_label')}</label>
      <select id="swal-reason" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <option value="">—</option>
        ${optionsHtml}
      </select>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">${i18n.t('reports.description_label')}</label>
      <textarea id="swal-description" class="swal2-textarea" placeholder="${i18n.t('reports.description_placeholder')}" style="margin: 0; width: 100%; min-height: 100px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
    </div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: i18n.t('reports.submit'),
    cancelButtonText: i18n.t('common.cancel'),
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const reason = (document.getElementById('swal-reason') as HTMLSelectElement)?.value;
      const description = (document.getElementById('swal-description') as HTMLTextAreaElement)
        ?.value;
      if (!reason) {
        Swal.showValidationMessage(i18n.t('reports.reason_required'));
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
 * Displays a success message for a report
 */
export async function showReportSuccess(): Promise<void> {
  await Swal.fire({
    title: i18n.t('common.success'),
    text: i18n.t('reports.success'),
    icon: 'success',
    confirmButtonColor: '#2563eb',
  });
}

/**
 * Displays an error message for a report
 * @param message - Optional error message
 */
export async function showReportError(message?: string): Promise<void> {
  await Swal.fire({
    title: i18n.t('common.error'),
    text: message || i18n.t('reports.error'),
    icon: 'error',
    confirmButtonColor: '#ef4444',
  });
}
