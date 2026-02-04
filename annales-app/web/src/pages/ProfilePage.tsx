import { useState, useEffect } from 'react';
import { User, Key, Mail, Shield, Save, AlertCircle, X, Trash2, Download, FileJson } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PermissionUtils } from '../utils/permissions';
import { showSuccessToast } from '../utils/swal';

export default function ProfilePage() {
  const { user, token, updateProfile, changePassword, deleteAccount, logout, isLoading, error, clearError } =
    useAuthStore();
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
    if (!user || !token) {
      navigate('login');
    }
  }, [user, token, navigate]);

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
      showSuccessToast('Profil mis à jour');
    } catch {
      // Error handled by store
    }
  };

  // Password validation
  const validatePassword = () => {
    const errors: string[] = [];

    if (!currentPassword) {
      errors.push('Le mot de passe actuel est requis');
    }

    if (!newPassword) {
      errors.push('Le nouveau mot de passe est requis');
    } else if (newPassword.length < 8) {
      errors.push('Le nouveau mot de passe doit contenir au moins 8 caractères');
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(newPassword)) {
      errors.push('Le mot de passe doit contenir au moins une lettre et un chiffre');
    }

    if (newPassword !== confirmPassword) {
      errors.push('Les mots de passe ne correspondent pas');
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors([]);
      showSuccessToast('Mot de passe modifié');
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
      errors.push('La nouvelle adresse email est requise');
    } else if (!allowedDomains.some((domain) => newEmail.toLowerCase().endsWith(domain.toLowerCase()))) {
      const domains = allowedDomains.join(', ');
      errors.push(`L'email doit se terminer par un des domaines autorisés: ${domains}`);
    }

    if (!emailPassword) {
      errors.push('Le mot de passe est requis pour confirmer le changement');
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
      const response = await fetch('/api/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newEmail: newEmail.trim().toLowerCase(),
          password: emailPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailErrors([data.error || 'Erreur lors du changement d\'email']);
        return;
      }

      // Reset form
      setNewEmail('');
      setEmailPassword('');
      setEmailErrors([]);

      await Swal.fire({
        title: 'Email modifié',
        text: data.message || 'Un email de vérification a été envoyé à votre nouvelle adresse.',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });

      // Déconnecter l'utilisateur pour qu'il vérifie son nouvel email
      await Swal.fire({
        title: 'Vérification requise',
        text: 'Vous allez être déconnecté. Veuillez vérifier votre nouvelle adresse email avant de vous reconnecter.',
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });

      logout();
      navigate('login');
    } catch {
      setEmailErrors(['Erreur de connexion au serveur']);
    }
  };

  const handleEmailInputChange =
    (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (emailErrors.length > 0) {
        setEmailErrors([]);
      }
    };

  // Export data handler (RGPD)
  const handleExportData = async () => {
    try {
      const response = await fetch('/api/auth/data-export', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Échec de l\'export');
      }

      const data = await response.json();

      // Créer un blob JSON et déclencher le téléchargement
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const filename = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      await Swal.fire({
        title: 'Export réussi',
        text: 'Vos données ont été exportées avec succès.',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });
    } catch {
      await Swal.fire({
        title: 'Erreur',
        text: 'Impossible d\'exporter vos données.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    const firstConfirm = await Swal.fire({
      title: 'Supprimer votre compte ?',
      html: `
        <p class="text-gray-600 mb-2">Cette action est <strong>irréversible</strong>.</p>
        <p class="text-gray-600 text-sm">Toutes vos données seront supprimées : examens, commentaires, signalements.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Continuer',
      cancelButtonText: 'Annuler',
    });

    if (!firstConfirm.isConfirmed) return;

    const { value: password } = await Swal.fire({
      title: 'Confirmer la suppression',
      input: 'password',
      inputLabel: 'Entrez votre mot de passe pour confirmer',
      inputPlaceholder: 'Mot de passe',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Supprimer définitivement',
      cancelButtonText: 'Annuler',
      inputValidator: (value) => {
        if (!value) {
          return 'Le mot de passe est requis';
        }
        return null;
      },
    });

    if (!password) return;

    try {
      await deleteAccount(password);
      await Swal.fire({
        title: 'Compte supprimé',
        text: 'Votre compte a été supprimé avec succès.',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });
      navigate('login');
    } catch {
      // Error handled by store, but show a toast
      await Swal.fire({
        title: 'Erreur',
        text: error || 'Impossible de supprimer le compte',
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
          <h1 className="text-2xl font-bold text-secondary-dark">Mon profil</h1>
          <p className="text-secondary">Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* Layout 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche */}
        <div className="space-y-6">
          {/* User Info Card (read-only) */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Informations du compte
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
                  <label className="block text-sm font-medium text-secondary mb-1.5">Rôle</label>
                  <div className="px-4 py-3 bg-bg-tertiary rounded-xl text-secondary-dark border border-border flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {PermissionUtils.getRoleLabel(user.role)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Statut</label>
                  <div className="px-4 py-3 bg-bg-tertiary rounded-xl border border-border flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${user.isVerified ? 'bg-success' : 'bg-warning'}`}
                    />
                    <span className="text-secondary-dark">
                      {user.isVerified ? 'Vérifié' : 'Non vérifié'}
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
              Modifier mes informations
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
                  label="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  required
                />
                <Input
                  label="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
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
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Change Email Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Changer l&apos;adresse email
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
                  Après changement, vous devrez vérifier votre nouvelle adresse email avant de
                  pouvoir vous reconnecter. Vous serez automatiquement déconnecté.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <label className="block text-xs font-medium text-secondary mb-1">
                  Email actuel
                </label>
                <p className="text-sm text-secondary-dark">{user?.email}</p>
              </div>

              <Input
                label="Nouvelle adresse email"
                type="email"
                value={newEmail}
                onChange={handleEmailInputChange(setNewEmail)}
                placeholder={`nouvelle.adresse${allowedDomains[0] || '@example.com'}`}
                helperText={`Seuls les emails ${allowedDomains.join(', ')} sont acceptés`}
                autoComplete="email"
              />

              <Input
                label="Mot de passe actuel (confirmation)"
                type="password"
                value={emailPassword}
                onChange={handleEmailInputChange(setEmailPassword)}
                placeholder="Votre mot de passe actuel"
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
                    Modification...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Changer l&apos;email
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Changer le mot de passe
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
                label="Mot de passe actuel"
                type="password"
                value={currentPassword}
                onChange={handlePasswordInputChange(setCurrentPassword)}
                placeholder="Votre mot de passe actuel"
                autoComplete="current-password"
              />

              <Input
                label="Nouveau mot de passe"
                type="password"
                value={newPassword}
                onChange={handlePasswordInputChange(setNewPassword)}
                placeholder="Nouveau mot de passe"
                helperText="Au moins 8 caractères avec une lettre et un chiffre"
                autoComplete="new-password"
              />

              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                value={confirmPassword}
                onChange={handlePasswordInputChange(setConfirmPassword)}
                placeholder="Confirmer le mot de passe"
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
                    Modification...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Changer le mot de passe
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* RGPD - Données personnelles */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-secondary-dark mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Données personnelles (RGPD)
            </h2>
            <p className="text-sm text-secondary mb-4">
              Conformément au RGPD, vous pouvez exporter toutes vos données au format JSON.
            </p>
            <div className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportData}
                className="gap-2 w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                Exporter mes données
              </Button>
              <div className="flex items-start gap-2 text-xs text-secondary">
                <FileJson className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  L&apos;export inclut : profil, examens uploadés, commentaires, signalements.
                  Consultez notre{' '}
                  <button
                    type="button"
                    onClick={() => navigate('privacy')}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Politique de Confidentialité
                  </button>
                  {' '}pour plus d&apos;informations.
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-error/30 p-6 shadow-lg shadow-black/5">
            <h2 className="text-lg font-semibold text-error mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zone de danger
            </h2>
            <p className="text-sm text-secondary mb-4">
              Supprimer définitivement votre compte et toutes vos données.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
