import { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ExamList from './components/ExamList';
import PdfAnnotator from './components/PdfAnnotator';
import { BackIcon, DownloadIcon } from './components/ui/Icon';
import { useRouter } from './hooks/useRouter';
import { useAuthStore } from './stores/authStore';
import { PermissionUtils } from './utils/permissions';
import './App.css';

interface Exam {
  _id: string;
  title: string;
  year?: number;
  module?: string;
  fileKey: string;
  pages?: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
}

function App() {
  const { currentRoute, navigate, isPage, getExamId } = useRouter();
  const { user, token, logout } = useAuthStore();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Charger un examen depuis son ID (pour les URL directes)
  const loadExamById = async (examId: string): Promise<Exam | null> => {
    try {
      const response = await fetch(`/api/exams/${examId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'examen:", error);
    }
    return null;
  };

  // Gérer la sélection d'un examen
  const handleExamSelect = (exam: Exam) => {
    setSelectedExam(exam);
    navigate('viewer', { examId: exam._id });
  };

  // Navigation vers la liste des examens
  const navigateBack = () => {
    setSelectedExam(null);
    navigate('exams');
  };

  // Téléchargement du PDF de l'examen sélectionné
  const handleDownloadPdf = () => {
    if (!selectedExam) return;

    // Créer un nom de fichier lisible
    const filename = `${selectedExam.title.replace(/[^a-zA-Z0-9]/g, '_')}${selectedExam.year ? `_${selectedExam.year}` : ''}.pdf`;

    // Créer un lien temporaire pour déclencher le téléchargement
    const link = document.createElement('a');
    link.href = `/api/files/${selectedExam._id}/download`;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Suppression de l'examen sélectionné
  const handleDeleteExam = async () => {
    if (!selectedExam || !user || !token) return;

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${selectedExam.title}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/exams/${selectedExam._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Examen supprimé avec succès');
        navigate('exams');
        setSelectedExam(null);
      } else {
        const errorData = await response.json();
        alert(`Erreur lors de la suppression: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert("Erreur lors de la suppression de l'examen");
    }
  };

  // Effet pour synchroniser l'état avec l'URL au chargement
  useEffect(() => {
    const examId = getExamId();

    if (isPage('viewer') && examId && !selectedExam) {
      // URL directe vers un examen, charger l'examen
      loadExamById(examId).then(exam => {
        if (exam) {
          setSelectedExam(exam);
        } else {
          // Examen non trouvé, rediriger vers la liste
          navigate('exams');
        }
      });
    }
  }, [currentRoute, selectedExam, isPage, getExamId, navigate]);

  const renderCurrentPage = () => {
    // Pages d'authentification - toujours accessibles
    switch (currentRoute.page) {
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'forgot-password':
        return <ForgotPasswordPage />;
      case 'reset-password':
        return <ResetPasswordPage />;
      case 'verify-email':
        return <VerifyEmailPage />;
    }

    // Pages protégées - nécessitent une authentification
    if (!user) {
      navigate('login');
      return null;
    }

    switch (currentRoute.page) {
      case 'upload':
        return <UploadPage />;
      case 'exams':
        return <ExamList onExamSelect={handleExamSelect} />;
      case 'viewer':
        if (!selectedExam) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement de l&apos;examen...</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateBack}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <BackIcon />
                  <span>Retour aux examens</span>
                </button>
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">{selectedExam.title}</h1>
                  {selectedExam.module && selectedExam.year && (
                    <p className="text-sm text-gray-600">
                      {selectedExam.module} - {selectedExam.year}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Bouton de téléchargement */}
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-colors"
                  title="Télécharger le PDF"
                >
                  <DownloadIcon size="md" className="text-gray-600" />
                  <span className="font-medium">Télécharger PDF</span>
                </button>

                {/* Bouton de suppression (propriétaire ou admin) */}
                {PermissionUtils.canDelete(user, selectedExam.uploadedBy) && (
                  <button
                    onClick={handleDeleteExam}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 rounded-lg transition-colors"
                    title="Supprimer cet examen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span className="font-medium">Supprimer</span>
                  </button>
                )}
              </div>
            </div>
            <PdfAnnotator
              pdfUrl={`/api/files/${selectedExam._id}/download`}
              examId={selectedExam._id}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Masquer la navigation pour les pages d'authentification
  const shouldShowNavigation =
    user &&
    !['login', 'register', 'forgot-password', 'reset-password', 'verify-email'].includes(
      currentRoute.page
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {shouldShowNavigation && (
        <nav className="bg-white shadow-sm border-b p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-gray-900">Plateforme d&apos;Annales</h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate('exams')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isPage('exams')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Examens
                </button>
                <button
                  onClick={() => navigate('upload')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isPage('upload')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isPage('viewer') && selectedExam && (
                <div className="text-sm text-gray-500">
                  {selectedExam.pages &&
                    `${selectedExam.pages} page${selectedExam.pages > 1 ? 's' : ''}`}
                </div>
              )}

              {user && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {user.firstName} {user.lastName}
                    </span>
                    {PermissionUtils.isAdmin(user) && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('login');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className={shouldShowNavigation ? 'max-w-6xl mx-auto p-4' : ''}>
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;
