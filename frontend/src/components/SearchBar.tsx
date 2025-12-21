// ============================================================================
// ISKOlarship - SearchBar Component
// Search input with suggestions and quick filters
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  ArrowRight,
  Clock,
  TrendingUp,
  Award,
  GraduationCap
} from 'lucide-react';
import { scholarshipApi } from '../services/apiClient';
import { Scholarship } from '../types';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  variant?: 'default' | 'hero' | 'compact';
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search scholarships...',
  showSuggestions = true,
  variant = 'default',
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Scholarship[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Recent searches (would be stored in localStorage in production)
  const recentSearches = ['AASP', 'thesis grant', 'financial assistance'];

  // Popular searches
  const popularSearches = ['LBMFI', 'Sterix', 'CAFS scholarship'];

  // Handle search
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      navigate(`/scholarships?search=${encodeURIComponent(query)}`);
    }
  };

  // Update suggestions based on query using API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length >= 2 && showSuggestions) {
        try {
          const response = await scholarshipApi.getAll({ search: query, limit: 5 });
          if (response.success && response.data?.scholarships) {
            setSuggestions(response.data.scholarships);
          } else {
            setSuggestions([]);
          }
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query, showSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search
  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
    onSearch?.('');
  };

  // Quick search
  const handleQuickSearch = (term: string) => {
    setQuery(term);
    onSearch?.(term);
    navigate(`/scholarships?search=${encodeURIComponent(term)}`);
    setIsFocused(false);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get variant styles
  const getContainerStyles = () => {
    switch (variant) {
      case 'hero':
        return 'max-w-2xl';
      case 'compact':
        return 'max-w-md';
      default:
        return 'max-w-xl';
    }
  };

  const getInputStyles = () => {
    switch (variant) {
      case 'hero':
        return 'py-4 pl-14 pr-14 text-lg rounded-2xl shadow-lg';
      case 'compact':
        return 'py-2.5 pl-10 pr-10 text-sm rounded-lg';
      default:
        return 'py-3 pl-12 pr-12 rounded-xl';
    }
  };

  const getIconSize = () => {
    switch (variant) {
      case 'hero':
        return 'w-6 h-6';
      case 'compact':
        return 'w-4 h-4';
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${getContainerStyles()} ${className}`}>
      <form onSubmit={handleSearch}>
        <div className="relative">
          {/* Search Icon */}
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${getIconSize()} text-slate-400`} />

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className={`w-full bg-white border border-slate-200 focus:border-uplb-400 focus:ring-2 focus:ring-uplb-100 outline-none transition-all ${getInputStyles()}`}
          />

          {/* Clear/Submit Button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
            {variant === 'hero' && (
              <button
                type="submit"
                className="p-2 bg-uplb-600 text-white rounded-xl hover:bg-uplb-700 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {isFocused && showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          {/* Search Suggestions */}
          {suggestions.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Scholarships
              </div>
              {suggestions.map(scholarship => (
                <Link
                  key={scholarship.id}
                  to={`/scholarships/${scholarship.id}`}
                  onClick={() => setIsFocused(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-uplb-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-uplb-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {scholarship.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Award className="w-3 h-3" />
                      {formatCurrency(scholarship.awardAmount || 0)}
                    </div>
                  </div>
                </Link>
              ))}
              <div className="px-4 py-2 border-t border-slate-100">
                <button
                  onClick={handleSearch}
                  className="text-sm text-uplb-600 font-medium hover:text-uplb-700"
                >
                  See all results for "{query}"
                </button>
              </div>
            </div>
          ) : query.length < 2 ? (
            <div className="py-2">
              {/* Recent Searches */}
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Recent Searches
              </div>
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(term)}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{term}</span>
                </button>
              ))}

              {/* Popular Searches */}
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">
                Popular Searches
              </div>
              {popularSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(term)}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <TrendingUp className="w-4 h-4 text-uplb-500" />
                  <span className="text-slate-700">{term}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No scholarships found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;