import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Shield, AlertCircle, RefreshCw, CheckCircle, XCircle, FileText, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PermissionUtils } from '../utils/permissions';
import { Button } from '../components/ui/Button';

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
  }>({ status: 'pending' });
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

  const handleReviewReport = async (reportId: string, action: 'approve' | 'reject') => {
    if (!token) return;

    const result = await Swal.fire({
      title: action === 'approve' ? 'Approuver et supprimer' : 'Rejeter le signalement',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">
            Note (optionnel)
          </label>
          <textarea id="swal-note" class="swal2-textarea" placeholder="Ajoutez une note..." style="margin: 0; width: 100%; min-height: 80px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
        </div>
      `,
      icon: action === 'approve' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: action === 'approve' ? 'Approuver & Supprimer' : 'Rejeter',
      cancelButtonText: 'Annuler',
      confirmButtonColor: action === 'approve' ? '#ef4444' : '#64748b',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const note = (document.getElementById('swal-note') as HTMLTextAreaElement)?.value;
        return { note: note || undefined };
      },
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(reportId);
      const response = await fetch(`/api/reports/${reportId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, note: result.value?.note }),
      });

      if (response.ok) {
        await Swal.fire({
          title: 'Succès',
          text: action === 'approve' ? 'Signalement approuvé et contenu supprimé' : 'Signalement rejeté',
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
        await fetchReports();
      } else {
        const errorData = await response.json();
        await Swal.fire({
          title: 'Erreur',
          text: `Erreur: ${errorData.error}`,
          icon: 'error',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (err) {
      console.error('Erreur traitement signalement:', err);
      await Swal.fire({
        title: 'Erreur',
        text: 'Erreur lors du traitement du signalement',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
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
      <div className="bg-error-bg border border-error/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-error flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-error mb-1">Accès refusé</h1>
            <p className="text-error">Cette page est réservée aux administrateurs.</p>
          </div>
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
      pending: 'bg-warning-bg text-warning border border-warning/20',
      approved: 'bg-success-bg text-success border border-success/20',
      rejected: 'bg-error-bg text-error border border-error/20',
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
    };

    return (
      <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeLabel = (type: Report['type']) => {
    return type === 'exam' ? 'Examen' : 'Commentaire';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-secondary">Chargement des signalements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark">Gestion des signalements</h1>
            <p className="text-sm md:text-base text-secondary mt-1">Gérez les signalements de contenu inapproprié</p>
          </div>
        </div>
        <div className="text-sm text-secondary">
          {reports.length} signalement{reports.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="bg-error-bg border border-error/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
            <p className="text-error font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
        <div className="flex flex-wrap gap-3">
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </select>

          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
          >
            <option value="">Tous les types</option>
            <option value="exam">Examens</option>
            <option value="comment">Commentaires</option>
          </select>

          <Button
            onClick={fetchReports}
            variant="secondary"
            size="md"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </Button>
        </div>
      </div>

      {/* Liste des signalements */}
      {reports.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mb-4">
            <CheckCircle className="w-8 h-8 text-secondary" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-dark mb-2">Aucun signalement</h3>
          <p className="text-sm text-secondary">Aucun signalement ne correspond aux filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report._id} className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Left: Report details */}
                <div className="flex-1 space-y-3">
                  {/* Type and ID */}
                  <div className="flex items-center gap-2">
                    {report.type === 'exam' ? (
                      <FileText className="w-5 h-5 text-primary" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-info" />
                    )}
                    <span className="font-semibold text-secondary-dark">
                      {getTypeLabel(report.type)}
                    </span>
                    <span className="text-xs text-secondary/70">
                      #{report.targetId.slice(-8)}
                    </span>
                  </div>

                  {/* Reason */}
                  <div>
                    <span className="text-sm font-medium text-secondary">Raison: </span>
                    <span className="text-sm text-secondary-dark">{getReasonLabel(report.reason)}</span>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <div className="text-sm text-secondary italic bg-bg-secondary p-3 rounded-lg">
                      &quot;{report.description}&quot;
                    </div>
                  )}

                  {/* Reporter */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-secondary">Signalé par:</span>
                    <span className="text-xs font-medium text-secondary-dark">
                      {report.reportedBy.firstName} {report.reportedBy.lastName}
                    </span>
                    <span className="text-xs text-secondary/70">
                      ({report.reportedBy.email})
                    </span>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-secondary/70">
                    {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Right: Status and Actions */}
                <div className="flex flex-col items-start lg:items-end gap-3 lg:min-w-[200px]">
                  {/* Status badge */}
                  <div>{getStatusBadge(report.status)}</div>

                  {/* Reviewer info */}
                  {report.reviewedBy && (
                    <div className="text-xs text-secondary">
                      <div>Par: {report.reviewedBy.firstName} {report.reviewedBy.lastName}</div>
                      {report.reviewNote && (
                        <div className="mt-1 italic">Note: {report.reviewNote}</div>
                      )}
                      <div className="mt-1">
                        {new Date(report.reviewedAt!).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {report.status === 'pending' && (
                    <div className="flex gap-2 w-full lg:w-auto">
                      <Button
                        onClick={() => handleReviewReport(report._id, 'approve')}
                        disabled={actionLoading === report._id}
                        variant="danger"
                        size="sm"
                        className="gap-1.5 flex-1 lg:flex-initial"
                      >
                        {actionLoading === report._id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Approuver</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReviewReport(report._id, 'reject')}
                        disabled={actionLoading === report._id}
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 flex-1 lg:flex-initial"
                      >
                        {actionLoading === report._id ? (
                          <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Rejeter</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}