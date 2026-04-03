import { useState, useEffect, useCallback } from 'react';
import UploadPage from './pages/UploadPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ExamList from './components/ExamList';
import PdfAnnotator from './components/PdfAnnotator';
import { ArrowLeft, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from './components/ui/Button';
import { useRouter } from './hooks/useRouter';
import { useAuthStore } from './stores/authStore';
import { InstanceProvider } from './contexts/InstanceContext';
import { useInstance } from './hooks/useInstance';
import { PermissionUtils } from './utils/permissions';
import { showReportModal, showReportSuccess, showReportError } from './utils/reportModal';
import { showError, showSuccess, showConfirm } from './utils/swal';
import { apiFetch } from './utils/api';
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
  const { user, logout } = useAuthStore();
  const { name } = useInstance();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Load an exam by its ID (for direct URLs)
  const loadExamById = useCallback(
    async (examId: string): Promise<Exam | null> => {
      if (!user) return null;

      try {
        const response = await apiFetch(`/api/exams/${examId}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Error loading exam:', error);
      }
      return null;
    },
    [user]
  );

  // Handle exam selection
  const handleExamSelect = (exam: Exam) => {
    setSelectedExam(exam);
    navigate('viewer', { examId: exam._id });
  };

  // Navigate back to exams list
  const navigateBack = () => {
    setSelectedExam(null);
    navigate('exams');
  };

  // Download the selected exam's PDF
  const handleDownloadPdf = async () => {
    if (!selectedExam || !user) return;

    try {
      // Download file with authentication
      const response = await apiFetch(`/api/files/${selectedExam._id}/download`);

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Create a blob and trigger the download
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

      // Free memory
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      await showError('Error', 'Unable to download the file');
    }
  };

  // Delete the selected exam
  const handleDeleteExam = async () => {
    if (!selectedExam || !user) return;

    const confirmed = await showConfirm(
      'Delete this exam?',
      `"${selectedExam.title}" will be permanently deleted.`,
      { confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    try {
      const response = await apiFetch(`/api/exams/${selectedExam._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await showSuccess('Exam deleted', 'The exam has been successfully deleted.');
        navigate('exams');
        setSelectedExam(null);
      } else {
        const errorData = await response.json();
        await showError('Error', errorData.error || 'Unable to delete the exam');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      await showError('Error', 'An error occurred while deleting');
    }
  };

  // Report the selected exam
  const handleReportExam = async () => {
    if (!selectedExam || !user) return;

    const reportData = await showReportModal('Report this exam', 'exam');
    if (!reportData) return;

    try {
      const response = await apiFetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      console.error('Error reporting exam:', error);
      await showReportError();
    }
  };

  // Sync state with URL on load
  useEffect(() => {
    const examId = getExamId();

    if (isPage('viewer') && examId && !selectedExam) {
      // Direct URL to an exam, load it
      loadExamById(examId).then(exam => {
        if (exam) {
          setSelectedExam(exam);
        } else {
          // Exam not found, redirect to list
          navigate('exams');
        }
      });
    }
  }, [currentRoute, selectedExam, isPage, getExamId, navigate, loadExamById]);

  const renderCurrentPage = () => {
    // Authentication and legal pages - always accessible
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
      case 'privacy':
        return <PrivacyPage />;
      case 'terms':
        return <TermsPage />;
    }

    // Protected pages - require authentication
    if (!user) {
      navigate('login');
      return null;
    }

    switch (currentRoute.page) {
      case 'upload':
        return <UploadPage />;
      case 'admin-reports':
        return <AdminReportsPage />;
      case 'admin-users':
        return <AdminUsersPage />;
      case 'profile':
        return <ProfilePage />;
      case 'exams':
        return <ExamList onExamSelect={handleExamSelect} />;
      case 'viewer':
        if (!selectedExam) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span className="text-secondary">Loading exam...</span>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Header with actions */}
            <div className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left: Back button + Title */}
                <div className="flex items-start gap-4">
                  <button
                    onClick={navigateBack}
                    className="flex items-center gap-2 text-primary hover:text-primary-hover transition-colors cursor-pointer mt-1"
                    title="Back to exams"
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
                          <span>
                            {selectedExam.pages} page{selectedExam.pages > 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Download button */}
                  <Button
                    onClick={handleDownloadPdf}
                    variant="secondary"
                    size="md"
                    className="gap-2"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden md:inline">Download</span>
                  </Button>

                  {/* Report button */}
                  <button
                    onClick={handleReportExam}
                    className="flex items-center gap-2 px-3 md:px-4 h-10 bg-warning/10 hover:bg-warning/20 text-warning rounded-lg transition-colors cursor-pointer"
                    title="Report this exam"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">Report</span>
                  </button>

                  {/* Delete button (owner or admin) */}
                  {PermissionUtils.canDelete(user, selectedExam.uploadedBy) && (
                    <Button
                      onClick={handleDeleteExam}
                      variant="danger"
                      size="md"
                      className="gap-2"
                      title="Delete this exam"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden md:inline">Delete</span>
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

  // Hide navigation for authentication and legal pages
  const shouldShowNavigation =
    user &&
    ![
      'login',
      'register',
      'forgot-password',
      'reset-password',
      'verify-email',
      'privacy',
      'terms',
    ].includes(currentRoute.page);

  return (
    <div className="min-h-screen bg-gray-50">
      {shouldShowNavigation && (
        <nav className="bg-white shadow-sm border-b p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-gray-900">{name}</h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate('exams')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    isPage('exams')
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Exams
                </button>
                <button
                  onClick={() => navigate('upload')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    isPage('upload')
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload
                </button>
                {PermissionUtils.isAdmin(user) && (
                  <>
                    <button
                      onClick={() => navigate('admin-reports')}
                      className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                        isPage('admin-reports')
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      Reports
                    </button>
                    <button
                      onClick={() => navigate('admin-users')}
                      className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                        isPage('admin-users')
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      Users
                    </button>
                  </>
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
                  <button
                    onClick={() => navigate('profile')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="My profile"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </span>
                    {PermissionUtils.isAdmin(user) && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                        Admin
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      navigate('login');
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className={shouldShowNavigation ? 'max-w-[90rem] mx-auto p-4 md:p-6 lg:p-8' : ''}>
        {renderCurrentPage()}
      </main>
    </div>
  );
}

// Wrap App with InstanceProvider to provide instance config throughout the app
export default function AppWithProviders() {
  return (
    <InstanceProvider>
      <App />
    </InstanceProvider>
  );
}
