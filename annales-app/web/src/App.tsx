import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import UploadPage from './pages/UploadPage';
import AdminReportsPage from './pages/AdminReportsPage';
import { LanguageSwitch } from './components/LanguageSwitch';
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
import { ArrowLeft, Download, AlertTriangle, Trash2, Menu, X } from 'lucide-react';
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
  const { t } = useTranslation();
  const { currentRoute, navigate, isPage, getExamId } = useRouter();
  const { user, logout } = useAuthStore();
  const { name } = useInstance();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on navigation
  const handleNavigate = (
    page: Parameters<typeof navigate>[0],
    params?: Parameters<typeof navigate>[1]
  ) => {
    setMobileMenuOpen(false);
    navigate(page, params);
  };

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
      await showError(t('common.error'), t('exams.card.download_error'));
    }
  };

  // Delete the selected exam
  const handleDeleteExam = async () => {
    if (!selectedExam || !user) return;

    const confirmed = await showConfirm(
      t('exams.viewer.delete_confirm'),
      t('exams.viewer.delete_confirm_message', { title: selectedExam.title }),
      { confirmText: t('exams.viewer.delete_confirm_button'), cancelText: t('common.cancel') }
    );
    if (!confirmed) return;

    try {
      const response = await apiFetch(`/api/exams/${selectedExam._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await showSuccess(
          t('exams.viewer.delete_success_title'),
          t('exams.viewer.delete_success_message')
        );
        navigate('exams');
        setSelectedExam(null);
      } else {
        const errorData = await response.json();
        await showError(t('common.error'), errorData.error || t('exams.viewer.delete_error'));
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      await showError(t('common.error'), t('exams.viewer.delete_error_generic'));
    }
  };

  // Report the selected exam
  const handleReportExam = async () => {
    if (!selectedExam || !user) return;

    const reportData = await showReportModal(t('exams.viewer.report_title'), 'exam');
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
                <span className="text-secondary">{t('exams.viewer.loading')}</span>
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
                    title={t('exams.viewer.back_title')}
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
                            {selectedExam.pages === 1
                              ? t('exams.card.page_count', { count: selectedExam.pages })
                              : t('exams.card.page_count_plural', { count: selectedExam.pages })}
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
                    title={t('exams.viewer.download_title')}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden md:inline">{t('exams.viewer.download_button')}</span>
                  </Button>

                  {/* Report button */}
                  <button
                    onClick={handleReportExam}
                    className="flex items-center gap-2 px-3 md:px-4 h-10 bg-warning/10 hover:bg-warning/20 text-warning rounded-lg transition-colors cursor-pointer"
                    title={t('exams.viewer.report_title')}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">
                      {t('exams.viewer.report_button')}
                    </span>
                  </button>

                  {/* Delete button (owner or admin) */}
                  {PermissionUtils.canDelete(user, selectedExam.uploadedBy) && (
                    <Button
                      onClick={handleDeleteExam}
                      variant="danger"
                      size="md"
                      className="gap-2"
                      title={t('exams.viewer.delete_title')}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden md:inline">{t('exams.viewer.delete_button')}</span>
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
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 p-4">
            {/* Left: Instance name + desktop nav buttons */}
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{name}</h1>
              <div className="hidden lg:flex space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleNavigate('exams')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    isPage('exams')
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('nav.exams')}
                </button>
                <button
                  onClick={() => handleNavigate('upload')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    isPage('upload')
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('nav.upload')}
                </button>
                {PermissionUtils.isAdmin(user) && (
                  <>
                    <button
                      onClick={() => handleNavigate('admin-reports')}
                      className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                        isPage('admin-reports')
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {t('nav.reports')}
                    </button>
                    <button
                      onClick={() => handleNavigate('admin-users')}
                      className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                        isPage('admin-users')
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {t('nav.users')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right: Desktop user section */}
            <div className="hidden lg:flex items-center space-x-4 flex-shrink-0">
              {user && (
                <>
                  <button
                    onClick={() => handleNavigate('profile')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap"
                    title={t('nav.profile_title')}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </span>
                    {PermissionUtils.isAdmin(user) && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                        {t('nav.admin_badge')}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      handleNavigate('login');
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                  >
                    {t('nav.sign_out')}
                  </button>
                  <LanguageSwitch />
                </>
              )}
            </div>

            {/* Mobile: profile icon + hamburger */}
            <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleNavigate('profile')}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                title={t('nav.profile_title')}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900 max-w-[8rem] truncate">
                  {user?.firstName}
                </span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label={t('nav.menu')}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="font-semibold text-gray-900">{t('nav.menu')}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button
                onClick={() => handleNavigate('exams')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  isPage('exams') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('nav.exams')}
              </button>
              <button
                onClick={() => handleNavigate('upload')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  isPage('upload') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('nav.upload')}
              </button>
              {PermissionUtils.isAdmin(user) && (
                <>
                  <button
                    onClick={() => handleNavigate('admin-reports')}
                    className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isPage('admin-reports')
                        ? 'bg-purple-500 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    {t('nav.reports')}
                  </button>
                  <button
                    onClick={() => handleNavigate('admin-users')}
                    className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isPage('admin-users')
                        ? 'bg-purple-500 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    {t('nav.users')}
                  </button>
                </>
              )}
            </div>
            <div className="border-t border-gray-200 p-4 flex items-center justify-between">
              <button
                onClick={() => {
                  logout();
                  handleNavigate('login');
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                {t('nav.sign_out')}
              </button>
              <LanguageSwitch />
            </div>
          </div>
        </>
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
