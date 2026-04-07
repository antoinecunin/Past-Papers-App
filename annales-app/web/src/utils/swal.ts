import Swal from 'sweetalert2';
import i18n from '../i18n';

/**
 * Standardized colors for SweetAlert2
 */
const colors = {
  primary: '#2563eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  secondary: '#64748b',
};

/**
 * Displays a success message
 */
export async function showSuccess(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: colors.success,
  });
}

/**
 * Displays an error message
 */
export async function showError(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: colors.error,
  });
}

/**
 * Displays a warning
 */
export async function showWarning(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonColor: colors.warning,
  });
}

/**
 * Displays a confirmation dialog
 * @returns true if confirmed, false otherwise
 */
export async function showConfirm(
  title: string,
  text?: string,
  options?: {
    confirmText?: string;
    cancelText?: string;
    icon?: 'warning' | 'question' | 'info';
    confirmColor?: string;
  }
): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: options?.icon ?? 'warning',
    showCancelButton: true,
    confirmButtonText: options?.confirmText ?? i18n.t('common.save'),
    cancelButtonText: options?.cancelText ?? i18n.t('common.cancel'),
    confirmButtonColor: options?.confirmColor ?? colors.error,
    cancelButtonColor: colors.secondary,
  });

  return result.isConfirmed;
}

/**
 * Displays a validation error (lighter style)
 */
export async function showValidationError(text: string): Promise<void> {
  await Swal.fire({
    title: i18n.t('common.error'),
    text,
    icon: 'warning',
    confirmButtonColor: colors.primary,
  });
}

/**
 * Displays a success toast (top-right corner, auto-dismiss)
 */
export function showSuccessToast(title: string): void {
  const Toast = Swal.mixin({
    toast: true,
    position: window.innerWidth < 640 ? 'top' : 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: toast => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  Toast.fire({
    icon: 'success',
    title,
  });
}

/**
 * Displays an error toast (top-right corner, auto-dismiss)
 */
export function showErrorToast(title: string): void {
  const Toast = Swal.mixin({
    toast: true,
    position: window.innerWidth < 640 ? 'top' : 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    didOpen: toast => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  Toast.fire({
    icon: 'error',
    title,
  });
}
