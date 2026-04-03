import { useState, useEffect, useMemo } from 'react';
import ExamCard from './ExamCard';
import { AlertCircle, FileX, Search, RotateCcw, ArrowUpDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from '../hooks/useRouter';
import { Input } from './ui/Input';
import { showReportModal, showReportSuccess, showReportError } from '../utils/reportModal';
import { apiFetch } from '../utils/api';

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
 * Component to display the list of exams with filters and search
 * Follows best practices: state management, performance, accessibility
 */
export default function ExamList({ onExamSelect }: ExamListProps) {
  const { user } = useAuthStore();
  const { navigate } = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Load exams
  useEffect(() => {
    const loadExams = async () => {
      // Check if the user is logged in
      if (!user) {
        navigate('login');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch('/api/exams');
        if (response.status === 401) {
          navigate('login');
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load exams');
        }
        const data: Exam[] = await response.json();
        setExams(data);
      } catch (err) {
        console.error('Error loading exams:', err);
        setError('Unable to load exams. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [user, navigate]);

  // Filtering, search and sort with useMemo for performance
  const filteredExams = useMemo(() => {
    const filtered = exams.filter(exam => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exam.module?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesYear = !selectedYear || exam.year?.toString() === selectedYear;
      const matchesModule = !selectedModule || exam.module === selectedModule;

      return matchesSearch && matchesYear && matchesModule;
    });

    const dir = sortAsc ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortField) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'year':
          return dir * ((a.year ?? 0) - (b.year ?? 0));
        case 'module':
          return dir * (a.module ?? '').localeCompare(b.module ?? '');
        case 'date':
        default:
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  }, [exams, searchTerm, selectedYear, selectedModule, sortField, sortAsc]);

  // Filter options
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
    setSortField('date');
    setSortAsc(false);
  };

  const handleReportExam = async (examId: string) => {
    if (!user) return;

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
          targetId: examId,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-secondary">Loading exams...</span>
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
      {/* Header with statistics */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark">Available exams</h1>
          <p className="text-secondary text-sm md:text-base mt-1">
            {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
            {filteredExams.length !== exams.length && ` out of ${exams.length}`}
          </p>
        </div>

        {(searchTerm || selectedYear || selectedModule) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Filters and search */}
      <div className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Input
              id="search"
              type="text"
              placeholder="Search by title or module..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              label="Search"
            />
            <Search className="absolute right-3 top-9 w-4 h-4 text-secondary pointer-events-none" />
          </div>

          {/* Year filter */}
          <div>
            <label
              htmlFor="year-filter"
              className="block text-sm font-medium text-secondary-dark mb-1"
            >
              Year
            </label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full py-2 px-3 border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
            >
              <option value="">All years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Module filter */}
          <div>
            <label
              htmlFor="module-filter"
              className="block text-sm font-medium text-secondary-dark mb-1"
            >
              Module
            </label>
            <select
              id="module-filter"
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="w-full py-2 px-3 border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
            >
              <option value="">All modules</option>
              {availableModules.map(module => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-secondary-dark mb-1">
              Sort by
            </label>
            <div className="flex gap-2">
              <select
                id="sort"
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="flex-1 py-2 px-3 border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="module">Module</option>
                <option value="year">Year</option>
              </select>
              <button
                onClick={() => setSortAsc(prev => !prev)}
                className="px-2.5 py-2 border border-border rounded-input hover:bg-gray-50 transition-colors cursor-pointer"
                title={sortAsc ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className="w-4 h-4 text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exam list */}
      {filteredExams.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mb-4">
            <FileX className="w-8 h-8 text-secondary" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-dark mb-2">No exams found</h3>
          <p className="text-sm text-secondary">
            {exams.length === 0
              ? 'No exams available. Start by uploading one!'
              : 'Try adjusting your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredExams.map(exam => (
            <ExamCard
              key={exam._id}
              exam={exam}
              onSelect={onExamSelect}
              onReport={handleReportExam}
            />
          ))}
        </div>
      )}
    </div>
  );
}
