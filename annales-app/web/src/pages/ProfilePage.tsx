import { useState, useEffect } from 'react';
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
      showSuccessToast('Profile updated');
    } catch {
      // Error handled by store
    }
  };

  // Password validation
  const validatePassword = () => {
    const errors: string[] = [];

    if (!currentPassword) {
      errors.push('Current password is required');
    }

    if (!newPassword) {
      errors.push('New password is required');
    } else if (newPassword.length < 8) {
      errors.push('New password must contain at least 8 characters');
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(newPassword)) {
      errors.push('Password must contain at least one letter and one number');
    }

    if (newPassword !== confirmPassword) {
      errors.push('Passwords do not match');
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
        title: 'Password changed',
        text: 'Your password has been updated. You will be redirected to sign in again.',
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
      errors.push('New email address is required');
    } else if (
      !allowedDomains.some(domain => newEmail.toLowerCase().endsWith(domain.toLowerCase()))
    ) {
      const domains = allowedDomains.join(', ');
      errors.push(`Email must end with one of the allowed domains: ${domains}`);
    }

    if (!emailPassword) {
      errors.push('Password is required to confirm the change');
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
        setEmailErrors([data.error || 'Error changing email']);
        return;
      }

      // Reset form
      setNewEmail('');
      setEmailPassword('');
      setEmailErrors([]);

      await Swal.fire({
        title: 'Email changed',
        text: data.message || 'A verification email has been sent to your new address.',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });

      // Log out the user so they verify their new email
      await Swal.fire({
        title: 'Verification required',
        text: 'You will be logged out. Please verify your new email address before signing in again.',
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });

      logout();
      navigate('login');
    } catch {
      setEmailErrors(['Server connection error']);
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
        title: 'Export successful',
        text: 'Your data has been exported successfully.',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });
    } catch {
      await Swal.fire({
        title: 'Error',
        text: 'Unable to export your data.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    const firstConfirm = await Swal.fire({
      title: 'Delete your account?',
      html: `
        <p class="text-gray-600 mb-2">This action is <strong>irreversible</strong>.</p>
        <p class="text-gray-600 text-sm">All your data will be deleted: exams, comments, reports.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
    });

    if (!firstConfirm.isConfirmed) return;

    const { value: password } = await Swal.fire({
      title: 'Confirm deletion',
      input: 'password',
      inputLabel: 'Enter your password to confirm',
      inputPlaceholder: 'Password',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete permanently',
      cancelButtonText: 'Cancel',
      inputValidator: value => {
        if (!value) {
          return 'Password is required';
        }
        return null;
      },
    });

    if (!password) return;

    try {
      await deleteAccount(password);
      await Swal.fire({
        title: 'Account deleted',
        text: 'Your account has been deleted successfully.',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });
      navigate('login');
    } catch {
      // Error handled by store, but show a toast
      await Swal.fire({
        title: 'Error',
        text: error || 'Unable to delete account',
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
          <h1 className="text-2xl font-bold text-secondary-dark">My profile</h1>
          <p className="text-secondary">Manage your personal information</p>
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
              Account information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Email</label>
                <div className="px-4 py-3 bg-bg-tertiary rounded-xl text-secondary-dark border border-border">
                  {user.email}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Role</label>
                  <div className="px-4 py-3 bg-bg-tertiary rounded-xl text-secondary-dark border border-border flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {PermissionUtils.getRoleLabel(user.role)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Status</label>
                  <div className="px-4 py-3 bg-bg-tertiary rounded-xl border border-border flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${user.isVerified ? 'bg-success' : 'bg-warning'}`}
                    />
                    <span className="text-secondary-dark">
                      {user.isVerified ? 'Verified' : 'Not verified'}
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
              Edit my information
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

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Your first name"
                  required
                />
                <Input
                  label="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Your last name"
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Change Email Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Change email address
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
                <p className="text-xs leading-relaxed">
                  After the change, you will need to verify your new email address before you can
                  sign in again. You will be automatically logged out.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <label className="block text-xs font-medium text-secondary mb-1">
                  Current email
                </label>
                <p className="text-sm text-secondary-dark">{user?.email}</p>
              </div>

              <Input
                label="New email address"
                type="email"
                value={newEmail}
                onChange={handleEmailInputChange(setNewEmail)}
                placeholder={`new.address${allowedDomains[0] || '@example.com'}`}
                helperText={`Only ${allowedDomains.join(', ')} emails are accepted`}
                autoComplete="email"
              />

              <Input
                label="Current password (confirmation)"
                type="password"
                value={emailPassword}
                onChange={handleEmailInputChange(setEmailPassword)}
                placeholder="Your current password"
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
                    Changing...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Change email
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
              Change password
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
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={handlePasswordInputChange(setCurrentPassword)}
                placeholder="Your current password"
                autoComplete="current-password"
              />

              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={handlePasswordInputChange(setNewPassword)}
                placeholder="New password"
                helperText="At least 8 characters with one letter and one number"
                autoComplete="new-password"
              />

              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={handlePasswordInputChange(setConfirmPassword)}
                placeholder="Confirm password"
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
                    Changing...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Change password
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* GDPR - Personal data */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Personal data (GDPR)
            </h2>
            <p className="text-sm text-secondary mb-4">
              In accordance with GDPR, you can export all your data in JSON format.
            </p>
            <div className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportData}
                className="gap-2 w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                Export my data
              </Button>
              <div className="flex items-start gap-2 text-xs text-secondary">
                <FileJson className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  The export includes: profile, uploaded exams, comments, reports. See our{' '}
                  <button
                    type="button"
                    onClick={() => navigate('privacy')}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>{' '}
                  for more information.
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-error/30 p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-error mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Danger zone
            </h2>
            <p className="text-sm text-secondary mb-4">
              Permanently delete your account and all your data.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete my account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
