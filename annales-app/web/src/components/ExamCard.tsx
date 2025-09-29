import { ModuleIcon, DocumentIcon, EyeIcon, DownloadIcon } from './ui/Icon';

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

interface ExamCardProps {
  exam: Exam;
  onSelect?: (exam: Exam) => void;
  onReport?: (examId: string) => void;
}

/**
 * Composant pour afficher une carte d'examen individuelle
 * Respecte les patterns de design existants du projet
 */
export default function ExamCard({ exam, onSelect, onReport }: ExamCardProps) {
  const handleClick = () => {
    onSelect?.(exam);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche l'ouverture de l'examen

    // Créer un nom de fichier lisible
    const filename = `${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}${exam.year ? `_${exam.year}` : ''}.pdf`;

    // Créer un lien temporaire pour déclencher le téléchargement
    const link = document.createElement('a');
    link.href = `/api/files/${exam._id}/download`;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche l'ouverture de l'examen
    onReport?.(exam._id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* En-tête avec titre et année */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-base font-semibold text-gray-900 flex-1 mr-2 leading-tight">
          {exam.title}
        </h3>
        {exam.year && (
          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded shrink-0">
            {exam.year}
          </span>
        )}
      </div>

      {/* Métadonnées */}
      <div className="space-y-1 mb-3">
        {exam.module && (
          <div className="flex items-center space-x-1">
            <ModuleIcon />
            <span className="text-xs text-gray-600 font-medium">{exam.module}</span>
          </div>
        )}
        {exam.pages && (
          <div className="flex items-center space-x-1">
            <DocumentIcon />
            <span className="text-xs text-gray-600">
              {exam.pages} page{exam.pages > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer avec date et actions */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">{formatDate(exam.createdAt)}</span>
        <div className="flex items-center space-x-3">
          {/* Bouton télécharger */}
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            title="Télécharger le PDF"
          >
            <DownloadIcon className="text-gray-600 hover:text-gray-800" />
            <span className="text-xs font-medium">PDF</span>
          </button>

          {/* Bouton signaler */}
          {onReport && (
            <button
              onClick={handleReport}
              className="flex items-center space-x-1 text-orange-600 hover:text-orange-800 transition-colors"
              title="Signaler cet examen"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span className="text-xs font-medium">⚠️</span>
            </button>
          )}

          {/* Bouton voir */}
          <div className="flex items-center space-x-1 text-blue-600 hover:text-blue-700">
            <EyeIcon className="text-blue-600 hover:text-blue-700" />
            <span className="text-xs font-medium">Voir</span>
          </div>
        </div>
      </div>
    </div>
  );
}
