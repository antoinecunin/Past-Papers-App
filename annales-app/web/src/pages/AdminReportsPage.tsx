import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import {
  Shield,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PermissionUtils } from '../utils/permissions';
import { apiFetch } from '../utils/api';
import { Button } from '../components/ui/Button';
import { useRouter } from '../hooks/useRouter';

const REPORTS_PER_PAGE = 20;

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TargetDetails {
  // For exams
  title?: string;
  module?: string;
  year?: number;
  // For comments
  examId?: string;
  page?: number;
  content?: { type: string; data: string };
  // Indicates whether the content still exists
  exists: boolean;
}

interface Report {
  _id: string;
  type: 'exam' | 'comment';
  targetId: string;
  reason:
    | 'inappropriate_content'
    | 'spam'
    | 'off_topic'
    | 'wrong_exam'
    | 'poor_quality'
    | 'duplicate'
    | 'other';
  description?: string;
  reportedBy: User;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: User;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  target: TargetDetails;
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
  const { user } = useAuthStore();
  const { navigate } = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status?: string;
    type?: string;
  }>({ status: 'pending' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [pagination, setPagination] = useState<ReportsResponse['pagination'] | null>(null);

  const fetchReports = useCallback(
    async (fetchOffset: number) => {
      if (!user) return;

      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter.status) params.append('status', filter.status);
        if (filter.type) params.append('type', filter.type);
        params.append('limit', String(REPORTS_PER_PAGE));
        params.append('offset', String(fetchOffset));

        const response = await apiFetch(`/api/reports?${params.toString()}`);

        if (response.ok) {
          const data: ReportsResponse = await response.json();
          setReports(data.reports);
          setPagination(data.pagination);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Error loading reports');
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Network error while loading reports');
      } finally {
        setLoading(false);
      }
    },
    [user, filter]
  );

  const handleReviewReport = async (reportId: string, action: 'approve' | 'reject') => {
    if (!user) return;

    const result = await Swal.fire({
      title: action === 'approve' ? 'Approve and delete' : 'Reject report',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #334155;">
            Note (optional)
          </label>
          <textarea id="swal-note" class="swal2-textarea" placeholder="Add a note..." style="margin: 0; width: 100%; min-height: 80px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
        </div>
      `,
      icon: action === 'approve' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: action === 'approve' ? 'Approve & Delete' : 'Reject',
      cancelButtonText: 'Cancel',
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
      const response = await apiFetch(`/api/reports/${reportId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, note: result.value?.note }),
      });

      if (response.ok) {
        await Swal.fire({
          title: 'Success',
          text: action === 'approve' ? 'Report approved and content deleted' : 'Report rejected',
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
        await fetchReports(offset);
      } else {
        const errorData = await response.json();
        await Swal.fire({
          title: 'Error',
          text: `Error: ${errorData.error}`,
          icon: 'error',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (err) {
      console.error('Error processing report:', err);
      await Swal.fire({
        title: 'Error',
        text: 'Error while processing the report',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
    fetchReports(0);
  }, [filter, user, fetchReports]);

  // Pagination handlers
  const handlePreviousPage = () => {
    const newOffset = Math.max(0, offset - REPORTS_PER_PAGE);
    setOffset(newOffset);
    fetchReports(newOffset);
  };

  const handleNextPage = () => {
    if (pagination?.hasMore) {
      const newOffset = offset + REPORTS_PER_PAGE;
      setOffset(newOffset);
      fetchReports(newOffset);
    }
  };

  const currentPage = Math.floor(offset / REPORTS_PER_PAGE) + 1;
  const totalPages = pagination ? Math.ceil(pagination.total / REPORTS_PER_PAGE) : 1;

  // Check admin permissions
  if (!user || !PermissionUtils.isAdmin(user)) {
    return (
      <div className="bg-error-bg border border-error/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-error flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-error mb-1">Access denied</h1>
            <p className="text-error">This page is restricted to administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  const getReasonLabel = (reason: Report['reason']) => {
    const labels = {
      inappropriate_content: 'Inappropriate content',
      spam: 'Spam',
      off_topic: 'Off-topic',
      wrong_exam: 'Wrong exam',
      poor_quality: 'Poor quality',
      duplicate: 'Duplicate',
      other: 'Other',
    };
    return labels[reason];
  };

  const handleViewTarget = (report: Report) => {
    if (!report.target.exists) {
      Swal.fire({
        title: 'Content deleted',
        text: 'This content has been deleted following report approval.',
        icon: 'info',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    if (report.type === 'exam') {
      navigate('viewer', { examId: report.targetId });
    } else if (report.type === 'comment' && report.target.examId) {
      navigate('viewer', { examId: report.target.examId });
    }
  };

  const getTargetLabel = (report: Report): string => {
    if (!report.target.exists) {
      return 'Content deleted';
    }
    if (report.type === 'exam') {
      return report.target.title || 'Exam';
    }
    return `Comment page ${report.target.page || '?'}`;
  };

  const getStatusBadge = (status: Report['status']) => {
    const badges = {
      pending: 'bg-warning-bg text-warning border border-warning/20',
      approved: 'bg-success-bg text-success border border-success/20',
      rejected: 'bg-error-bg text-error border border-error/20',
    };

    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };

    return (
      <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeLabel = (type: Report['type']) => {
    return type === 'exam' ? 'Exam' : 'Comment';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-secondary">Loading reports...</span>
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
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark">
              Report management
            </h1>
            <p className="text-sm md:text-base text-secondary mt-1">
              Manage reports of inappropriate content
            </p>
          </div>
        </div>
        <div className="text-sm text-secondary">
          {pagination ? (
            <>
              {pagination.total} report{pagination.total !== 1 ? 's' : ''}
              {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
            </>
          ) : (
            `${reports.length} report${reports.length !== 1 ? 's' : ''}`
          )}
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

      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5">
        <div className="flex flex-wrap gap-3">
          <select
            value={filter.status || ''}
            onChange={e => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filter.type || ''}
            onChange={e => setFilter({ ...filter, type: e.target.value || undefined })}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors cursor-pointer"
          >
            <option value="">All types</option>
            <option value="exam">Exams</option>
            <option value="comment">Comments</option>
          </select>

          <Button
            onClick={() => fetchReports(offset)}
            variant="secondary"
            size="md"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mb-4">
            <CheckCircle className="w-8 h-8 text-secondary" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-dark mb-2">No reports</h3>
          <p className="text-sm text-secondary">No reports match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map(report => (
              <div
                key={report._id}
                className="bg-white border border-border rounded-xl p-4 md:p-6 shadow-lg shadow-black/5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left: Report details */}
                  <div className="flex-1 space-y-3">
                    {/* Type and target info */}
                    <div className="flex items-center gap-2 flex-wrap">
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
                      <button
                        onClick={() => handleViewTarget(report)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                          report.target.exists
                            ? 'text-primary hover:bg-primary/10 cursor-pointer'
                            : 'text-secondary/50 cursor-not-allowed'
                        }`}
                        title={report.target.exists ? 'View content' : 'Content deleted'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{getTargetLabel(report)}</span>
                      </button>
                    </div>

                    {/* Reason */}
                    <div>
                      <span className="text-sm font-medium text-secondary">Reason: </span>
                      <span className="text-sm text-secondary-dark">
                        {getReasonLabel(report.reason)}
                      </span>
                    </div>

                    {/* Description */}
                    {report.description && (
                      <div className="text-sm text-secondary italic bg-bg-secondary p-3 rounded-lg">
                        &quot;{report.description}&quot;
                      </div>
                    )}

                    {/* Comment content preview */}
                    {report.type === 'comment' && report.target.content && (
                      <div className="text-sm bg-gray-50 border border-gray-200 p-3 rounded-lg">
                        <span className="text-xs font-medium text-secondary block mb-1">
                          Comment content ({report.target.content.type}):
                        </span>
                        {report.target.content.type === 'image' ? (
                          <span className="text-xs text-secondary italic">[Image]</span>
                        ) : (
                          <p className="text-secondary-dark whitespace-pre-wrap break-words">
                            {report.target.content.data.length > 300
                              ? `${report.target.content.data.slice(0, 300)}...`
                              : report.target.content.data}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Reporter */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <span className="text-xs text-secondary">Reported by:</span>
                      <span className="text-xs font-medium text-secondary-dark">
                        {report.reportedBy.firstName} {report.reportedBy.lastName}
                      </span>
                      <span className="text-xs text-secondary/70">({report.reportedBy.email})</span>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-secondary/70">
                      {new Date(report.createdAt).toLocaleDateString('en-US', {
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
                        <div>
                          By: {report.reviewedBy.firstName} {report.reviewedBy.lastName}
                        </div>
                        {report.reviewNote && (
                          <div className="mt-1 italic">Note: {report.reviewNote}</div>
                        )}
                        <div className="mt-1">
                          {new Date(report.reviewedAt!).toLocaleDateString('en-US')}
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
                              <span>Approve</span>
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
                              <span>Reject</span>
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

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                onClick={handlePreviousPage}
                disabled={offset === 0 || loading}
                variant="secondary"
                size="sm"
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <span className="text-sm text-secondary">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasMore || loading}
                variant="secondary"
                size="sm"
                className="gap-1.5"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
