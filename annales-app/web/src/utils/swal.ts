import Swal from 'sweetalert2';

/**
 * Couleurs standardisées pour SweetAlert2
 */
const colors = {
  primary: '#2563eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  secondary: '#64748b',
};

/**
 * Affiche un message de succès
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
 * Affiche un message d'erreur
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
 * Affiche un avertissement
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
 * Affiche une demande de confirmation
 * @returns true si confirmé, false sinon
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
    confirmButtonText: options?.confirmText ?? 'Confirmer',
    cancelButtonText: options?.cancelText ?? 'Annuler',
    confirmButtonColor: options?.confirmColor ?? colors.error,
    cancelButtonColor: colors.secondary,
  });

  return result.isConfirmed;
}

/**
 * Affiche une erreur de validation (style plus léger)
 */
export async function showValidationError(text: string): Promise<void> {
  await Swal.fire({
    title: 'Champ manquant',
    text,
    icon: 'warning',
    confirmButtonColor: colors.primary,
  });
}

/**
 * Affiche un toast de succès (coin supérieur droit, disparaît automatiquement)
 */
export function showSuccessToast(title: string): void {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
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
 * Affiche un toast d'erreur (coin supérieur droit, disparaît automatiquement)
 */
export function showErrorToast(title: string): void {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  Toast.fire({
    icon: 'error',
    title,
  });
}
