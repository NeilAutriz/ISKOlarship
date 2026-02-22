// ============================================================================
// ISKOlarship - Admin Activity Log Page
// Platform-wide activity tracking with stats, role filtering, and search
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, LogIn, UserPlus, FileEdit, Upload, Send, XCircle,
  CheckCircle, RefreshCw, Clock, Filter, Search, Users, Shield,
  ChevronLeft, ChevronRight, Calendar, TrendingUp, BarChart3,
  BookOpen, Brain, Trash2, Bell, GraduationCap
} from 'lucide-react';
import { activityLogApi, ActivityLogEntry, ActivityLogPagination, ActivityLogStats } from '../../services/apiClient';

// ============================================================================
// Action Config
// ============================================================================

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  login:                          { icon: LogIn,       color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Login' },
  register:                       { icon: UserPlus,    color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Registration' },
  profile_update:                 { icon: FileEdit,    color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Profile Update' },
  document_upload:                { icon: Upload,      color: 'text-cyan-600',    bg: 'bg-cyan-50',    label: 'Document Upload' },
  document_delete:                { icon: Trash2,      color: 'text-red-500',     bg: 'bg-red-50',     label: 'Document Deleted' },
  application_create:             { icon: Send,        color: 'text-green-600',   bg: 'bg-green-50',   label: 'App Created' },
  application_submit:             { icon: Send,        color: 'text-green-600',   bg: 'bg-green-50',   label: 'App Submitted' },
  application_withdraw:           { icon: XCircle,     color: 'text-orange-600',  bg: 'bg-orange-50',  label: 'App Withdrawn' },
  application_approve:            { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'App Approved' },
  application_reject:             { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50',     label: 'App Rejected' },
  application_review:             { icon: Clock,       color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Under Review' },
  document_verify:                { icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-50',   label: 'Doc Verified' },
  document_reject:                { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50',     label: 'Doc Rejected' },
  document_resubmit:              { icon: RefreshCw,   color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Resubmit Req.' },
  document_verify_all:            { icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-50',   label: 'All Docs Verified' },
  scholarship_create:             { icon: BookOpen,    color: 'text-green-600',   bg: 'bg-green-50',   label: 'Scholarship Created' },
  scholarship_update:             { icon: BookOpen,    color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Scholarship Updated' },
  scholarship_delete:             { icon: BookOpen,    color: 'text-red-600',     bg: 'bg-red-50',     label: 'Scholarship Deleted' },
  model_train:                    { icon: Brain,       color: 'text-violet-600',  bg: 'bg-violet-50',  label: 'Model Trained' },
  model_train_all:                { icon: Brain,       color: 'text-violet-600',  bg: 'bg-violet-50',  label: 'Train All Models' },
  notification_preferences_update:{ icon: Bell,        color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Notif. Settings' },
};

const DEFAULT_CONFIG = { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Other' };

// All action values for filter dropdown
const ALL_ACTIONS = Object.keys(ACTION_CONFIG);

const ROLE_TABS = [
  { key: '',       label: 'All',     icon: Users },
  { key: 'admin',  label: 'Admin',   icon: Shield },
  { key: 'student',label: 'Student', icon: GraduationCap },
];

// ============================================================================
// Helpers
// ============================================================================

const timeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ============================================================================
// Component
// ============================================================================

const AdminActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [pagination, setPagination] = useState<ActivityLogPagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // ----------------------------------------------------------
  // Fetch logs
  // ----------------------------------------------------------
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await activityLogApi.getAll({
        page,
        limit: 25,
        role: roleFilter || undefined,
        action: actionFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, actionFilter, searchQuery]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await activityLogApi.getStats();
      if (res.success) setStats(res.data);
    } catch { /* swallow */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // ----------------------------------------------------------
  // Stat cards data
  // ----------------------------------------------------------
  const statCards = [
    { label: 'Today',     value: stats?.today ?? '–',     icon: TrendingUp,  color: 'text-blue-600',   bg: 'from-blue-50 to-blue-100/50' },
    { label: 'This Week', value: stats?.thisWeek ?? '–',  icon: BarChart3,   color: 'text-emerald-600',bg: 'from-emerald-50 to-emerald-100/50' },
    { label: 'Total',     value: stats?.total ?? '–',     icon: Activity,    color: 'text-violet-600', bg: 'from-violet-50 to-violet-100/50' },
    { label: 'Admins',    value: stats?.byRole?.admin ?? '–',  icon: Shield, color: 'text-amber-600', bg: 'from-amber-50 to-amber-100/50' },
    { label: 'Students',  value: stats?.byRole?.student ?? '–',icon: GraduationCap, color: 'text-cyan-600', bg: 'from-cyan-50 to-cyan-100/50' },
  ];

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
            <p className="text-sm text-slate-500">Platform-wide activity tracking &amp; audit</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-slate-200/60 rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>
              {statsLoading ? '...' : typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Role tabs */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {ROLE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setRoleFilter(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md transition
                  ${roleFilter === t.key
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or description..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition"
            />
          </form>

          {/* Action filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {ALL_ACTIONS.map(a => (
                <option key={a} value={a}>{(ACTION_CONFIG[a] || DEFAULT_CONFIG).label}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => { fetchLogs(pagination.page); fetchStats(); }}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
            <span className="ml-3 text-slate-500 text-sm">Loading activity logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No activities found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => {
                    const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                    const Icon = config.icon;
                    return (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-[120px]">
                            <p className="text-sm font-medium text-slate-900 truncate">{log.userName || '–'}</p>
                            <p className="text-xs text-slate-400 truncate">{log.userEmail || '–'}</p>
                            <span className={`inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                              log.userRole === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {log.userRole}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 max-w-xs truncate">{log.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          {log.targetName ? (
                            <span className="text-sm text-slate-500 truncate max-w-[150px] block">{log.targetName}</span>
                          ) : (
                            <span className="text-xs text-slate-300">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-slate-100">
              {logs.map(log => {
                const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                const Icon = config.icon;
                return (
                  <div key={log._id} className="flex items-start gap-3 p-4">
                    <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">{log.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          log.userRole === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>{log.userRole}</span>
                        <span className="text-xs text-slate-400">{log.userName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivityLog;
