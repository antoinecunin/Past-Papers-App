import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { PermissionUtils } from '../utils/permissions';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Report {
  _id: string;
  type: 'exam' | 'comment';
  targetId: string;
  reason: 'inappropriate_content' | 'spam' | 'wrong_subject' | 'copyright_violation' | 'other';
  description?: string;
  reportedBy: User;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: User;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function AdminReportsPage() {
  const { user, token } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status?: string;
    type?: string;
  }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);
      params.append('limit', '50');

      const response = await fetch(`/api/reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: ReportsResponse = await response.json();
        setReports(data.reports);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors du chargement des signalements');
      }
    } catch (err) {
      console.error('Erreur fetch signalements:', err);
      setError('Erreur réseau lors du chargement des signalements');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  const handleReviewReport = async (reportId: string, action: 'approve' | 'reject', note?: string) => {
    if (!token) return;

    try {
      setActionLoading(reportId);
      const response = await fetch(`/api/reports/${reportId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, note }),
      });

      if (response.ok) {
        await fetchReports(); // Recharger la liste
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Erreur traitement signalement:', err);
      alert('Erreur lors du traitement du signalement');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Vérifier les permissions admin
  if (!user || !PermissionUtils.isAdmin(user)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h1 className="text-lg font-semibold text-red-800 mb-2">Accès refusé</h1>
          <p className="text-red-600">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  const getReasonLabel = (reason: Report['reason']) => {
    const labels = {
      inappropriate_content: 'Contenu inapproprié',
      spam: 'Spam',
      wrong_subject: 'Mauvais sujet',
      copyright_violation: 'Violation de droits d\'auteur',
      other: 'Autre',
    };
    return labels[reason];
  };

  const getStatusBadge = (status: Report['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeLabel = (type: Report['type']) => {
    return type === 'exam' ? 'Examen' : 'Commentaire';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Chargement des signalements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des signalements</h1>
        <p className="text-gray-600">Gérez les signalements de contenu inapproprié.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-6 flex gap-4">
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
        </select>

        <select
          value={filter.type || ''}
          onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Tous les types</option>
          <option value="exam">Examens</option>
          <option value="comment">Commentaires</option>
        </select>

        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Actualiser
        </button>
      </div>

      {/* Liste des signalements */}
      {reports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun signalement trouvé.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signalement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signalé par
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getTypeLabel(report.type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            #{report.targetId.slice(-8)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Raison: {getReasonLabel(report.reason)}
                        </div>
                        {report.description && (
                          <div className="text-sm text-gray-500 italic">
                            &quot;{report.description}&quot;
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {report.reportedBy.firstName} {report.reportedBy.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.reportedBy.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(report.status)}
                      {report.reviewedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          Par: {report.reviewedBy.firstName} {report.reviewedBy.lastName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {report.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const note = prompt('Note optionnelle:');
                              if (note !== null) {
                                handleReviewReport(report._id, 'approve', note || undefined);
                              }
                            }}
                            disabled={actionLoading === report._id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === report._id ? '...' : 'Approuver & Supprimer'}
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt('Note optionnelle:');
                              if (note !== null) {
                                handleReviewReport(report._id, 'reject', note || undefined);
                              }
                            }}
                            disabled={actionLoading === report._id}
                            className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === report._id ? '...' : 'Rejeter'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {report.reviewNote && (
                            <div>Note: {report.reviewNote}</div>
                          )}
                          <div>
                            {new Date(report.reviewedAt!).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}