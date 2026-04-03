import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LanguageSwitch } from '../components/LanguageSwitch';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const { navigate } = useRouter();
  const { name, allowedDomains } = useInstance();

  // Clean up errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    try {
      await login(email, password);
      navigate('exams');
    } catch {
      // Error is already handled by the store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-primary-light/20 flex flex-col justify-center p-4 md:p-6 lg:p-8 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">{t('auth.login.title')}</h1>
          <p className="text-sm md:text-base text-secondary">{name}</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error flex-1 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-error hover:text-error/80 transition-colors p-0.5 hover:bg-error/10 rounded"
                  aria-label={t('common.close_error')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Email */}
            <Input
              label={t('auth.login.email_label')}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={`your.email${allowedDomains[0] || '@example.com'}`}
            />

            {/* Password */}
            <Input
              label={t('auth.login.password_label')}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => navigate('forgot-password')}
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors hover:underline cursor-pointer"
              >
                {t('auth.login.forgot_password')}
              </button>
            </div>

            {/* Login button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 shadow-lg shadow-primary/20"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.login.signing_in')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>{t('auth.login.button')}</span>
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
              <span className="px-3 bg-white text-sm text-secondary font-medium">
                {t('auth.login.new_user')}
              </span>
            </div>
          </div>

          {/* Create account button */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate('register')}
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('auth.login.create_account')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
