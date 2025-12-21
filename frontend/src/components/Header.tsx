// ============================================================================
// ISKOlarship - Header Component
// Navigation bar with authentication controls - Blue Theme Design
// ============================================================================

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  GraduationCap,
  LayoutDashboard,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

interface HeaderProps {
  onDemoLogin: () => void;
}

const Header: React.FC<HeaderProps> = ({ onDemoLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Navigation links matching Figma mockup
  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/#about', label: 'About', isAnchor: true },
    { path: '/#features', label: 'Features', isAnchor: true },
    { path: '/#how-it-works', label: 'How It Works', isAnchor: true },
    { path: '/scholarships', label: 'Scholarships' },
    { path: '/#contact', label: 'Contact', isAnchor: true },
  ];

  const isActiveLink = (path: string) => {
    if (path.includes('#')) return false;
    return location.pathname === path;
  };

  const handleNavClick = (link: { path: string; isAnchor?: boolean }) => {
    if (link.isAnchor) {
      const id = link.path.split('#')[1];
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      } else {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="container-app">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-display font-bold text-slate-800">
                  ISKO<span className="text-primary-600">larship</span>
                </span>
                <p className="text-[10px] text-slate-500 -mt-0.5">Smart Scholarship Matching</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                link.isAnchor ? (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 hover:text-primary-600 hover:bg-primary-50`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      isActiveLink(link.path)
                        ? 'text-primary-600'
                        : 'text-slate-600 hover:text-primary-600 hover:bg-primary-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
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
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
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
                          {'course' in (user || {}) && (
                            <p className="text-xs text-slate-500 mt-1">
                              {(user as any)?.course} • {(user as any)?.yearLevel}
                            </p>
                          )}
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
                <div className="flex items-center gap-4">
                  <button
                    onClick={onDemoLogin}
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors rounded-lg hover:bg-primary-50"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={onDemoLogin}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
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
            <div className="lg:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  link.isAnchor ? (
                    <button
                      key={link.path}
                      onClick={() => {
                        handleNavClick(link);
                        setIsMobileMenuOpen(false);
                      }}
                      className="px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 hover:bg-slate-100 text-left"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                        isActiveLink(link.path)
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                
                {/* Mobile Auth Buttons */}
                {!isAuthenticated && (
                  <div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
                    <button
                      onClick={() => {
                        onDemoLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg text-left"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        onDemoLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
