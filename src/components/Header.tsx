// ============================================================================
// ISKOlarship - Header Component
// Navigation bar with authentication controls
// ============================================================================

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  GraduationCap,
  Search,
  LayoutDashboard,
  BarChart3,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  onDemoLogin: () => void;
}

const Header: React.FC<HeaderProps> = ({ onDemoLogin }) => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navLinks = [
    { path: '/', label: 'Home', icon: GraduationCap },
    { path: '/scholarships', label: 'Scholarships', icon: Search },
    ...(isAuthenticated ? [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ] : []),
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActiveLink = (path: string) => {
    if (path === '/scholarships' && location.pathname === '/') {
      return false;
    }
    return location.pathname === path;
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-slate-200/50">
        <div className="container-app">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-uplb flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-display font-bold text-uplb-800">
                  ISKO<span className="text-gold-500">larship</span>
                </span>
                <p className="text-[10px] text-slate-500 -mt-0.5">UPLB Scholarship Platform</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActiveLink(link.path)
                      ? 'bg-uplb-100 text-uplb-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-uplb flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-700">
                      {user?.firstName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsUserMenuOpen(false)} 
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-100 py-2 z-50">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-medium text-slate-900">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {user?.course} • {user?.yearLevel}
                          </p>
                        </div>
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        <hr className="my-2 border-slate-100" />
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-ghost btn-sm hidden sm:flex"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={onDemoLogin}
                    className="btn-primary btn-sm"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Try Demo</span>
                    <span className="sm:hidden">Demo</span>
                  </button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-slate-700" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-3 ${
                      isActiveLink(link.path)
                        ? 'bg-uplb-100 text-uplb-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div 
            className="modal-content p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-uplb flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900">
                Welcome to ISKOlarship
              </h2>
              <p className="text-slate-600 mt-2">
                Sign in to discover scholarships matched to your profile
              </p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="label">UP Mail</label>
                <input 
                  type="email" 
                  className="input" 
                  placeholder="yourname@up.edu.ph"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Sign In
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">or</span>
              </div>
            </div>

            <button
              onClick={() => {
                onDemoLogin();
                setShowAuthModal(false);
              }}
              className="btn-secondary w-full"
            >
              <User className="w-4 h-4" />
              Continue with Demo Account
            </button>

            <p className="text-center text-sm text-slate-500 mt-4">
              Don't have an account?{' '}
              <button className="text-uplb-800 font-medium hover:underline">
                Register here
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;