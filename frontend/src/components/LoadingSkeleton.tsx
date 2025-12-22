// ============================================================================
// ISKOlarship - Loading Skeleton Components
// Reusable loading state components with beautiful animations
// ============================================================================

import React from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================================
// Full Page Loading Spinner
// ============================================================================

interface FullPageLoaderProps {
  message?: string;
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({ 
  message = 'Loading...' 
}) => (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-100/50">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
        <div className="absolute -inset-2 bg-primary-500/20 rounded-3xl animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-slate-700 font-semibold text-lg">{message}</p>
        <p className="text-slate-500 text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// Inline Loading Spinner
// ============================================================================

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({ 
  size = 'md',
  message,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-primary-600 animate-spin`} />
      {message && <span className="text-slate-600">{message}</span>}
    </div>
  );
};

// ============================================================================
// Card Loading Skeleton
// ============================================================================

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  count = 1,
  className = ''
}) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse ${className}`}
      >
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 rounded-xl" />
            <div>
              <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-32" />
            </div>
          </div>
          <div className="w-16 h-6 bg-slate-100 rounded-full" />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-5/6" />
          <div className="h-3 bg-slate-100 rounded w-4/6" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <div className="h-5 bg-slate-200 rounded w-24" />
          <div className="h-8 bg-slate-200 rounded-lg w-20" />
        </div>
      </div>
    ))}
  </>
);

// ============================================================================
// Table Row Skeleton
// ============================================================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5,
  columns = 5,
  className = ''
}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div 
        key={rowIndex} 
        className="px-6 py-4 border-b border-slate-50 animate-pulse"
        style={{ animationDelay: `${rowIndex * 100}ms` }}
      >
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={`h-4 bg-slate-100 rounded flex-1 ${colIndex === 0 ? 'max-w-[200px]' : ''}`} 
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// Stats Card Skeleton
// ============================================================================

interface StatSkeletonProps {
  count?: number;
  className?: string;
}

export const StatSkeleton: React.FC<StatSkeletonProps> = ({ 
  count = 4,
  className = ''
}) => (
  <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          <div className="w-16 h-6 bg-slate-100 rounded-full" />
        </div>
        <div className="h-8 bg-slate-200 rounded w-16 mb-1" />
        <div className="h-4 bg-slate-100 rounded w-24" />
      </div>
    ))}
  </div>
);

// ============================================================================
// Chart Skeleton
// ============================================================================

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ 
  height = 300,
  className = ''
}) => (
  <div 
    className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse ${className}`}
    style={{ height }}
  >
    {/* Title */}
    <div className="h-5 bg-slate-200 rounded w-40 mb-6" />
    
    {/* Chart area */}
    <div className="flex items-end justify-between gap-2 h-[calc(100%-60px)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i}
          className="flex-1 bg-slate-100 rounded-t-lg"
          style={{ 
            height: `${30 + Math.random() * 60}%`,
            animationDelay: `${i * 50}ms`
          }}
        />
      ))}
    </div>
  </div>
);

// ============================================================================
// Scholarship List Skeleton
// ============================================================================

interface ScholarshipListSkeletonProps {
  count?: number;
  variant?: 'grid' | 'list';
  className?: string;
}

export const ScholarshipListSkeleton: React.FC<ScholarshipListSkeletonProps> = ({ 
  count = 6,
  variant = 'grid',
  className = ''
}) => (
  <div className={`${variant === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'} ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        {/* Color bar */}
        <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-300" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-slate-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          </div>

          {/* Badge */}
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-slate-100 rounded-full w-20" />
            <div className="h-6 bg-slate-100 rounded-full w-24" />
          </div>

          {/* Description */}
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="h-10 bg-slate-50 rounded-lg" />
            <div className="h-10 bg-slate-50 rounded-lg" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="h-6 bg-slate-200 rounded w-24" />
            <div className="h-9 bg-slate-200 rounded-lg w-24" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  children
}) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
        <InlineLoader size="lg" message={message} />
      </div>
    )}
  </div>
);

export default {
  FullPageLoader,
  InlineLoader,
  CardSkeleton,
  TableSkeleton,
  StatSkeleton,
  ChartSkeleton,
  ScholarshipListSkeleton,
  LoadingOverlay
};
