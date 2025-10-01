import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import ExamCard from './ExamCard';
import { AlertCircle, X, FileX, Search, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { Input } from './ui/Input';

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

interface ExamListProps {
  onExamSelect?: (exam: Exam) => void;
}

/**
 * Composant pour afficher la liste des examens avec filtres et recherche
 * Suit les bonnes pratiques : gestion d'état, performance, accessibilité
 */
export default function ExamList({ onExamSelect }: ExamListProps) {
  const { token } = useAuthStore();
  const { navigate } = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');

  // Chargement des examens
  useEffect(() => {
    const loadExams = async () => {
      // Vérifier si l'utilisateur est connecté
      if (!token) {
        navigate('login');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await axios.get<Exam[]>('/api/exams', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setExams(response.data);
      } catch (err) {
        console.error('Erreur lors du chargement des examens:', err);
        // Si erreur 401, rediriger vers login
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          navigate('login');
          return;
        }
        setError('Impossible de charger les examens. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [token, navigate]);

  // Filtrage et recherche avec useMemo pour la performance
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exam.module?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesYear = !selectedYear || exam.year?.toString() === selectedYear;
      const matchesModule = !selectedModule || exam.module === selectedModule;

      return matchesSearch && matchesYear && matchesModule;
    });
  }, [exams, searchTerm, selectedYear, selectedModule]);

  // Options pour les filtres
  const availableYears = useMemo(() => {
    const years = [...new Set(exams.map(exam => exam.year).filter(Boolean))];
    return years.sort((a, b) => (b ?? 0) - (a ?? 0));
  }, [exams]);

  const availableModules = useMemo(() => {
    const modules = [...new Set(exams.map(exam => exam.module).filter(Boolean))];
    return modules.sort();
  }, [exams]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedYear('');
    setSelectedModule('');
  };

  const handleReportExam = async (examId: string) => {
    if (!token) return;

    const result = await Swal.fire({
      title: 'Signaler cet examen',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">
            Raison du signalement
          </label>
          <select id="swal-reason" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <option value="">Sélectionnez une raison</option>
            <option value="inappropriate_content">Contenu inapproprié</option>
            <option value="spam">Spam</option>
            <option value="wrong_subject">Mauvais sujet</option>
            <option value="copyright_violation">Violation de droits d'auteur</option>
            <option value="other">Autre</option>
          </select>
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">
            Description (optionnel)
          </label>
          <textarea id="swal-description" class="swal2-textarea" placeholder="Décrivez le problème..." style="margin: 0; width: 100%; min-height: 100px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const reason = (document.getElementById('swal-reason') as HTMLSelectElement)?.value;
        const description = (document.getElementById('swal-description') as HTMLTextAreaElement)?.value;

        if (!reason) {
          Swal.showValidationMessage('Veuillez sélectionner une raison');
          return false;
        }

        return { reason, description };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const { reason, description } = result.value;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'exam',
          targetId: examId,
          reason,
          description: description || undefined,
        }),
      });

      if (response.ok) {
        await Swal.fire({
          title: 'Signalement envoyé',
          text: 'Votre signalement a été envoyé avec succès',
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
      } else {
        const errorData = await response.json();
        await Swal.fire({
          title: 'Erreur',
          text: `Erreur lors du signalement: ${errorData.error}`,
          icon: 'error',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      await Swal.fire({
        title: 'Erreur',
        text: 'Erreur lors du signalement',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-secondary">Chargement des examens...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-bg border border-error/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
          <span className="text-error font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark">Examens disponibles</h1>
          <p className="text-secondary text-sm md:text-base mt-1">
            {filteredExams.length} examen{filteredExams.length !== 1 ? 's' : ''}
            {filteredExams.length !== exams.length && ` sur ${exams.length}`}
          </p>
        </div>

        {(searchTerm || selectedYear || selectedModule) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser les filtres</span>
          </button>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Input
              id="search"
              type="text"
              placeholder="Rechercher par titre ou module..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              label="Rechercher"
            />
            <Search className="absolute right-3 top-9 w-4 h-4 text-secondary pointer-events-none" />
          </div>

          {/* Filtre par année */}
          <div>
            <label htmlFor="year-filter" className="block text-sm font-medium text-secondary-dark mb-1">
              Année
            </label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full py-2 px-3 border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
            >
              <option value="">Toutes les années</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par module */}
          <div>
            <label htmlFor="module-filter" className="block text-sm font-medium text-secondary-dark mb-1">
              Module
            </label>
            <select
              id="module-filter"
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="w-full py-2 px-3 border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
            >
              <option value="">Tous les modules</option>
              {availableModules.map(module => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des examens */}
      {filteredExams.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mb-4">
            <FileX className="w-8 h-8 text-secondary" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-dark mb-2">Aucun examen trouvé</h3>
          <p className="text-sm text-secondary">
            {exams.length === 0
              ? 'Aucun examen disponible. Commencez par en uploader un !'
              : 'Essayez de modifier vos critères de recherche.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredExams.map(exam => (
            <ExamCard key={exam._id} exam={exam} onSelect={onExamSelect} onReport={handleReportExam} />
          ))}
        </div>
      )}
    </div>
  );
}
