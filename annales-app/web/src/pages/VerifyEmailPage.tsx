import React, { useState, useEffect } from 'react';
import { AlertCircle, X, CheckCircle, LogIn, UserPlus, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function VerifyEmailPage() {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>(
    'pending'
  );
  const [email, setEmail] = useState('');

  const { verifyEmail, resendVerification, isLoading, error, clearError } = useAuthStore();
  const { navigate, currentRoute } = useRouter();
  const { allowedDomains } = useInstance();

  const token = currentRoute.params.token;

  // Note: No automatic redirect - allows a logged-in user to access this page

  // Automatically verify token on page load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerificationStatus('error');
        return;
      }

      try {
        await verifyEmail(token);
        setVerificationStatus('success');
      } catch {
        setVerificationStatus('error');
      }
    };

    verifyToken();
  }, [token, verifyEmail]);

  // Clean up errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    try {
      await resendVerification(email);
      // Optional: show a success message
    } catch {
      // Error is already handled by the store
    }
  };

  if (verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-info-bg/30 flex flex-col justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-border p-8 md:p-12 shadow-xl shadow-black/5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-info/10 mb-4">
                <div className="w-8 h-8 border-2 border-info/30 border-t-info rounded-full animate-spin"></div>
              </div>
              <h3 className="text-2xl font-bold text-secondary-dark mb-3">
                Verification in progress...
              </h3>
              <p className="text-sm md:text-base text-secondary leading-relaxed">
                We are verifying your email address, please wait.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-success-bg/30 flex flex-col justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10 mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-2xl font-bold text-secondary-dark mb-3">Email verified!</h3>
              <p className="text-sm md:text-base text-secondary leading-relaxed mb-6">
                Your email address has been verified successfully. You can now sign in to your
                account.
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-lg shadow-primary/20"
                onClick={() => navigate('login')}
              >
                <LogIn className="w-5 h-5" />
                <span>Sign in</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // verificationStatus === 'error'
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-error-bg/30 flex flex-col justify-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error/10 mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">
            Verification problem
          </h1>
          <p className="text-sm md:text-base text-secondary">
            The verification link is invalid or has expired
          </p>
        </div>

        {/* Verification card */}
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
          {/* Error messages */}
          {error && (
            <div className="mb-6 bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-sm text-error font-medium">{error}</p>
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

          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-secondary-dark mb-2">
              Expired or invalid link
            </h3>
            <p className="text-sm text-secondary">
              This verification link is no longer valid. You can request a new verification link
              below.
            </p>
          </div>

          <form onSubmit={handleResendVerification} className="space-y-5">
            {/* Email input */}
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
                  <RotateCcw className="w-5 h-5" />
                  <span>Resend verification email</span>
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
              <span>Create a new account</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
