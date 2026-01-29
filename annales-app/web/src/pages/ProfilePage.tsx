import { useState, useEffect } from 'react';
import { User, Key, Mail, Shield, Save, AlertCircle, X, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PermissionUtils } from '../utils/permissions';
import { showSuccessToast } from '../utils/swal';

export default function ProfilePage() {
  const { user, token, updateProfile, changePassword, deleteAccount, isLoading, error, clearError } =
    useAuthStore();
  const { navigate } = useRouter();

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

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
