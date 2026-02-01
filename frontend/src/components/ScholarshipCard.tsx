// ============================================================================
// ISKOlarship - ScholarshipCard Component
// Enhanced, color-coded scholarship card with clear visual hierarchy
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Clock,
  GraduationCap,
  TrendingUp,
  Users,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Sparkles,
  Building2,
  FileText
} from 'lucide-react';
import { Scholarship, MatchResult, ScholarshipType } from '../types';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  matchResult?: MatchResult;
  showPrediction?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

// Color schemes for different scholarship types - Clean design with good contrast
const typeColorSchemes: Record<string, {
  gradient: string;
  accent: string;
  badge: string;
  badgeGradient: string;
  icon: string;
  iconBg: string;
  border: string;
  headerBg: string;
  tagIcon: string;
}> = {
  'university': {
    gradient: 'from-blue-600 to-blue-700',
    accent: 'blue',
    badge: 'bg-blue-600 text-white',
    badgeGradient: 'from-blue-500 to-blue-600',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
    border: 'border-l-blue-500',
    headerBg: 'bg-gradient-to-r from-blue-50 via-blue-100/50 to-white',
    tagIcon: 'GraduationCap',
  },
  'government': {
    gradient: 'from-amber-500 to-amber-600',
    accent: 'amber',
    badge: 'bg-amber-600 text-white',
    badgeGradient: 'from-amber-500 to-amber-600',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    border: 'border-l-amber-500',
    headerBg: 'bg-gradient-to-r from-amber-50 via-amber-100/50 to-white',
    tagIcon: 'Building2',
  },
  'thesis_grant': {
    gradient: 'from-emerald-500 to-emerald-600',
    accent: 'emerald',
    badge: 'bg-emerald-600 text-white',
    badgeGradient: 'from-emerald-500 to-teal-600',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    border: 'border-l-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-white',
    tagIcon: 'FileText',
  },
  'Thesis/Research Grant': {
    gradient: 'from-emerald-500 to-emerald-600',
    accent: 'emerald',
    badge: 'bg-emerald-600 text-white',
    badgeGradient: 'from-emerald-500 to-teal-600',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    border: 'border-l-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-white',
    tagIcon: 'FileText',
  },
  'private': {
    gradient: 'from-purple-500 to-purple-600',
    accent: 'purple',
    badge: 'bg-purple-600 text-white',
    badgeGradient: 'from-purple-500 to-violet-600',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-100',
    border: 'border-l-purple-500',
    headerBg: 'bg-gradient-to-r from-purple-50 via-purple-100/50 to-white',
    tagIcon: 'Sparkles',
  },
  'Private Scholarship': {
    gradient: 'from-purple-500 to-purple-600',
    accent: 'purple',
    badge: 'bg-purple-600 text-white',
    badgeGradient: 'from-purple-500 to-violet-600',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-100',
    border: 'border-l-purple-500',
    headerBg: 'bg-gradient-to-r from-purple-50 via-purple-100/50 to-white',
    tagIcon: 'Sparkles',
  },
  'college': {
    gradient: 'from-teal-500 to-teal-600',
    accent: 'teal',
    badge: 'bg-teal-600 text-white',
    badgeGradient: 'from-teal-500 to-cyan-600',
    icon: 'text-teal-600',
    iconBg: 'bg-teal-100',
    border: 'border-l-teal-500',
    headerBg: 'bg-gradient-to-r from-teal-50 via-teal-100/50 to-white',
    tagIcon: 'GraduationCap',
  },
  'default': {
    gradient: 'from-slate-500 to-slate-600',
    accent: 'slate',
    badge: 'bg-slate-600 text-white',
    badgeGradient: 'from-slate-500 to-slate-600',
    icon: 'text-slate-600',
    iconBg: 'bg-slate-100',
    border: 'border-l-slate-500',
    headerBg: 'bg-gradient-to-r from-slate-50 via-slate-100/50 to-white',
    tagIcon: 'Award',
  },
};

