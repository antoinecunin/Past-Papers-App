import Swal from 'sweetalert2';

interface ReportData {
  reason: string;
  description: string;
}

type ReportType = 'exam' | 'comment';

const EXAM_REASONS = [
  { value: 'wrong_exam', label: 'Wrong exam (incorrect year or module)' },
  { value: 'poor_quality', label: 'Poor quality (unreadable, incomplete)' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
];

const COMMENT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate or offensive content' },
  { value: 'spam', label: 'Spam' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'other', label: 'Other' },
];

/**
 * Displays a report modal with SweetAlert2
 * @param title - Modal title (e.g. "Report this exam")
 * @param type - Report type ('exam' or 'comment')
 * @returns The report data or null if cancelled
 */
export async function showReportModal(title: string, type: ReportType): Promise<ReportData | null> {
  const reasons = type === 'exam' ? EXAM_REASONS : COMMENT_REASONS;

  const optionsHtml = reasons
    .map(r => `<option value="${r.value}">${r.label}</option>`)
    .join('');

  const result = await Swal.fire({
    title,
    html: `<div style="text-align: left;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">Reason for report</label>
      <select id="swal-reason" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <option value="">Select a reason</option>
        ${optionsHtml}
      </select>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">Description (optional)</label>
      <textarea id="swal-description" class="swal2-textarea" placeholder="Describe the issue..." style="margin: 0; width: 100%; min-height: 100px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
    </div>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const reason = (document.getElementById('swal-reason') as HTMLSelectElement)?.value;
      const description = (document.getElementById('swal-description') as HTMLTextAreaElement)?.value;
      if (!reason) {
        Swal.showValidationMessage('Please select a reason');
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
    title: 'Success',
    text: 'Report submitted successfully',
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
    title: 'Error',
    text: message || 'Error submitting report',
    icon: 'error',
    confirmButtonColor: '#ef4444',
  });
}
