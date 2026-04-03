import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Mail, LogIn, UserPlus, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const { navigate } = useRouter();
  const { name, allowedDomains } = useInstance();

  // Note: No automatic redirect - allows a logged-in user to access this page

  // Clean up errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch {
      // Error is already handled by the store
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-info-bg/30 flex flex-col justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-lg mx-auto">
          {/* Success card */}
          <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-info/10 mb-4">
                <Mail className="w-8 h-8 text-info" />
              </div>
              <h3 className="text-2xl font-bold text-secondary-dark mb-3">Email sent</h3>
              <p className="text-sm md:text-base text-secondary leading-relaxed mb-2">
                If this email address is associated with an account, you will receive a link to
                reset your password.
              </p>
              <p className="text-xs text-secondary/80 mb-6">Check your inbox and spam folder.</p>
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full gap-2 shadow-lg shadow-primary/20"
                  onClick={() => navigate('login')}
                >
                  <LogIn className="w-5 h-5" />
                  <span>Back to login</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Resend email</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-primary-light/20 flex flex-col justify-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">
            Forgot password
          </h1>
          <p className="text-sm md:text-base text-secondary">{name}</p>
          <p className="text-xs md:text-sm text-secondary/80 mt-2">
            Enter your email address to receive a reset link
          </p>
        </div>

        {/* Reset password card */}
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
                  className="text-error hover:text-error/80 transition-colors p-0.5 hover:bg-error/10 rounded cursor-pointer"
                  aria-label="Close error message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Email */}
            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={`your.email${allowedDomains[0] || '@example.com'}`}
            />

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 shadow-lg shadow-primary/20"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Send reset link</span>
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
              <span className="px-3 bg-white text-sm text-secondary font-medium">or</span>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full gap-2"
              onClick={() => navigate('login')}
            >
              <LogIn className="w-5 h-5" />
              <span>Back to login</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full gap-2"
              onClick={() => navigate('register')}
            >
              <UserPlus className="w-5 h-5" />
              <span>Create account</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
