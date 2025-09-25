import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ExamCard from './ExamCard';
import { ErrorIcon, EmptyStateIcon } from './ui/Icon';

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

interface ExamListProps {
  onExamSelect?: (exam: Exam) => void;
}

/**
 * Composant pour afficher la liste des examens avec filtres et recherche
 * Suit les bonnes pratiques : gestion d'état, performance, accessibilité
 */
export default function ExamList({ onExamSelect }: ExamListProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');

  // Chargement des examens
  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get<Exam[]>('/api/exams');
        setExams(response.data);
      } catch (err) {
        console.error('Erreur lors du chargement des examens:', err);
        setError('Impossible de charger les examens. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Chargement des examens...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="mr-2">
            <ErrorIcon />
          </div>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec statistiques */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Examens disponibles</h1>
          <p className="text-gray-600 text-sm">
            {filteredExams.length} examen{filteredExams.length !== 1 ? 's' : ''}
            {filteredExams.length !== exams.length && ` sur ${exams.length}`}
          </p>
        </div>

        {(searchTerm || selectedYear || selectedModule) && (
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <input
              id="search"
              type="text"
              placeholder="Rechercher par titre ou module..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filtre par année */}
          <div>
            <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Année
            </label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
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
            <label htmlFor="module-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Module
            </label>
            <select
              id="module-filter"
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
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
        <div className="text-center py-8">
          <div className="mx-auto mb-2">
            <EmptyStateIcon />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun examen trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            {exams.length === 0
              ? 'Aucun examen disponible. Commencez par en uploader un !'
              : 'Essayez de modifier vos critères de recherche.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExams.map(exam => (
            <ExamCard key={exam._id} exam={exam} onSelect={onExamSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
