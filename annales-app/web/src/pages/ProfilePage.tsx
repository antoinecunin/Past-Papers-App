import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Key,
  Mail,
  Shield,
  Save,
  AlertCircle,
  X,
  Trash2,
  Download,
  FileJson,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PermissionUtils } from '../utils/permissions';
import { showSuccessToast } from '../utils/swal';
import { apiFetch } from '../utils/api';

export default function ProfilePage() {
  const { t } = useTranslation();
  const {
    user,
    updateProfile,
    changePassword,
    deleteAccount,
    logout,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
  const { navigate } = useRouter();
  const { allowedDomains } = useInstance();

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Email form state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailErrors, setEmailErrors] = useState<string[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('login');
    }
  }, [user, navigate]);

  // Sync form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user]);

  // Clean up on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Profile form handlers
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile({ firstName, lastName });
      showSuccessToast(t('common.success'));
    } catch {
      // Error handled by store
    }
  };

  // Password validation
  const validatePassword = () => {
    const errors: string[] = [];

    if (!currentPassword) {
      errors.push(t('auth.reset_password.validation.password_required'));
    }

    if (!newPassword) {
      errors.push(t('auth.reset_password.validation.password_required'));
    } else if (newPassword.length < 8) {
      errors.push(t('auth.reset_password.validation.password_too_short'));
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(newPassword)) {
      errors.push(t('auth.reset_password.validation.password_weak'));
    }

    if (newPassword !== confirmPassword) {
      errors.push(t('auth.reset_password.validation.passwords_mismatch'));
    }

    setPasswordErrors(errors);
    return errors.length === 0;
  };

  // Password form handlers
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      await Swal.fire({
        title: t('profile.change_password.success_title'),
        text: t('profile.change_password.success_message'),
        icon: 'success',
        confirmButtonColor: '#2563eb',
      });
      logout();
      navigate('login');
    } catch {
      // Error handled by store
    }
  };

  const handlePasswordInputChange =
    (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (passwordErrors.length > 0) {
        setPasswordErrors([]);
      }
    };

  // Email validation
  const validateEmail = () => {
    const errors: string[] = [];

    if (!newEmail.trim()) {
      errors.push(t('auth.register.validation.email_required'));
    } else if (
      !allowedDomains.some(domain => newEmail.toLowerCase().endsWith(domain.toLowerCase()))
    ) {
      const domains = allowedDomains.join(', ');
      errors.push(t('auth.register.validation.invalid_domain', { domains }));
    }

    if (!emailPassword) {
      errors.push(t('profile.danger_zone.password_required'));
    }

    setEmailErrors(errors);
    return errors.length === 0;
  };

  // Email form handlers
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    try {
      const response = await apiFetch('/api/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: newEmail.trim().toLowerCase(),
          password: emailPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailErrors([data.error || t('common.error')]);
        return;
      }

      // Reset form
      setNewEmail('');
      setEmailPassword('');
      setEmailErrors([]);

      await Swal.fire({
        title: t('profile.change_email.success_title'),
        text: data.message || t('profile.change_email.success_message'),
        icon: 'success',
        confirmButtonColor: '#10b981',
      });

      // Log out the user so they verify their new email
      await Swal.fire({
        title: t('profile.change_email.verification_title'),
        text: t('profile.change_email.verification_message'),
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });

      logout();
      navigate('login');
    } catch {
      setEmailErrors([t('common.error')]);
    }
  };

  const handleEmailInputChange =
    (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (emailErrors.length > 0) {
        setEmailErrors([]);
      }
    };

  // Export data handler (GDPR)
  const handleExportData = async () => {
    try {
      const response = await apiFetch('/api/auth/data-export');

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();

      // Create a JSON blob and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const filename = `my-data-${new Date().toISOString().split('T')[0]}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      await Swal.fire({
        title: t('profile.gdpr.export_success_title'),
        text: t('profile.gdpr.export_success_message'),
        icon: 'success',
        confirmButtonColor: '#10b981',
      });
    } catch {
      await Swal.fire({
        title: t('common.error'),
        text: t('profile.gdpr.export_error'),
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    const firstConfirm = await Swal.fire({
      title: t('profile.danger_zone.confirm_title'),
      html: `
        <p class="text-gray-600 mb-2">${t('profile.danger_zone.confirm_irreversible')}</p>
        <p class="text-gray-600 text-sm">${t('profile.danger_zone.confirm_data_loss')}</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: t('profile.danger_zone.confirm_continue'),
      cancelButtonText: t('common.cancel'),
    });

    if (!firstConfirm.isConfirmed) return;

    const { value: password } = await Swal.fire({
      title: t('profile.danger_zone.confirm_password_title'),
      input: 'password',
      inputLabel: t('profile.danger_zone.confirm_password_label'),
      inputPlaceholder: t('common.password_placeholder'),
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: t('profile.danger_zone.confirm_password_button'),
      cancelButtonText: t('common.cancel'),
      inputValidator: value => {
        if (!value) {
          return t('profile.danger_zone.password_required');
        }
        return null;
      },
    });

    if (!password) return;

    try {
      await deleteAccount(password);
      await Swal.fire({
        title: t('profile.danger_zone.success_title'),
        text: t('profile.danger_zone.success_message'),
        icon: 'success',
        confirmButtonColor: '#10b981',
      });
      navigate('login');
    } catch {
      // Error handled by store, but show a toast
      await Swal.fire({
        title: t('common.error'),
        text: error || t('profile.danger_zone.error'),
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  if (!user) return null;

  const hasProfileChanges = firstName !== user.firstName || lastName !== user.lastName;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary-dark">{t('profile.title')}</h1>
          <p className="text-secondary">{t('profile.subtitle')}</p>
        </div>
      </div>

      {/* 2-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* User Info Card (read-only) */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              {t('profile.account_info')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  {t('profile.email_label')}
                </label>
                <div className="px-4 py-3 bg-bg-tertiary rounded-xl text-secondary-dark border border-border">
                  {user.email}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    {t('profile.role_label')}
                  </label>
                  <div className="px-4 py-3 bg-bg-tertiary rounded-xl text-secondary-dark border border-border flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {PermissionUtils.getRoleLabel(user.role)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    {t('profile.status_label')}
                  </label>
                  <div className="px-4 py-3 bg-bg-tertiary rounded-xl border border-border flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${user.isVerified ? 'bg-success' : 'bg-warning'}`}
                    />
                    <span className="text-secondary-dark">
                      {user.isVerified ? t('profile.verified') : t('profile.not_verified')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t('profile.edit_info')}
            </h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {error && passwordErrors.length === 0 && (
                <div className="bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                  <p className="text-sm text-error flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-error hover:text-error/80 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('profile.first_name_label')}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder={t('profile.first_name_placeholder')}
                  required
                />
                <Input
                  label={t('profile.last_name_label')}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder={t('profile.last_name_placeholder')}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !hasProfileChanges || !firstName.trim() || !lastName.trim()}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('profile.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('profile.save_button')}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Change Email Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              {t('profile.change_email.title')}
            </h2>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {emailErrors.length > 0 && (
                <div className="bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                  <div className="flex-1">
                    {emailErrors.map((err, i) => (
                      <p key={i} className="text-sm text-error">
                        {err}
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailErrors([])}
                    className="text-error hover:text-error/80 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">⚠️ Important</p>
                <p className="text-xs leading-relaxed">{t('profile.change_email.warning')}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <label className="block text-xs font-medium text-secondary mb-1">
                  {t('profile.change_email.current_label')}
                </label>
                <p className="text-sm text-secondary-dark">{user?.email}</p>
              </div>

              <Input
                label={t('profile.change_email.new_label')}
                type="email"
                value={newEmail}
                onChange={handleEmailInputChange(setNewEmail)}
                placeholder={`new.address${allowedDomains[0] || '@example.com'}`}
                helperText={t('auth.register.email_helper', { domains: allowedDomains.join(', ') })}
                autoComplete="email"
              />

              <Input
                label={t('profile.change_email.password_label')}
                type="password"
                value={emailPassword}
                onChange={handleEmailInputChange(setEmailPassword)}
                placeholder={t('common.password_placeholder')}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !newEmail || !emailPassword}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('profile.change_email.changing')}
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    {t('profile.change_email.button')}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {t('profile.change_password.title')}
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {(passwordErrors.length > 0 || (error && passwordErrors.length === 0)) && (
                <div className="bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                  <div className="flex-1">
                    {passwordErrors.map((err, i) => (
                      <p key={i} className="text-sm text-error">
                        {err}
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordErrors([]);
                      clearError();
                    }}
                    className="text-error hover:text-error/80 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <Input
                label={t('profile.change_password.current_label')}
                type="password"
                value={currentPassword}
                onChange={handlePasswordInputChange(setCurrentPassword)}
                placeholder={t('common.password_placeholder')}
                autoComplete="current-password"
              />

              <Input
                label={t('profile.change_password.new_label')}
                type="password"
                value={newPassword}
                onChange={handlePasswordInputChange(setNewPassword)}
                placeholder={t('common.password_placeholder')}
                helperText={t('auth.register.password_helper')}
                autoComplete="new-password"
              />

              <Input
                label={t('profile.change_password.confirm_label')}
                type="password"
                value={confirmPassword}
                onChange={handlePasswordInputChange(setConfirmPassword)}
                placeholder={t('common.password_placeholder')}
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('profile.change_password.changing')}
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    {t('profile.change_password.button')}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* GDPR - Personal data */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('profile.gdpr.title')}
            </h2>
            <p className="text-sm text-secondary mb-4">{t('profile.gdpr.description')}</p>
            <div className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportData}
                className="gap-2 w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                {t('profile.gdpr.export_button')}
              </Button>
              <div className="flex items-start gap-2 text-xs text-secondary">
                <FileJson className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  {t('profile.gdpr.export_description')}{' '}
                  <button
                    type="button"
                    onClick={() => navigate('privacy')}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {t('profile.gdpr.privacy_link')}
                  </button>{' '}
                  {t('profile.gdpr.export_more_info')}
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-error/30 p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-error mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {t('profile.danger_zone.title')}
            </h2>
            <p className="text-sm text-secondary mb-4">{t('profile.danger_zone.description')}</p>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('profile.danger_zone.delete_button')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
