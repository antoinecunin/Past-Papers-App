import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  AlertCircle,
  RefreshCw,
  Users,
  ChevronUp,
  ChevronDown,
  Search,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PermissionUtils } from '../utils/permissions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiFetch } from '../utils/api';

interface UserEntry {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  canComment: boolean;
  canUpload: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isInitialAdmin, setIsInitialAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await apiFetch('/api/auth/users');

      if (response.ok) {
        const data: { users: UserEntry[]; canManageRoles: boolean } = await response.json();
        setUsers(data.users);
        setIsInitialAdmin(data.canManageRoles);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error loading users');
      }
    } catch {
      setError('Network error while loading users');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (targetUser: UserEntry, newRole: 'user' | 'admin') => {
    if (!user) return;

    const action =
      newRole === 'admin' ? t('admin.users.promote_action') : t('admin.users.demote_action');
    const confirmed = window.confirm(
      t('admin.users.role_change_confirm', {
        action,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        email: targetUser.email,
      })
    );
    if (!confirmed) return;

    try {
      setActionLoading(targetUser._id);
      const response = await apiFetch(`/api/auth/users/${targetUser._id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prev =>
          prev.map(u =>
            u._id === targetUser._id
              ? {
                  ...u,
                  role: newRole,
                  ...(newRole === 'admin' ? { canComment: true, canUpload: true } : {}),
                }
              : u
          )
        );
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          setIsInitialAdmin(false);
        }
        alert(errorData.error || t('admin.users.error_role'));
      }
    } catch {
      alert(t('admin.users.network_error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePermission = async (
    targetUser: UserEntry,
    permission: 'canComment' | 'canUpload'
  ) => {
    if (!user) return;
    const newValue = !targetUser[permission];

    try {
      setActionLoading(`${targetUser._id}-${permission}`);
      const response = await apiFetch(`/api/auth/users/${targetUser._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [permission]: newValue }),
      });

      if (response.ok) {
        setUsers(prev =>
          prev.map(u => (u._id === targetUser._id ? { ...u, [permission]: newValue } : u))
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || t('admin.users.error_permission'));
      }
    } catch {
      alert(t('admin.users.network_error'));
    } finally {
      setActionLoading(null);
    }
  };

  // Filtering and sort
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(u => {
      const matchesSearch =
        searchTerm === '' ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !selectedRole || u.role === selectedRole;
      return matchesSearch && matchesRole;
    });

    const dir = sortAsc ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortField) {
        case 'date':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'name':
        default:
          return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
    });
  }, [users, searchTerm, selectedRole, sortField, sortAsc]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRole('');
    setSortField('name');
    setSortAsc(true);
  };

  // Access control
  if (!PermissionUtils.isAdmin(user)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{t('admin.users.admin_required')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.users.title')}</h1>
        </div>
        <Button onClick={() => fetchUsers()} variant="secondary" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {!loading && !isInitialAdmin && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <p className="text-yellow-700">{t('admin.users.role_warning')}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats + reset */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-500">
              {filteredUsers.length === 1
                ? t('admin.users.user_count', { count: filteredUsers.length })
                : t('admin.users.user_count_plural', { count: filteredUsers.length })}
              {filteredUsers.length !== users.length && ` ${t('common.out_of')} ${users.length}`}
            </span>
          </div>
          <div className="px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-sm text-purple-600">{t('admin.users.admins_label')} </span>
            <span className="font-semibold text-purple-700">
              {users.filter(u => u.role === 'admin').length}
            </span>
          </div>
        </div>
        {(searchTerm || selectedRole) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.reset_filters')}</span>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Input
              id="user-search"
              type="text"
              placeholder={t('admin.users.search_placeholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              label={t('admin.users.search_label')}
            />
            <Search className="absolute right-3 top-9 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.role_filter')}
            </label>
            <select
              id="role-filter"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 bg-white transition-colors cursor-pointer"
            >
              <option value="">{t('admin.users.all_roles')}</option>
              <option value="admin">{t('admin.users.role_admin')}</option>
              <option value="user">{t('admin.users.role_user')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="user-sort" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.sort_by')}
            </label>
            <div className="flex gap-2">
              <select
                id="user-sort"
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="flex-1 py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 bg-white transition-colors cursor-pointer"
              >
                <option value="name">{t('admin.users.sort_name')}</option>
                <option value="date">{t('admin.users.sort_date')}</option>
              </select>
              <button
                onClick={() => setSortAsc(prev => !prev)}
                className="px-2.5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                title={sortAsc ? t('common.sort_ascending') : t('common.sort_descending')}
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
            <span className="text-gray-600">{t('admin.users.loading')}</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  {t('admin.users.table_user')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  {t('admin.users.table_email')}
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  {t('admin.users.table_role')}
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                  {t('admin.users.table_comment')}
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">
                  {t('admin.users.table_upload')}
                </th>
                {isInitialAdmin && (
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                    {t('admin.users.table_actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const isSelf = u._id === user?.id;
                const isCurrentUserInitialAdmin = isSelf && u.role === 'admin';

                return (
                  <tr
                    key={u._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </span>
                        {isSelf && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {t('admin.users.you_label')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                          <Shield className="w-3 h-3" /> {t('admin.users.role_admin')}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                          {t('admin.users.role_user')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <button
                          onClick={() => handleTogglePermission(u, 'canComment')}
                          disabled={actionLoading === `${u._id}-canComment`}
                          className={`w-8 h-5 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                            (u.canComment ?? true) ? 'bg-green-500' : 'bg-red-400'
                          }`}
                          title={
                            (u.canComment ?? true)
                              ? t('admin.users.disable_comment')
                              : t('admin.users.enable_comment')
                          }
                        >
                          <span
                            className={`block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                              (u.canComment ?? true) ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <button
                          onClick={() => handleTogglePermission(u, 'canUpload')}
                          disabled={actionLoading === `${u._id}-canUpload`}
                          className={`w-8 h-5 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                            (u.canUpload ?? true) ? 'bg-green-500' : 'bg-red-400'
                          }`}
                          title={
                            (u.canUpload ?? true)
                              ? t('admin.users.disable_upload')
                              : t('admin.users.enable_upload')
                          }
                        >
                          <span
                            className={`block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                              (u.canUpload ?? true) ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      )}
                    </td>
                    {isInitialAdmin && (
                      <td className="px-4 py-3 text-right">
                        {isSelf || isCurrentUserInitialAdmin ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : u.role === 'user' ? (
                          <button
                            onClick={() => handleRoleChange(u, 'admin')}
                            disabled={actionLoading === u._id}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <ChevronUp className="w-3 h-3" />
                            {actionLoading === u._id
                              ? t('admin.users.promoting')
                              : t('admin.users.promote')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u, 'user')}
                            disabled={actionLoading === u._id}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <ChevronDown className="w-3 h-3" />
                            {actionLoading === u._id
                              ? t('admin.users.demoting')
                              : t('admin.users.demote')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
