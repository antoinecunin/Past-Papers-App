import React, { useState, useEffect } from 'react';
import { AlertCircle, X, UserPlus, CheckCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function RegisterPage() {
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

  // Note: Pas de redirection automatique - permet à un utilisateur connecté de voir la page d'inscription

  // Nettoyer les erreurs au démontage
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.firstName.trim()) {
      errors.push('Le prénom est requis');
    }

    if (!formData.lastName.trim()) {
      errors.push('Le nom est requis');
    }

    if (!formData.email.trim()) {
      errors.push("L'email est requis");
    } else if (!allowedDomains.some((domain) => formData.email.toLowerCase().endsWith(domain.toLowerCase()))) {
      const domains = allowedDomains.join(', ');
      errors.push(`L'email doit se terminer par un des domaines autorisés: ${domains}`);
    }

    if (!formData.password) {
      errors.push('Le mot de passe est requis');
    } else if (formData.password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre et un chiffre');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Les mots de passe ne correspondent pas');
    }

    if (!acceptedTerms) {
      errors.push('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité');
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
      // L'erreur est déjà gérée par le store
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
      // Nettoyer les erreurs de validation lors de la saisie
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
              <h3 className="text-2xl font-bold text-secondary-dark mb-3">Inscription réussie !</h3>
              <p className="text-sm md:text-base text-secondary leading-relaxed mb-6">
                Un email de vérification a été envoyé à votre adresse email. Veuillez cliquer sur le
                lien contenu dans l&apos;email pour activer votre compte.
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-lg shadow-primary/20"
                onClick={() => navigate('login')}
              >
                <LogIn className="w-5 h-5" />
                <span>Aller à la page de connexion</span>
              </Button>
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
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">
            Créer un compte
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
                  aria-label="Fermer le message d'erreur"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Prénom et Nom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                placeholder="Jean"
              />
              <Input
                label="Nom"
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                placeholder="Dupont"
              />
            </div>

            {/* Email */}
            <Input
              label="Adresse email universitaire"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder={`votre.email${allowedDomains[0] || '@example.com'}`}
              helperText={`Seuls les emails ${allowedDomains.join(', ')} sont acceptés`}
            />

            {/* Mot de passe */}
            <Input
              label="Mot de passe"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="••••••••"
              helperText="Au moins 8 caractères avec une lettre et un chiffre"
            />

            {/* Confirmation mot de passe */}
            <Input
              label="Confirmer le mot de passe"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="••••••••"
            />

            {/* Checkbox consentement RGPD */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (validationErrors.length > 0) {
                    setValidationErrors([]);
                  }
                }}
                className="mt-0.5 w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-secondary leading-relaxed cursor-pointer">
                J&apos;accepte les{' '}
                <button
                  type="button"
                  onClick={() => navigate('terms')}
                  className="text-primary hover:text-primary-hover underline font-medium cursor-pointer"
                >
                  Conditions Générales d&apos;Utilisation
                </button>{' '}
                et la{' '}
                <button
                  type="button"
                  onClick={() => navigate('privacy')}
                  className="text-primary hover:text-primary-hover underline font-medium cursor-pointer"
                >
                  Politique de Confidentialité
                </button>
              </label>
            </div>

            {/* Bouton inscription */}
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
                  <span>Inscription...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Créer le compte</span>
                </>
              )}
            </Button>
          </form>

          {/* Séparateur */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-sm text-secondary font-medium">
                Déjà un compte ?
              </span>
            </div>
          </div>

          {/* Bouton connexion */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate('login')}
          >
            <LogIn className="w-5 h-5" />
            <span>Se connecter</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
