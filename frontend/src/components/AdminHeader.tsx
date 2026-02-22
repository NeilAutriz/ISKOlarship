// ============================================================================
// ISKOlarship - Admin Portal Header
// Navigation bar for authenticated admin views
// ============================================================================

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard,
  Users,
  Award,
  User,
  LogOut,
  GraduationCap,
  Menu,
  X,
  Brain,
  ShieldCheck,
  Activity
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const AdminHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/applicants', label: 'Applicants', icon: Users },
    { path: '/admin/scholarships', label: 'Scholarships', icon: Award },
    { path: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
    { path: '/admin/model-training', label: 'ML Models', icon: Brain },
    { path: '/admin/activity-logs', label: 'Activity Logs', icon: Activity },
  ];

  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/admin/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-lg font-bold text-primary-600">ISKOlarship</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Admin Portal</p>
            </div>
          </Link>

          {/* Desktop Navigation — centered */}
          <nav className="hidden lg:flex items-center gap-0.5 mx-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isActiveLink(link.path);
              
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-slate-500 hover:text-primary-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            <NotificationBell />
            <Link
              to="/admin/profile"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActiveLink('/admin/profile')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-slate-500 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 font-medium hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 py-4">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isActiveLink(link.path);
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="border-t border-slate-100 my-2" />
              <Link
                to="/admin/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <User className="w-5 h-5" />
                My Profile
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-lg text-left w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;
