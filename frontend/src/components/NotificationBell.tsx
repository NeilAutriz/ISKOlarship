// ============================================================================
// ISKOlarship - NotificationBell Component
// Dropdown bell icon showing in-app notifications for students
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  FileText,
  Award,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { notificationApi, InAppNotification } from '../services/apiClient';

// ============================================================================
// Notification Icon Mapping
// ============================================================================

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  application_approved:       { icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50' },
  application_rejected:       { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50' },
  application_under_review:   { icon: Clock,        color: 'text-blue-600',   bg: 'bg-blue-50' },
  document_verified:          { icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50' },
  document_rejected:          { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50' },
  document_resubmit:          { icon: RefreshCw,    color: 'text-amber-600',  bg: 'bg-amber-50' },
  all_documents_verified:     { icon: CheckCheck,   color: 'text-green-600',  bg: 'bg-green-50' },
};

const defaultConfig = { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-50' };

// ============================================================================
// Time-ago Helper
// ============================================================================

const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================================
// NotificationBell Component
// ============================================================================

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ----------------------------------------------------------
  // Fetch unread count (lightweight — for badge)
  // ----------------------------------------------------------
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // silent — will retry on next poll
    }
  }, []);

  // ----------------------------------------------------------
  // Fetch full notification list
  // ----------------------------------------------------------
  const fetchNotifications = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll({ limit: 20, offset });
      if (res.success) {
        if (offset === 0) {
          setNotifications(res.data.notifications);
        } else {
          setNotifications(prev => [...prev, ...res.data.notifications]);
        }
        setUnreadCount(res.data.unreadCount);
        setHasMore(res.data.hasMore);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // ----------------------------------------------------------
  // Poll for unread count every 30s
  // ----------------------------------------------------------
  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  // ----------------------------------------------------------
  // Close dropdown on outside click
  // ----------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ----------------------------------------------------------
  // Toggle dropdown
  // ----------------------------------------------------------
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications(0);
    }
    setIsOpen(prev => !prev);
  };

  // ----------------------------------------------------------
  // Mark single notification as read
  // ----------------------------------------------------------
  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  // ----------------------------------------------------------
  // Mark all as read
  // ----------------------------------------------------------
  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  // ----------------------------------------------------------
  // Delete notification
  // ----------------------------------------------------------
  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // Refresh unread count
      fetchUnreadCount();
    } catch {
      // silent
    }
  };

  // ----------------------------------------------------------
  // Handle notification click
  // ----------------------------------------------------------
  const handleNotificationClick = (n: InAppNotification) => {
    if (!n.read) {
      markAsRead(n._id);
    }
    // Navigate based on type
    if (n.type.startsWith('application_')) {
      navigate('/my-applications');
    } else if (n.type.startsWith('document_') || n.type === 'all_documents_verified') {
      navigate('/my-profile');
    }
    setIsOpen(false);
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:text-primary-600 hover:bg-slate-50 transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[480px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[100] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Bell className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-0.5">You'll see updates about your applications and documents here</p>
              </div>
            ) : (
              <>
                {notifications.map((n) => {
                  const cfg = typeConfig[n.type] || defaultConfig;
                  const IconComp = cfg.icon;

                  return (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-b-0 ${
                        n.read
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-blue-50/40 hover:bg-blue-50/70'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center mt-0.5`}>
                        <IconComp className={`w-4.5 h-4.5 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${n.read ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                            className="p-1 rounded hover:bg-slate-200 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNotification(n._id, e)}
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={() => fetchNotifications(notifications.length)}
                    disabled={loading}
                    className="w-full py-2.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/80">
              <button
                onClick={() => { navigate('/my-profile'); setIsOpen(false); }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Notification Settings →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
