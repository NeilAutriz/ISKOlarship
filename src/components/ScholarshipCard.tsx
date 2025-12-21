// ============================================================================
// ISKOlarship - ScholarshipCard Component
// Individual scholarship card with eligibility info and prediction
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
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { Scholarship, MatchResult, ScholarshipType } from '../types';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  matchResult?: MatchResult;
  showPrediction?: boolean;
  onBookmark?: (scholarshipId: string) => void;
  isBookmarked?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

const ScholarshipCard: React.FC<ScholarshipCardProps> = ({
  scholarship,
  matchResult,
  showPrediction = true,
  onBookmark,
  isBookmarked = false,
  variant = 'default'
}) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Calculate days until deadline
  const getDaysUntil = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get type badge style
  const getTypeBadge = (type: ScholarshipType) => {
    switch (type) {
      case 'Financial Assistance':
        return 'badge-warning';
      case 'Thesis/Research Grant':
        return 'badge-info';
      case 'Merit-Based':
        return 'badge-success';
      case 'Need-Based':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  // Get eligibility status
  const getEligibilityStatus = () => {
    if (!matchResult) return null;
    
    if (matchResult.isEligible) {
      return {
        icon: CheckCircle,
        text: 'Eligible',
        className: 'text-green-600 bg-green-50'
      };
    } else {
      return {
        icon: XCircle,
        text: 'Not Eligible',
        className: 'text-red-600 bg-red-50'
      };
    }
  };

  // Get probability color
  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const eligibilityStatus = getEligibilityStatus();
  const daysUntil = scholarship.applicationDeadline ? getDaysUntil(scholarship.applicationDeadline) : null;

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link
        to={`/scholarships/${scholarship.id}`}
        className="block p-4 border border-slate-200 rounded-xl hover:border-uplb-300 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 truncate">{scholarship.name}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {formatCurrency(scholarship.awardAmount || 0)}
              </span>
              {scholarship.applicationDeadline && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(scholarship.applicationDeadline)}
                </span>
              )}
            </div>
          </div>
          {matchResult && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              matchResult.isEligible ? 'text-green-600' : 'text-red-600'
            }`}>
              {matchResult.isEligible ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Default and detailed variants
  return (
    <div className={`card overflow-hidden hover:shadow-lg transition-all ${
      variant === 'detailed' ? 'p-0' : ''
    }`}>
      {/* Header */}
      <div className={`${variant === 'detailed' ? 'p-6 border-b border-slate-100' : 'p-6 pb-4'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${getTypeBadge(scholarship.type)}`}>
                {scholarship.type}
              </span>
              {eligibilityStatus && (
                <span className={`badge ${eligibilityStatus.className}`}>
                  <eligibilityStatus.icon className="w-3 h-3 mr-1" />
                  {eligibilityStatus.text}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
              {scholarship.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{scholarship.sponsor}</p>
          </div>
          
          {onBookmark && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onBookmark(scholarship.id);
              }}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'bg-gold-100 text-gold-600' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`${variant === 'detailed' ? 'p-6' : 'px-6'}`}>
        {/* Amount */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
            <Award className="w-5 h-5 text-gold-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Grant Amount</div>
            <div className="text-xl font-bold text-gold-700">
              {formatCurrency(scholarship.awardAmount || 0)}
            </div>
          </div>
        </div>

        {/* Key Requirements */}
        <div className="space-y-2 mb-4">
          {scholarship.eligibilityCriteria?.minGWA && (
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">
                Minimum GWA: <strong>{scholarship.eligibilityCriteria.minGWA.toFixed(2)}</strong>
              </span>
            </div>
          )}
          
          {scholarship.eligibilityCriteria?.requiredYearLevels && scholarship.eligibilityCriteria.requiredYearLevels.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">
                {scholarship.eligibilityCriteria.requiredYearLevels.join(', ')}
              </span>
            </div>
          )}

          {scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">
                {scholarship.eligibilityCriteria.eligibleColleges.length === 1
                  ? scholarship.eligibilityCriteria.eligibleColleges[0]
                  : `${scholarship.eligibilityCriteria.eligibleColleges.length} eligible colleges`}
              </span>
            </div>
          )}

          {scholarship.eligibilityCriteria?.maxAnnualFamilyIncome && (
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">
                Max Income: {formatCurrency(scholarship.eligibilityCriteria.maxAnnualFamilyIncome)}
              </span>
            </div>
          )}

          {scholarship.eligibilityCriteria?.eligibleProvinces && scholarship.eligibilityCriteria.eligibleProvinces.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">
                {scholarship.eligibilityCriteria.eligibleProvinces.length === 1
                  ? scholarship.eligibilityCriteria.eligibleProvinces[0]
                  : `${scholarship.eligibilityCriteria.eligibleProvinces.length} provinces`}
              </span>
            </div>
          )}
        </div>

        {/* Prediction Score (if available) */}
        {showPrediction && matchResult?.predictionScore !== undefined && matchResult.isEligible && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Success Probability</span>
              <span className={`text-lg font-bold ${getProbabilityColor(matchResult.predictionScore)}`}>
                {(matchResult.predictionScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  matchResult.predictionScore >= 0.7
                    ? 'bg-green-500'
                    : matchResult.predictionScore >= 0.4
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${matchResult.predictionScore * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed Criteria (if not eligible) */}
        {matchResult && !matchResult.isEligible && matchResult.failedCriteria.length > 0 && (
          <div className="bg-red-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Not Eligible Due To:</span>
            </div>
            <ul className="space-y-1">
              {matchResult.failedCriteria.slice(0, 3).map((criteria, index) => (
                <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                  <XCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                  <span>{criteria}</span>
                </li>
              ))}
              {matchResult.failedCriteria.length > 3 && (
                <li className="text-sm text-red-500 italic">
                  +{matchResult.failedCriteria.length - 3} more criteria
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`${variant === 'detailed' ? 'px-6 py-4 bg-slate-50 border-t border-slate-100' : 'p-6 pt-4'}`}>
        <div className="flex items-center justify-between">
          {/* Deadline */}
          <div>
            {scholarship.applicationDeadline ? (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                  {formatDate(scholarship.applicationDeadline)}
                </span>
                {daysUntil !== null && daysUntil > 0 && daysUntil <= 14 && (
                  <span className="text-orange-600 font-medium">
                    ({daysUntil} days left)
                  </span>
                )}
                {daysUntil !== null && daysUntil <= 0 && (
                  <span className="text-red-600 font-medium">(Closed)</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">No deadline specified</span>
            )}
          </div>

          {/* View Button */}
          <Link
            to={`/scholarships/${scholarship.id}`}
            className="inline-flex items-center gap-1 text-uplb-700 font-semibold text-sm hover:text-uplb-800 transition-colors"
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