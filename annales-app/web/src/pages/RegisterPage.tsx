import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X, UserPlus, CheckCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LanguageSwitch } from '../components/LanguageSwitch';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { register, isLoading, error, clearError } = useAuthStore();
  const { navigate } = useRouter();
  const { name, allowedDomains } = useInstance();

  // Note: No automatic redirect - allows a logged-in user to view the registration page

  // Clean up errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.firstName.trim()) {
      errors.push(t('auth.register.validation.first_name_required'));
    }

    if (!formData.lastName.trim()) {
      errors.push(t('auth.register.validation.last_name_required'));
    }

    if (!formData.email.trim()) {
      errors.push(t('auth.register.validation.email_required'));
    } else if (
      !allowedDomains.some(domain => formData.email.toLowerCase().endsWith(domain.toLowerCase()))
    ) {
      const domains = allowedDomains.join(', ');
      errors.push(t('auth.register.validation.invalid_domain', { domains }));
    }

    if (!formData.password) {
      errors.push(t('auth.register.validation.password_required'));
    } else if (formData.password.length < 8) {
      errors.push(t('auth.register.validation.password_too_short'));
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      errors.push(t('auth.register.validation.password_weak'));
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push(t('auth.register.validation.passwords_mismatch'));
    }

    if (!acceptedTerms) {
      errors.push(t('auth.register.validation.terms_not_accepted'));
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });
      setSuccess(true);
    } catch {
      // Error is already handled by the store
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
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
              <h3 className="text-2xl font-bold text-secondary-dark mb-3">
                {t('auth.register.success_title')}
              </h3>
              <p className="text-sm md:text-base text-secondary leading-relaxed mb-6">
                {t('auth.register.success_message')}
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-lg shadow-primary/20"
                onClick={() => navigate('login')}
              >
                <LogIn className="w-5 h-5" />
                <span>{t('auth.register.success_button')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-primary-light/20 flex flex-col justify-center p-4 md:p-6 lg:p-8 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">
            {t('auth.register.title')}
          </h1>
          <p className="text-sm md:text-base text-secondary">{name}</p>
        </div>

        {/* Registration card */}
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

            {/* First name and Last name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('auth.register.first_name_label')}
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                placeholder="John"
              />
              <Input
                label={t('auth.register.last_name_label')}
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                placeholder="Doe"
              />
            </div>

            {/* Email */}
            <Input
              label={t('auth.register.email_label')}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder={`your.email${allowedDomains[0] || '@example.com'}`}
              helperText={t('auth.register.email_helper', { domains: allowedDomains.join(', ') })}
            />

            {/* Password */}
            <Input
              label={t('auth.register.password_label')}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="••••••••"
              helperText={t('auth.register.password_helper')}
            />

            {/* Confirm password */}
            <Input
              label={t('auth.register.confirm_password_label')}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="••••••••"
            />

            {/* GDPR consent checkbox */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={e => {
                  setAcceptedTerms(e.target.checked);
                  if (validationErrors.length > 0) {
                    setValidationErrors([]);
                  }
                }}
                className="mt-0.5 w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
              />
              <label
                htmlFor="acceptTerms"
                className="text-sm text-secondary leading-relaxed cursor-pointer"
              >
                {t('auth.register.terms_text')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('terms')}
                  className="text-primary hover:text-primary-hover underline font-medium cursor-pointer"
                >
                  {t('auth.register.terms_link')}
                </button>{' '}
                {t('auth.register.and_the')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('privacy')}
                  className="text-primary hover:text-primary-hover underline font-medium cursor-pointer"
                >
                  {t('auth.register.privacy_link')}
                </button>
              </label>
            </div>

            {/* Register button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 shadow-lg shadow-primary/20"
              disabled={
                isLoading ||
                !formData.firstName ||
                !formData.lastName ||
                !formData.email ||
                !formData.password ||
                !formData.confirmPassword ||
                !acceptedTerms
              }
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.register.registering')}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>{t('auth.register.button')}</span>
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-secondary mt-6">
            {t('auth.register.existing_user')}{' '}
            <button
              type="button"
              onClick={() => navigate('login')}
              className="text-primary hover:text-primary-hover font-medium cursor-pointer"
            >
              {t('auth.register.sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
