import React, { useState, useEffect } from "react";
import { AlertCircle, X, LogIn, UserPlus } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "../hooks/useRouter";
import { useInstance } from "../hooks/useInstance";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();
  const { navigate } = useRouter();
  const { name } = useInstance();

  // Nettoyer les erreurs au démontage
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
      navigate("exams");
    } catch {
      // L'erreur est déjà gérée par le store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-white to-primary-light/20 flex flex-col justify-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header avec design amélioré */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-dark mb-2">
            Bienvenue
          </h1>
          <p className="text-sm md:text-base text-secondary">{name}</p>
        </div>

        {/* Card de connexion avec ombre plus prononcée */}
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Message d'erreur amélioré */}
            {error && (
              <div className="bg-error-bg border border-error/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error flex-1 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-error hover:text-error/80 transition-colors p-0.5 hover:bg-error/10 rounded"
                  aria-label="Fermer le message d'erreur"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Email */}
            <Input
              label="Adresse email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@etu.unistra.fr"
            />

            {/* Mot de passe */}
            <Input
              label="Mot de passe"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {/* Mot de passe oublié */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => navigate("forgot-password")}
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors hover:underline cursor-pointer"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Bouton connexion avec icône */}
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
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Se connecter</span>
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
                Nouveau sur la plateforme ?
              </span>
            </div>
          </div>

          {/* Bouton créer un compte avec icône */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate("register")}
          >
            <UserPlus className="w-5 h-5" />
            <span>Créer un compte</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