const ScholarshipCard: React.FC<ScholarshipCardProps> = ({
  scholarship,
  matchResult,
  showPrediction = true,
  variant = 'default'
}) => {
  // Get color scheme based on type
  const getColorScheme = () => {
    const type = scholarship.type?.toLowerCase().replace(/[\s/]+/g, '_') || 'default';
    return typeColorSchemes[scholarship.type] || typeColorSchemes[type] || typeColorSchemes['default'];
  };

  const colorScheme = getColorScheme();

  // Format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || amount === 0) {
      return 'Varies';
    }
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get the award amount
  const getAwardAmount = (): number => {
    return scholarship.awardAmount ?? scholarship.totalGrant ?? 0;
  };

  // Get scholarship ID
  const getScholarshipId = (): string => {
    return scholarship.id || (scholarship as any)._id || '';
  };

  // Format date
  const formatDate = (date: Date | string | undefined | null): string => {
    if (!date) return 'No deadline';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(dateObj);
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate days until deadline
  const getDaysUntil = (date: Date | string | undefined | null): number => {
    if (!date) return -1;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = typeof date === 'string' ? new Date(date) : new Date(date);
      if (isNaN(deadline.getTime())) return -1;
      deadline.setHours(0, 0, 0, 0);
      return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return -1;
    }
  };

  // Format scholarship type for display
  const formatType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .replace(/\//g, ' / ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get eligibility status
  const getEligibilityStatus = () => {
    if (!matchResult) return null;
    
    if (matchResult.isEligible) {
      return {
        icon: CheckCircle,
        text: 'You\'re Eligible!',
        className: 'bg-green-50 text-green-700 border-green-200'
      };
    } else {
      return {
        icon: XCircle,
        text: 'Not Eligible',
        className: 'bg-red-50 text-red-700 border-red-200'
      };
    }
  };

  // Get probability level
  const getProbabilityLevel = (probability: number) => {
    if (probability >= 0.7) return { text: 'High', color: 'text-green-600', bg: 'bg-green-500' };
    if (probability >= 0.4) return { text: 'Medium', color: 'text-amber-600', bg: 'bg-amber-500' };
    return { text: 'Low', color: 'text-red-600', bg: 'bg-red-500' };
  };

  const eligibilityStatus = getEligibilityStatus();
  const daysUntil = scholarship.applicationDeadline ? getDaysUntil(scholarship.applicationDeadline) : null;
  const amount = getAwardAmount();
  const yearLevels = scholarship.eligibilityCriteria?.requiredYearLevels || 
                     scholarship.eligibilityCriteria?.eligibleClassifications || [];

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link
        to={`/scholarships/${getScholarshipId()}`}
        className={`block bg-white rounded-xl border-l-4 ${colorScheme.border} border border-slate-200 
                   hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${colorScheme.badge}`}>
                  <FileText className="w-3 h-3" />
                  {formatType(scholarship.type)}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 truncate text-base">{scholarship.name}</h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold text-gold-700">
                  <Award className="w-4 h-4" />
                  {amount > 0 ? formatCurrency(amount) : 'Varies'}
                </span>
                {scholarship.applicationDeadline && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-4 h-4" />
                    {formatDate(scholarship.applicationDeadline)}
                  </span>
                )}
              </div>
            </div>
            {matchResult && (
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl shadow-sm ${
                matchResult.isEligible ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {matchResult.isEligible ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default and detailed variants - Enhanced wider card design
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden 
                    hover:shadow-xl hover:border-slate-300 transition-all duration-300
                    border-l-4 ${colorScheme.border}`}>
      
      {/* Color-coded Header */}
      <div className={`${colorScheme.headerBg} px-6 py-5 border-b border-slate-100`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Type & Status Badges - Enhanced Design */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              {/* Type Badge - Clean Gradient Style */}
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${colorScheme.badge}`}>
                <Award className="w-4 h-4" />
                {formatType(scholarship.type)}
              </span>
              {eligibilityStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border-2 ${eligibilityStatus.className}`}>
                  <eligibilityStatus.icon className="w-4 h-4" />
                  {eligibilityStatus.text}
                  {matchResult?.isEligible && matchResult?.predictionScore !== undefined && (
                    <span className="ml-1.5 px-2 py-0.5 bg-white/90 text-green-700 rounded-full text-xs font-extrabold">
                      {Math.round(matchResult.predictionScore * 100)}%
                    </span>
                  )}
                </span>
              )}
              {daysUntil !== null && daysUntil > 0 && daysUntil <= 7 && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-200">
                  <Clock className="w-3.5 h-3.5" />
                  {daysUntil} days left
                </span>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">
              {scholarship.name}
            </h3>
            
            {/* Sponsor */}
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <span className="font-medium">{scholarship.sponsor}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-5">
        {/* Grant Amount - Prominent Display */}
        <div className="flex items-center gap-4 mb-5 p-4 bg-gradient-to-r from-gold-50 to-amber-50 rounded-xl border border-gold-100">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-amber-500 flex items-center justify-center shadow-sm">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Grant Amount</div>
            <div className="text-2xl font-bold text-slate-900">
              {amount > 0 ? formatCurrency(amount) : (scholarship.awardDescription || 'Varies')}
            </div>
            {scholarship.awardDescription && amount > 0 && (
              <div className="text-xs text-slate-500 mt-0.5">{scholarship.awardDescription}</div>
            )}
          </div>
          {scholarship.slots !== undefined && scholarship.slots > 0 && (
            <div className="text-right">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Slots</div>
              <div className="text-lg font-bold text-primary-600">
                {scholarship.remainingSlots ?? scholarship.slots}/{scholarship.slots}
              </div>
            </div>
          )}
        </div>

        {/* Key Requirements Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* GWA Requirement */}
          {(scholarship.eligibilityCriteria?.maxGWA || scholarship.eligibilityCriteria?.minGWA) && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className={`w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center`}>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">GWA Required</div>
                <div className="font-semibold text-slate-900">
                  {(scholarship.eligibilityCriteria.maxGWA || scholarship.eligibilityCriteria.minGWA || 0).toFixed(2)} or better
                </div>
              </div>
            </div>
          )}
          
          {/* Year Levels */}
          {yearLevels.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Year Level</div>
                <div className="font-semibold text-slate-900 text-sm">
                  {yearLevels.slice(0, 2).map((y: string) => y.charAt(0).toUpperCase() + y.slice(1)).join(', ')}
                  {yearLevels.length > 2 && ` +${yearLevels.length - 2}`}
                </div>
              </div>
            </div>
          )}

          {/* Colleges */}
          {scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Colleges</div>
                <div className="font-semibold text-slate-900 text-sm">
                  {scholarship.eligibilityCriteria.eligibleColleges.length === 1
                    ? (scholarship.eligibilityCriteria.eligibleColleges[0] as string).replace('College of ', '')
                    : `${scholarship.eligibilityCriteria.eligibleColleges.length} eligible`}
                </div>
              </div>
            </div>
          )}

          {/* Income */}
          {scholarship.eligibilityCriteria?.maxAnnualFamilyIncome && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Max Income</div>
                <div className="font-semibold text-slate-900 text-sm">
                  {formatCurrency(scholarship.eligibilityCriteria.maxAnnualFamilyIncome)}
                </div>
              </div>
            </div>
          )}

          {/* Province */}
          {scholarship.eligibilityCriteria?.eligibleProvinces && scholarship.eligibilityCriteria.eligibleProvinces.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Province</div>
                <div className="font-semibold text-slate-900 text-sm">
                  {scholarship.eligibilityCriteria.eligibleProvinces.length === 1
                    ? scholarship.eligibilityCriteria.eligibleProvinces[0]
                    : `${scholarship.eligibilityCriteria.eligibleProvinces.length} provinces`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prediction Score */}
        {showPrediction && matchResult?.predictionScore !== undefined && matchResult.isEligible && (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-4 border border-primary-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-semibold text-slate-700">Success Probability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  matchResult.predictionScore >= 0.7 ? 'bg-green-100 text-green-700' :
                  matchResult.predictionScore >= 0.4 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {getProbabilityLevel(matchResult.predictionScore).text}
                </span>
                <span className={`text-xl font-bold ${getProbabilityLevel(matchResult.predictionScore).color}`}>
                  {(matchResult.predictionScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProbabilityLevel(matchResult.predictionScore).bg}`}
                style={{ width: `${matchResult.predictionScore * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed Criteria */}
        {matchResult && !matchResult.isEligible && matchResult.eligibilityDetails && (
          <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Why You're Not Eligible:</span>
            </div>
            <ul className="space-y-1.5">
              {matchResult.eligibilityDetails
                .filter((detail: any) => !detail.passed)
                .slice(0, 3)
                .map((detail: any, index: number) => (
                  <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{detail.criterion}</span>
                  </li>
                ))}
              {matchResult.eligibilityDetails.filter((d: any) => !d.passed).length > 3 && (
                <li className="text-sm text-red-500 italic pl-6">
                  +{matchResult.eligibilityDetails.filter((d: any) => !d.passed).length - 3} more requirements
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          {/* Deadline */}
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${daysUntil !== null && daysUntil <= 7 ? 'text-orange-500' : 'text-slate-400'}`} />
            {scholarship.applicationDeadline ? (
              <div className="text-sm">
                <span className="text-slate-600 font-medium">
                  {formatDate(scholarship.applicationDeadline)}
                </span>
                {daysUntil !== null && daysUntil > 0 && daysUntil <= 14 && (
                  <span className={`ml-2 font-semibold ${daysUntil <= 7 ? 'text-orange-600' : 'text-slate-500'}`}>
                    ({daysUntil} days left)
                  </span>
                )}
                {daysUntil !== null && daysUntil <= 0 && (
                  <span className="ml-2 text-red-600 font-semibold">(Closed)</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">No deadline specified</span>
            )}
          </div>

          {/* View Details Button */}
          <Link
            to={`/scholarships/${getScholarshipId()}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold 
                       rounded-lg hover:bg-primary-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ScholarshipCard;
