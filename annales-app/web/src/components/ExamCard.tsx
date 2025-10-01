import { BookOpen, FileText, Eye, Download, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

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
  const { token } = useAuthStore();

  const handleClick = () => {
    onSelect?.(exam);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche l'ouverture de l'examen

    if (!token) return;

    try {
      // Télécharger le fichier avec authentification
      const response = await fetch(`/api/files/${exam._id}/download`, {
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
      const filename = `${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}${exam.year ? `_${exam.year}` : ''}.pdf`;

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
      className="bg-white border border-border rounded-xl p-4 md:p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-150 cursor-pointer group"
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
      <div className="flex justify-between items-start gap-3 mb-3">
        <h3 className="text-base md:text-lg font-semibold text-secondary-dark flex-1 leading-tight group-hover:text-primary transition-colors">
          {exam.title}
        </h3>
        {exam.year && (
          <span className="text-xs font-medium text-primary bg-primary-light px-2.5 py-1 rounded-lg shrink-0">
            {exam.year}
          </span>
        )}
      </div>

      {/* Métadonnées */}
      <div className="space-y-2 mb-4">
        {exam.module && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="text-xs md:text-sm text-secondary font-medium truncate">{exam.module}</span>
          </div>
        )}
        {exam.pages && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="text-xs md:text-sm text-secondary">
              {exam.pages} page{exam.pages > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer avec date et actions */}
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="text-xs text-secondary/70">{formatDate(exam.createdAt)}</span>
        <div className="flex items-center gap-2">
          {/* Bouton télécharger */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/10 hover:bg-primary/10 text-secondary hover:text-primary transition-all cursor-pointer"
            title="Télécharger le PDF"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs font-medium">PDF</span>
          </button>

          {/* Bouton signaler */}
          {onReport && (
            <button
              onClick={handleReport}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/10 hover:bg-warning/20 text-warning hover:text-warning transition-all cursor-pointer"
              title="Signaler cet examen"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
