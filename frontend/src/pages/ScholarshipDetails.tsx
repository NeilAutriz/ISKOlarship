
// ============================================================================
// ISKOlarship - ScholarshipDetails Page
// Individual scholarship view with eligibility check and prediction factors
// Based on research paper Figures 10-12
// ============================================================================

import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ExternalLink,
  FileText,
  Sparkles,
  Share2,
  ChevronRight,
  Target,
  BarChart2,
  Percent,
  RefreshCw,
  Calculator,
  Lightbulb,
  Database,
  Globe2
} from 'lucide-react';
import { AuthContext } from '../App';
import { fetchScholarshipDetails, fetchScholarships, getPredictionForScholarship } from '../services/api';
import { applicationApi } from '../services/apiClient';
import { matchStudentToScholarships } from '../services/filterEngine';
import { predictScholarshipSuccess } from '../services/logisticRegression';
import {
  Scholarship,
  MatchResult,
  EligibilityCheckResult,
  isStudentProfile,
  PredictionResult,
  PredictionFactor,
  CustomCondition,
  ConditionType,
  ConditionImportance,
  Application,
  ApplicationStatus,
  STUDENT_PROFILE_FIELDS
} from '../types';

// HD UPLB Background Images for scholarship headers
const UPLB_BACKGROUND_IMAGES = [
  'https://international.uplb.edu.ph/wp-content/uploads/2022/02/M40A9936-min-scaled.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/UPLB_Academic_Heritage_Monument%2C_June_2023.jpg/2560px-UPLB_Academic_Heritage_Monument%2C_June_2023.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/6/66/Freedom_Park%2C_UPLB%2C_June_2023.jpg',
  'https://uplb.edu.ph/wp-content/uploads/2023/12/UPLB-receives-Environmental-Compliance-Certificate-from-DENR.webp',
  'https://uplb.edu.ph/wp-content/uploads/2021/12/UPLB-gains-20-new-HEI-partners-for-2021-II.jpg',
];

// Deterministic image selection based on scholarship ID
const getScholarshipBackground = (scholarshipId: string | undefined): string => {
  if (!scholarshipId) return UPLB_BACKGROUND_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < scholarshipId.length; i++) {
    const char = scholarshipId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return UPLB_BACKGROUND_IMAGES[Math.abs(hash) % UPLB_BACKGROUND_IMAGES.length];
};

const ScholarshipDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const openAuthModal = authContext?.openAuthModal;
  const studentUser = isStudentProfile(user) ? user : null;

  // State for scholarship data
  const [scholarship, setScholarship] = useState<Scholarship | undefined>(undefined);
  const [similarScholarships, setSimilarScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for existing application check
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);

  // Fetch existing application for this scholarship (if student is logged in)
  useEffect(() => {
    let isMounted = true;

    const checkExistingApplication = async () => {
      if (!studentUser || !id) {
        if (isMounted) setExistingApplication(null);
        return;
      }

      try {
        const response = await applicationApi.getMyApplications(undefined, 1, 100);
        if (isMounted && response.success && response.data?.applications) {
          // Find the most relevant application for this scholarship
          // Prioritize active (non-withdrawn, non-rejected) applications
          const matching = response.data.applications.filter((app: Application) => {
            const appScholarshipId = typeof app.scholarship === 'string'
              ? app.scholarship
              : (app.scholarship as Scholarship)?._id || (app.scholarship as Scholarship)?.id;
            return appScholarshipId === id || app.scholarshipId === id;
          });

          // Prefer active application over withdrawn/rejected
          const activeApp = matching.find((app: Application) => 
            app.status !== 'withdrawn' && app.status !== 'rejected'
          );
          setExistingApplication(activeApp || null);
        }
      } catch {
        // Silently fail — Apply button stays visible as fallback
        if (isMounted) setExistingApplication(null);
      }
    };

    checkExistingApplication();

    return () => {
      isMounted = false;
    };
  }, [studentUser, id]);

  // Fetch scholarship from API - updates mock data if API succeeds
  useEffect(() => {
    let isMounted = true;
    
    const loadScholarship = async () => {
      if (!id) {
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await fetchScholarshipDetails(id);
        if (isMounted && data) {
          setScholarship(data);
          // Fetch similar scholarships of the same type
          try {
            const allScholarships = await fetchScholarships({ type: data.type });
            const similar = allScholarships
              .filter(s => {
                const sId = s.id || s._id;
                const dataId = data.id || data._id;
                return sId !== id && sId !== dataId;
              })
              .slice(0, 3);
            if (isMounted && similar.length > 0) {
              setSimilarScholarships(similar);
            }
          } catch {
            // Keep using mock similar scholarships
          }
        } else if (isMounted) {
          setError('Scholarship not found');
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load scholarship:', err);
          setError('Failed to load scholarship details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadScholarship();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Get match result if user is logged in as student
  const matchResult = useMemo(() => {
    if (!studentUser || !scholarship) return null;
    const results = matchStudentToScholarships(studentUser, [scholarship]);
    return results.length > 0 ? results[0] : null;
  }, [studentUser, scholarship]);

  // State for prediction from backend API (personalized)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Fetch personalized prediction from backend API when eligible
  useEffect(() => {
    let isMounted = true;

    const loadPrediction = async () => {
      if (!studentUser || !scholarship || !matchResult?.isEligible) {
        if (isMounted) setPrediction(null);
        return;
      }

      const scholarshipId = scholarship.id || (scholarship as any)._id;
      if (!scholarshipId) {
        // Fallback to local prediction if no ID
        const localPrediction = predictScholarshipSuccess(studentUser, scholarship);
        if (isMounted) {
          setPrediction({
            probability: localPrediction.probability,
            probabilityPercentage: localPrediction.percentageScore,
            confidence: localPrediction.confidence,
            factors: localPrediction.factors,
            recommendation: localPrediction.recommendation,
            trainedModel: false
          });
        }
        return;
      }

      if (isMounted) setPredictionLoading(true);

      try {
        // Fetch personalized prediction from backend API (uses trained ML model)
        const apiPrediction = await getPredictionForScholarship(scholarshipId);
        if (isMounted && apiPrediction) {
          // API returns PredictionResult format directly
          setPrediction({
            ...apiPrediction,
            recommendation: apiPrediction.recommendation || getRecommendationText(apiPrediction.probability)
          });
        }
      } catch (error) {
        // Fallback to local prediction
        const localPrediction = predictScholarshipSuccess(studentUser, scholarship);
        if (isMounted) {
          setPrediction({
            probability: localPrediction.probability,
            probabilityPercentage: localPrediction.percentageScore,
            confidence: localPrediction.confidence,
            factors: localPrediction.factors,
            recommendation: localPrediction.recommendation,
            trainedModel: false
          });
        }
      } finally {
        if (isMounted) setPredictionLoading(false);
      }
    };

    loadPrediction();

    return () => {
      isMounted = false;
    };
  }, [studentUser, scholarship, matchResult?.isEligible]);

  // Helper to generate recommendation text
  const getRecommendationText = (probability: number): string => {
    const percentageScore = Math.round(probability * 100);
    if (percentageScore >= 75) return 'Strongly recommended! Your profile is an excellent match.';
    if (percentageScore >= 60) return 'Good match. You have a solid chance of approval.';
    if (percentageScore >= 40) return 'Moderate match. Consider strengthening your application.';
    if (percentageScore >= 25) return 'Low match. Review eligibility criteria carefully.';
    return 'Not recommended. You may not meet key requirements.';
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

  // Format date - handles both Date objects and strings
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Not specified';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return new Intl.DateTimeFormat('en-PH', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(dateObj);
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate days until deadline
  const getDaysUntil = (date: Date | string | undefined): number | null => {
    if (!date) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = date instanceof Date ? new Date(date) : new Date(date);
      if (isNaN(deadline.getTime())) return null;
      deadline.setHours(0, 0, 0, 0);
      return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  // Get probability color
  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper to get eligibility status from matchResult for a specific criterion
  // Supports multiple search patterns separated by '|'
  const getEligibilityStatus = (criterionPattern: string): boolean | null => {
    if (!criterionPattern || !matchResult || !matchResult.eligibilityDetails || !Array.isArray(matchResult.eligibilityDetails)) return null;
    
    // Support multiple patterns separated by '|'
    const patterns = criterionPattern.toLowerCase().split('|').map(p => p.trim());
    
    const detail = matchResult.eligibilityDetails.find(d => {
      if (!d || !d.criterion || typeof d.criterion !== 'string') return false;
      const criterion = d.criterion.toLowerCase();
      return patterns.some(pattern => criterion.includes(pattern));
    });
    
    return detail ? detail.passed : null;
  };

  const getProbabilityBg = (probability: number) => {
    if (probability >= 0.7) return 'bg-green-500';
    if (probability >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Not found state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="container-app">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-4">
              Loading Scholarship Details...
            </h1>
            <p className="text-slate-600">
              Please wait while we fetch the information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!scholarship || error) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="container-app">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-4">
              Scholarship Not Found
            </h1>
            <p className="text-slate-600 mb-8">
              {error || "The scholarship you're looking for doesn't exist or has been removed."}
            </p>
            <Link to="/scholarships" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Browse Scholarships
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const daysUntil = scholarship.applicationDeadline ? getDaysUntil(scholarship.applicationDeadline) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with UPLB Background Image */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${getScholarshipBackground(id)})` }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700/90 via-primary-600/85 to-primary-800/90" />
        <div className="relative container-app py-6">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/90 mb-6">
            <Link to="/" className="text-white hover:text-white/80 transition-colors no-underline">Home</Link>
            <ChevronRight className="w-4 h-4 text-white/70" />
            <Link to="/scholarships" className="text-white hover:text-white/80 transition-colors no-underline">Scholarships</Link>
            <ChevronRight className="w-4 h-4 text-white/70" />
            <span className="text-white font-medium truncate max-w-[200px]">{scholarship.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${
                  scholarship.type === 'Government Scholarship'
                    ? 'badge-warning'
                    : scholarship.type === 'Thesis/Research Grant'
                    ? 'badge-info'
                    : 'badge-success'
                }`}>
                  {scholarship.type}
                </span>
                {matchResult && (
                  <span className={`badge ${
                    matchResult.isEligible
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {matchResult.isEligible ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Eligible</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> Not Eligible</>
                    )}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-2">
                {scholarship.name}
              </h1>
              <p className="text-slate-300">{scholarship.sponsor}</p>
            </div>

            {/* Amount Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center min-w-[200px]">
              <div className="text-sm text-slate-300 mb-1">Grant Amount</div>
              <div className="text-3xl font-bold text-gold-400">
                {formatCurrency(scholarship.awardAmount || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-app py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {scholarship.description && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary-600" />
                  About This Scholarship
                </h2>
                <p className="text-slate-600 leading-relaxed">{scholarship.description}</p>
              </div>
            )}

            {/* Eligibility Requirements */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary-600" />
                Eligibility Requirements
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {/* GWA - Note: In Philippine grading system, lower GWA is better (1.0 = highest)
                    We display maxGWA as the requirement (the threshold students must meet or beat)
                    maxGWA of 5.0 or higher means "no restriction" (backend default) */}
                {(() => {
                  const maxGWA = scholarship.eligibilityCriteria?.maxGWA;
                  const minGWA = scholarship.eligibilityCriteria?.minGWA;
                  // Only show GWA requirement if there's a meaningful restriction
                  const hasGWARequirement = (maxGWA && maxGWA < 5.0) || (minGWA && minGWA > 1.0);
                  if (!hasGWARequirement) return null;
                  
                  const gwaStatus = getEligibilityStatus('gwa');
                  return (
                    <div className={`p-4 rounded-xl border ${
                      matchResult
                        ? gwaStatus
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <TrendingUp className={`w-5 h-5 ${
                          matchResult
                            ? gwaStatus
                              ? 'text-green-600'
                              : 'text-red-600'
                            : 'text-slate-400'
                        }`} />
                        <div>
                          <div className="text-sm text-slate-500">GWA Required</div>
                          <div className="font-semibold text-slate-900">
                            {(scholarship.eligibilityCriteria?.maxGWA || scholarship.eligibilityCriteria?.minGWA || 0).toFixed(2)} or better
                          </div>
                        </div>
                        {matchResult && (
                          gwaStatus
                            ? <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                            : <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Year Levels */}
                {/* Year Levels - handles both frontend (requiredYearLevels) and API (eligibleClassifications) field names */}
                {(() => {
                  const yearLevels = scholarship.eligibilityCriteria?.requiredYearLevels || scholarship.eligibilityCriteria?.eligibleClassifications;
                  if (!yearLevels || yearLevels.length === 0) return null;
                  
                  const yearLevelStatus = getEligibilityStatus('year level');
                  return (
                    <div className={`p-4 rounded-xl border ${
                      matchResult
                        ? yearLevelStatus
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <GraduationCap className={`w-5 h-5 ${
                          matchResult
                            ? yearLevelStatus
                              ? 'text-green-600'
                              : 'text-red-600'
                            : 'text-slate-400'
                        }`} />
                        <div>
                          <div className="text-sm text-slate-500">Year Level</div>
                          <div className="font-semibold text-slate-900">
                            {yearLevels.join(', ')}
                          </div>
                        </div>
                        {matchResult && (
                          yearLevelStatus
                            ? <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                            : <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Colleges */}
                {scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0 && (() => {
                  const collegeStatus = getEligibilityStatus('college');
                  return (
                    <div className={`p-4 rounded-xl border ${
                      matchResult
                        ? collegeStatus
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <Users className={`w-5 h-5 mt-0.5 ${
                          matchResult
                            ? collegeStatus
                              ? 'text-green-600'
                              : 'text-red-600'
                            : 'text-slate-400'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm text-slate-500">Eligible Colleges</div>
                          <div className="font-semibold text-slate-900">
                            {scholarship.eligibilityCriteria.eligibleColleges.length <= 2
                              ? scholarship.eligibilityCriteria.eligibleColleges.join(', ')
                              : `${scholarship.eligibilityCriteria.eligibleColleges.length} colleges`}
                          </div>
                        </div>
                        {matchResult && (
                          collegeStatus
                            ? <CheckCircle className="w-5 h-5 text-green-600" />
                            : <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Income */}
                {scholarship.eligibilityCriteria?.maxAnnualFamilyIncome && (() => {
                  const incomeStatus = getEligibilityStatus('income');
                  return (
                    <div className={`p-4 rounded-xl border ${
                      matchResult
                        ? incomeStatus
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <DollarSign className={`w-5 h-5 ${
                          matchResult
                            ? incomeStatus
                              ? 'text-green-600'
                              : 'text-red-600'
                            : 'text-slate-400'
                        }`} />
                        <div>
                          <div className="text-sm text-slate-500">Max Annual Income</div>
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(scholarship.eligibilityCriteria.maxAnnualFamilyIncome)}
                          </div>
                        </div>
                        {matchResult && (
                          incomeStatus
                            ? <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                            : <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Province */}
                {scholarship.eligibilityCriteria?.eligibleProvinces && scholarship.eligibilityCriteria.eligibleProvinces.length > 0 && (
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-slate-500">Province Requirement</div>
                        <div className="font-semibold text-slate-900">
                          {scholarship.eligibilityCriteria.eligibleProvinces.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thesis */}
                {scholarship.eligibilityCriteria?.requiresApprovedThesis && (
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-500">Requirement</div>
                        <div className="font-semibold text-slate-900">
                          Approved thesis/SP
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Existing Scholarship - CRITICAL for exclusivity */}
                {scholarship.eligibilityCriteria?.mustNotHaveOtherScholarship && (() => {
                  // Search for "no other scholarship" or related patterns
                  const scholarshipStatus = getEligibilityStatus('no other scholarship|existing scholarship');
                  // Determine styling: true = passed (green), false = failed (red), null = unknown (slate)
                  const isPassed = scholarshipStatus === true;
                  const isFailed = scholarshipStatus === false;
                  
                  return (
                    <div className={`p-4 rounded-xl border ${
                      matchResult
                        ? isPassed
                          ? 'bg-green-50 border-green-200'
                          : isFailed
                            ? 'bg-red-50 border-red-200'
                            : 'bg-slate-50 border-slate-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 ${
                          matchResult
                            ? isPassed
                              ? 'text-green-600'
                              : isFailed
                                ? 'text-red-600'
                                : 'text-slate-400'
                            : 'text-slate-400'
                        }`} />
                        <div>
                          <div className="text-sm text-slate-500">Requirement</div>
                          <div className="font-semibold text-slate-900">
                            No existing scholarship
                          </div>
                        </div>
                        {matchResult && isPassed && (
                          <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                        )}
                        {matchResult && isFailed && (
                          <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Custom Conditions Display */}
                {scholarship.eligibilityCriteria?.customConditions && 
                 scholarship.eligibilityCriteria.customConditions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-500" />
                      Additional Eligibility Conditions
                    </h4>
                    <div className="space-y-2">
                      {scholarship.eligibilityCriteria.customConditions
                        .filter((c: CustomCondition) => c.isActive !== false)
                        .map((condition: CustomCondition) => {
                          // Handle custom fields (stored as customFields.fieldName)
                          let fieldLabel: string;
                          if (condition.studentField?.startsWith('customFields.')) {
                            const customFieldKey = condition.studentField.replace('customFields.', '');
                            fieldLabel = customFieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
                          } else {
                            fieldLabel = STUDENT_PROFILE_FIELDS.find(f => f.value === condition.studentField)?.label || condition.studentField;
                          }
                          
                          const isCustomField = condition.studentField?.startsWith('customFields.');
                          return (
                            <div 
                              key={condition.id}
                              className={`p-3 rounded-lg border ${
                                condition.importance === ConditionImportance.REQUIRED
                                  ? 'bg-red-50 border-red-200'
                                  : condition.importance === ConditionImportance.PREFERRED
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  condition.importance === ConditionImportance.REQUIRED
                                    ? 'bg-red-500'
                                    : condition.importance === ConditionImportance.PREFERRED
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                                }`} />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-slate-800">{condition.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {isCustomField ? (
                                      <span className="flex items-center gap-1">
                                        <span className="text-purple-600">📝 {fieldLabel}</span>
                                        <span className="text-slate-400">•</span>
                                        <span>You'll provide this when applying</span>
                                      </span>
                                    ) : (
                                      <span>{fieldLabel} requirement</span>
                                    )}
                                  </div>
                                  
                                  {/* Description - now more prominent */}
                                  {condition.description && (
                                    <div className={`mt-2 p-2 rounded-md text-xs ${
                                      isCustomField 
                                        ? 'bg-purple-50 border border-purple-100 text-purple-700'
                                        : 'bg-white border border-slate-100 text-slate-600'
                                    }`}>
                                      <span className="font-medium">ℹ️ </span>
                                      {condition.description}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                      condition.importance === ConditionImportance.REQUIRED
                                        ? 'bg-red-100 text-red-700'
                                        : condition.importance === ConditionImportance.PREFERRED
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {condition.importance === ConditionImportance.REQUIRED ? 'Required' : 
                                       condition.importance === ConditionImportance.PREFERRED ? 'Preferred' : 'Optional'}
                                    </span>
                                    {isCustomField && (
                                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">
                                        ✏️ Custom Field
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prediction Factors (if eligible and logged in) */}
            {prediction && (
              <div className="card p-5">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary-600" />
                      Success Prediction
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      AI-powered analysis based on your profile
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Model Type Tag */}
                    {prediction.modelType && prediction.modelType !== 'none' && prediction.modelType !== 'unknown' && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        prediction.modelType === 'scholarship_specific' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                      title={prediction.modelType === 'scholarship_specific' 
                        ? 'Prediction uses data specific to this scholarship' 
                        : 'Prediction uses aggregated data from all scholarships'}
                      >
                        {prediction.modelType === 'scholarship_specific' ? (
                          <>
                            <Database className="w-3 h-3" />
                            Local Data
                          </>
                        ) : (
                          <>
                            <Globe2 className="w-3 h-3" />
                            Global Data
                          </>
                        )}
                      </span>
                    )}
                    {prediction.trainedModel && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-semibold flex items-center gap-1 border border-primary-100">
                        <Sparkles className="w-2.5 h-2.5" />
                        ML
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Probability Display */}
                <div className={`p-4 rounded-xl border ${
                  prediction.probability >= 0.7 ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-200' :
                  prediction.probability >= 0.4 ? 'bg-gradient-to-br from-amber-50 to-yellow-50/50 border-amber-200' : 'bg-gradient-to-br from-red-50 to-rose-50/50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        prediction.probability >= 0.7 ? 'bg-green-100' :
                        prediction.probability >= 0.4 ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <Sparkles className={`w-3.5 h-3.5 ${
                          prediction.probability >= 0.7 ? 'text-green-600' :
                          prediction.probability >= 0.4 ? 'text-amber-600' : 'text-red-600'
                        }`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Success Probability</span>
                    </div>
                    <span className={`text-xl font-bold ${
                      prediction.probability >= 0.7 ? 'text-green-600' :
                      prediction.probability >= 0.4 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {prediction.probabilityPercentage || Math.round(prediction.probability * 100)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden shadow-inner mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        prediction.probability >= 0.7 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        prediction.probability >= 0.4 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ width: `${(prediction.probabilityPercentage || prediction.probability * 100)}%` }}
                    />
                  </div>
                  
                  <p className={`text-xs leading-relaxed ${
                    prediction.probability >= 0.7 ? 'text-green-700' :
                    prediction.probability >= 0.4 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {prediction.probability >= 0.7 
                      ? 'Strong match with scholarship criteria'
                      : prediction.probability >= 0.4 
                      ? 'Moderate match - some areas to improve'
                      : 'Consider strengthening your profile'}
                  </p>
                </div>

                {/* Top Contributing Factors */}
                {prediction.factors && prediction.factors.filter(f => f && (f.rawContribution || 0) > 0).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-slate-500" />
                      Top Contributing Factors
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {prediction.factors
                        .filter(f => f && (f.rawContribution || 0) > 0)
                        .slice(0, 4)
                        .map((factor, index) => {
                          if (!factor || typeof factor !== 'object') return null;
                          const factorName = String(factor.factor || 'Unknown Factor');
                          
                          return (
                            <span 
                              key={index} 
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 font-medium"
                            >
                              <div className="w-1 h-1 rounded-full bg-green-500" />
                              {factorName}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <button
                  onClick={() => navigate(`/scholarships/${id}/prediction`, {
                    state: {
                      prediction,
                      scholarshipName: scholarship?.name || 'Scholarship',
                      scholarshipId: id
                    }
                  })}
                  className="w-full mt-4 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  View Detailed Calculation
                </button>

                {/* Recommendation */}
                {prediction.recommendation && typeof prediction.recommendation === 'string' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-blue-900 mb-0.5">Recommendation</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">{prediction.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="mt-3 text-[10px] text-slate-400 text-center">
                  Based on historical patterns. Results may vary.
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Application Card */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Application</h3>

              {/* Deadline */}
              {scholarship.applicationDeadline && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    Deadline
                  </div>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatDate(scholarship.applicationDeadline)}
                  </div>
                  {daysUntil !== null && (
                    <div className={`mt-2 text-sm font-medium ${
                      daysUntil <= 0 ? 'text-red-600' :
                      daysUntil <= 7 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {daysUntil > 0 ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {daysUntil} days remaining
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          Deadline has passed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {user ? (
                  existingApplication ? (
                    // Student has an existing application for this scholarship
                    existingApplication.status === ApplicationStatus.APPROVED ? (
                      <div className="w-full flex flex-col items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-center">
                        <div className="flex items-center gap-2 text-green-700 font-semibold">
                          <CheckCircle className="w-5 h-5" />
                          Scholarship Approved
                        </div>
                        <p className="text-xs text-green-600">You have already been approved for this scholarship.</p>
                      </div>
                    ) : existingApplication.status === ApplicationStatus.REJECTED ? (
                      matchResult?.isEligible ? (
                        <Link
                          to={`/apply/${scholarship.id}`}
                          className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                          <FileText className="w-5 h-5" />
                          Apply Again
                        </Link>
                      ) : (
                        <button disabled className="btn w-full bg-slate-100 text-slate-400 cursor-not-allowed">
                          Not Eligible
                        </button>
                      )
                    ) : existingApplication.status === ApplicationStatus.DRAFT ? (
                      <Link
                        to={`/applications/${existingApplication._id || existingApplication.id}/edit`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all"
                      >
                        <FileText className="w-5 h-5" />
                        Continue Application
                      </Link>
                    ) : (
                      <div className="w-full flex flex-col items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                        <div className="flex items-center gap-2 text-blue-700 font-semibold">
                          <Clock className="w-5 h-5" />
                          Application {existingApplication.status === ApplicationStatus.SUBMITTED ? 'Submitted' : 'Under Review'}
                        </div>
                        <Link
                          to="/my-applications"
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          View your application
                        </Link>
                      </div>
                    )
                  ) : (
                    // No existing application
                    matchResult?.isEligible ? (
                      <Link
                        to={`/apply/${scholarship.id}`}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        Apply Now
                      </Link>
                    ) : (
                      <button disabled className="btn w-full bg-slate-100 text-slate-400 cursor-not-allowed">
                        Not Eligible
                      </button>
                    )
                  )
                ) : (
                  <button
                    onClick={openAuthModal}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    Sign In to Apply
                  </button>
                )}

              </div>
            </div>

            {/* Contact Info */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Need Help?</h3>
              <p className="text-sm text-slate-600 mb-4">
                For questions about this scholarship, contact the Office of Scholarships and Grants (OSG).
              </p>
              <a
                href="https://osg.uplb.edu.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 text-sm font-medium inline-flex items-center gap-1 hover:text-primary-700"
              >
                Visit OSG Website
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Related Scholarships */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Similar Scholarships</h3>
              <div className="space-y-3">
                {similarScholarships.length > 0 ? (
                  similarScholarships.map((s: Scholarship) => (
                    <Link
                      key={s.id}
                      to={`/scholarships/${s.id}`}
                      className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="font-medium text-slate-900 text-sm line-clamp-1">
                        {s.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Award className="w-3 h-3" />
                        {formatCurrency(s.awardAmount || 0)}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No similar scholarships found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScholarshipDetails;