import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X, Key, CheckCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const { navigate, currentRoute } = useRouter();
  const { name } = useInstance();

  const token = currentRoute.params.token;

  // Note: No automatic redirect - allows a logged-in user to access this page

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate('forgot-password');
    }
  }, [token, navigate]);

  // Clean up errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validateForm = () => {
    const errors: string[] = [];

    if (!password) {
      errors.push(t('auth.reset_password.validation.password_required'));
    } else if (password.length < 8) {
      errors.push(t('auth.reset_password.validation.password_too_short'));
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
      errors.push(t('auth.reset_password.validation.password_weak'));
    }

    if (password !== confirmPassword) {
      errors.push(t('auth.reset_password.validation.passwords_mismatch'));
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      // Error is already handled by the store
    }
  };

  const handleInputChange =
    (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      // Clear validation errors on input
      if (validationErrors.length > 0) {
        setValidationErrors([]);
      }
    };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-success-bg/30 flex flex-col justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-lg mx-auto">
          {/* Success card */}
          <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10 mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-2xl font-bold text-secondary-dark mb-3">{t('auth.reset_password.success_title')}</h3>
              <p className="text-sm md:text-base text-secondary leading-relaxed mb-6">
                {t('auth.reset_password.success_message')}
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-lg shadow-primary/20"
                onClick={() => navigate('login')}
              >
                <LogIn className="w-5 h-5" />
                <span>{t('auth.reset_password.success_button')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return null; // The useEffect will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-primary-light/20 flex flex-col justify-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">{t('auth.reset_password.title')}</h1>
          <p className="text-sm md:text-base text-secondary">{name}</p>
          <p className="text-xs md:text-sm text-secondary/80 mt-2">{t('auth.reset_password.subtitle')}</p>
        </div>

        {/* Reset password card */}
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error messages */}
            {(error || validationErrors.length > 0) && (
              <div className="bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {error && <p className="text-sm text-error font-medium mb-1">{error}</p>}
                  {validationErrors.map((err, index) => (
                    <p key={index} className="text-sm text-error">
                      {err}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setValidationErrors([]);
                  }}
                  className="text-error hover:text-error/80 transition-colors p-0.5 hover:bg-error/10 rounded cursor-pointer"
                  aria-label={t('common.close_error')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* New password */}
            <Input
              label={t('auth.reset_password.password_label')}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={handleInputChange(setPassword)}
              placeholder="••••••••"
              helperText={t('auth.register.password_helper')}
            />

            {/* Confirm password */}
            <Input
              label={t('auth.reset_password.confirm_password_label')}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={handleInputChange(setConfirmPassword)}
              placeholder="••••••••"
            />

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 shadow-lg shadow-primary/20"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.reset_password.changing')}</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span>{t('auth.reset_password.button')}</span>
                </>
              )}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-sm text-secondary font-medium">{t('common.or')}</span>
            </div>
          </div>

          {/* Back to login button */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate('login')}
          >
            <LogIn className="w-5 h-5" />
            <span>{t('auth.reset_password.back_to_login')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
