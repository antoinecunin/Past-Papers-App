import { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage';
import ExamList from './components/ExamList';
import PdfAnnotator from './components/PdfAnnotator';
import { BackIcon, DownloadIcon } from './components/ui/Icon';
import { useRouter } from './hooks/useRouter';
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
}

function App() {
  const { currentRoute, navigate, isPage, getExamId } = useRouter();
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

              {/* Bouton de téléchargement */}
              <button
                onClick={handleDownloadPdf}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-colors"
                title="Télécharger le PDF"
              >
                <DownloadIcon size="md" className="text-gray-600" />
                <span className="font-medium">Télécharger PDF</span>
              </button>
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

  return (
    <div className="min-h-screen bg-gray-50">
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

          {isPage('viewer') && selectedExam && (
            <div className="text-sm text-gray-500">
              {selectedExam.pages &&
                `${selectedExam.pages} page${selectedExam.pages > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4">{renderCurrentPage()}</main>
    </div>
  );
}

export default App;
