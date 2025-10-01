import { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage';
import AdminReportsPage from './pages/AdminReportsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ExamList from './components/ExamList';
import PdfAnnotator from './components/PdfAnnotator';
import { ArrowLeft, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from './components/ui/Button';
import { useRouter } from './hooks/useRouter';
import { useAuthStore } from './stores/authStore';
import { PermissionUtils } from './utils/permissions';
import { showReportModal, showReportSuccess, showReportError } from './utils/reportModal';
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
    if (!token) return null;

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
  const handleDownloadPdf = async () => {
    if (!selectedExam || !token) return;

    try {
      // Télécharger le fichier avec authentification
      const response = await fetch(`/api/files/${selectedExam._id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Créer un blob et déclencher le téléchargement
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `${selectedExam.title.replace(/[^a-zA-Z0-9]/g, '_')}${selectedExam.year ? `_${selectedExam.year}` : ''}.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Libérer la mémoire
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
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

  // Signalement de l'examen sélectionné
  const handleReportExam = async () => {
    if (!selectedExam || !user || !token) return;

    const reportData = await showReportModal('Signaler cet examen', 'exam');
    if (!reportData) return;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'exam',
          targetId: selectedExam._id,
          reason: reportData.reason,
          description: reportData.description || undefined,
        }),
      });

      if (response.ok) {
        await showReportSuccess();
      } else {
        const errorData = await response.json();
        await showReportError(errorData.error);
      }
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      await showReportError();
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
      case 'admin-reports':
        return <AdminReportsPage />;
      case 'exams':
        return <ExamList onExamSelect={handleExamSelect} />;
      case 'viewer':
        if (!selectedExam) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span className="text-secondary">Chargement de l&apos;examen...</span>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Header avec actions */}
            <div className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left: Back button + Title */}
                <div className="flex items-start gap-4">
                  <button
                    onClick={navigateBack}
                    className="flex items-center gap-2 text-primary hover:text-primary-hover transition-colors cursor-pointer mt-1"
                    title="Retour aux examens"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-bold text-secondary-dark mb-1">
                      {selectedExam.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                      {selectedExam.module && <span>{selectedExam.module}</span>}
                      {selectedExam.module && selectedExam.year && <span>•</span>}
                      {selectedExam.year && <span>{selectedExam.year}</span>}
                      {selectedExam.pages && (
                        <>
                          <span>•</span>
                          <span>{selectedExam.pages} page{selectedExam.pages > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Bouton de téléchargement */}
                  <Button
                    onClick={handleDownloadPdf}
                    variant="secondary"
                    size="md"
                    className="gap-2"
                    title="Télécharger le PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden md:inline">Télécharger</span>
                  </Button>

                  {/* Bouton de signalement */}
                  <button
                    onClick={handleReportExam}
                    className="flex items-center gap-2 px-3 md:px-4 h-10 bg-warning/10 hover:bg-warning/20 text-warning rounded-lg transition-colors cursor-pointer"
                    title="Signaler cet examen"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">Signaler</span>
                  </button>

                  {/* Bouton de suppression (propriétaire ou admin) */}
                  {PermissionUtils.canDelete(user, selectedExam.uploadedBy) && (
                    <Button
                      onClick={handleDeleteExam}
                      variant="danger"
                      size="md"
                      className="gap-2"
                      title="Supprimer cet examen"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden md:inline">Supprimer</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* PDF Annotator */}
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
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    isPage('exams')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Examens
                </button>
                <button
                  onClick={() => navigate('upload')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    isPage('upload')
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload
                </button>
                {PermissionUtils.isAdmin(user) && (
                  <button
                    onClick={() => navigate('admin-reports')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                      isPage('admin-reports')
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    Signalements
                  </button>
                )}
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
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </span>
                    {PermissionUtils.isAdmin(user) && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('login');
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
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
