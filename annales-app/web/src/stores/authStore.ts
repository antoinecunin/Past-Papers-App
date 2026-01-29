import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const API_BASE = '/api/auth';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur de connexion');
          }

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur de connexion',
          });
          throw error;
        }
      },

      register: async userData => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Erreur d'inscription");
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Erreur d'inscription",
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          error: null,
        });
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/forgot-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la demande');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur lors de la demande',
          });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/reset-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la réinitialisation');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur lors de la réinitialisation',
          });
          throw error;
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/verify-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur de vérification');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur de vérification',
          });
          throw error;
        }
      },

      resendVerification: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/resend-verification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur lors du renvoi');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur lors du renvoi',
          });
          throw error;
        }
      },

      updateProfile: async (data: { firstName?: string; lastName?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const { token } = get();
          const response = await fetch(`${API_BASE}/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de la mise à jour');
          }

          // Mettre à jour l'utilisateur dans le store
          set({ user: result.user, isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
          });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const { token } = get();
          const response = await fetch(`${API_BASE}/change-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ currentPassword, newPassword }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors du changement de mot de passe');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur lors du changement',
          });
          throw error;
        }
      },

      deleteAccount: async (password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { token } = get();
          const response = await fetch(`${API_BASE}/account`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ password }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de la suppression');
          }

          // Déconnexion après suppression
          set({ user: null, token: null, isLoading: false, error: null });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erreur lors de la suppression',
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
