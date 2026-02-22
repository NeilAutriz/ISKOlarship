// ============================================================================
// ISKOlarship - Student Activity Log Page
// Shows student's own activity history with filtering and pagination
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, LogIn, UserPlus, FileEdit, Upload, Send, XCircle,
  CheckCircle, RefreshCw, Clock, Filter, Search,
  ChevronLeft, ChevronRight, Calendar, ScanLine, Bell, Trash2
} from 'lucide-react';
import { activityLogApi, ActivityLogEntry, ActivityLogPagination } from '../../services/apiClient';

// ============================================================================
// Action Config — icon, color, label per action type
// ============================================================================

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  login:                          { icon: LogIn,       color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Login' },
  register:                       { icon: UserPlus,    color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Registration' },
  profile_update:                 { icon: FileEdit,    color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Profile Update' },
  document_upload:                { icon: Upload,      color: 'text-cyan-600',    bg: 'bg-cyan-50',    label: 'Document Upload' },
  document_delete:                { icon: Trash2,      color: 'text-red-500',     bg: 'bg-red-50',     label: 'Document Deleted' },
  application_create:             { icon: Send,        color: 'text-green-600',   bg: 'bg-green-50',   label: 'Application Created' },
  application_submit:             { icon: Send,        color: 'text-green-600',   bg: 'bg-green-50',   label: 'Application Submitted' },
  application_withdraw:           { icon: XCircle,     color: 'text-orange-600',  bg: 'bg-orange-50',  label: 'Application Withdrawn' },
  application_approve:            { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Application Approved' },
  application_reject:             { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50',     label: 'Application Rejected' },
  application_review:             { icon: Clock,       color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Under Review' },
  document_verify:                { icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-50',   label: 'Document Verified' },
  document_reject:                { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50',     label: 'Document Rejected' },
  document_resubmit:              { icon: RefreshCw,   color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Resubmit Requested' },
  document_verify_all:            { icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-50',   label: 'All Docs Verified' },
  notification_preferences_update:{ icon: Bell,        color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Notification Settings' },
};

const DEFAULT_CONFIG = { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Other' };

const STATUS_STYLE: Record<string, string> = {
  success: 'text-green-700 bg-green-100',
  failure: 'text-red-700 bg-red-100',
};

// ============================================================================
// Time-ago Helper
// ============================================================================

const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Student-relevant action filter options
const STUDENT_ACTIONS = [
  'login', 'register', 'profile_update', 'document_upload', 'document_delete',
  'application_create', 'application_submit', 'application_withdraw',
];

// ============================================================================
// Component
// ============================================================================

const StudentActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [pagination, setPagination] = useState<ActivityLogPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  // ----------------------------------------------------------
  // Fetch activity logs
  // ----------------------------------------------------------
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await activityLogApi.getMy({
        page,
        limit: 20,
        action: actionFilter || undefined,
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
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Client-side search filter
  const filteredLogs = localSearch
    ? logs.filter(l =>
        l.description.toLowerCase().includes(localSearch.toLowerCase()) ||
        (l.targetName || '').toLowerCase().includes(localSearch.toLowerCase())
      )
    : logs;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
            <p className="text-sm text-slate-500">Track all your actions and events</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition"
            />
          </div>
          {/* Action filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {STUDENT_ACTIONS.map(a => (
                <option key={a} value={a}>{(ACTION_CONFIG[a] || DEFAULT_CONFIG).label}</option>
              ))}
            </select>
          </div>
          {/* Refresh */}
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Activity list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
            <span className="ml-3 text-slate-500 text-sm">Loading activities...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No activities found</p>
            <p className="text-sm mt-1">Your actions will appear here as you use the platform</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
              const Icon = config.icon;
              return (
                <div key={log._id} className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 leading-snug">{log.description}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          {log.targetName && (
                            <span className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[200px]">• {log.targetName}</span>
                          )}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[log.status] || STATUS_STYLE.success}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                        <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
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

export default StudentActivityLog;
