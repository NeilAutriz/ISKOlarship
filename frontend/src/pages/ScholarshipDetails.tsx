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
  Bookmark,
  Share2,
  ChevronRight,
  Target,
  BarChart2,
  Percent,
  Loader2
} from 'lucide-react';
import { AuthContext } from '../App';
import { scholarshipApi, predictionApi } from '../services/apiClient';
import { matchStudentToScholarships } from '../services/filterEngine';
import { Scholarship, MatchResult, EligibilityCheckResult, isStudentProfile, PredictionResult } from '../types';

const ScholarshipDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const openAuthModal = authContext?.openAuthModal;
  const studentUser = isStudentProfile(user) ? user : null;

  // State for scholarship from API
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [relatedScholarships, setRelatedScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Fetch scholarship from API
  useEffect(() => {
    const fetchScholarship = async () => {
      if (!id) {
        setError('No scholarship ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const response = await scholarshipApi.getById(id);
        if (response.success && response.data) {
          const scholarshipData = response.data as Scholarship;
          setScholarship(scholarshipData);
          
          // Fetch related scholarships of same type
          try {
            const relatedRes = await scholarshipApi.getAll({ 
              type: scholarshipData.type, 
              limit: 4 
            });
            if (relatedRes.success && relatedRes.data?.scholarships) {
              // Filter out current scholarship
              const currentId = (scholarshipData as any)._id || scholarshipData.id;
              setRelatedScholarships(
                relatedRes.data.scholarships.filter((s: Scholarship) => {
                  const sId = (s as any)._id || s.id;
                  return sId !== currentId;
                }).slice(0, 3)
              );
            }
          } catch {
            // Related scholarships are optional
          }
        } else {
          setError('Scholarship not found');
        }
      } catch (err) {
        console.error('Failed to fetch scholarship:', err);
        setError('Failed to load scholarship');
      } finally {
        setLoading(false);
      }
    };

    fetchScholarship();
  }, [id]);

  // Get match result if user is logged in as student
  const matchResult = useMemo(() => {
    if (!studentUser || !scholarship) return null;
    const results = matchStudentToScholarships(studentUser, [scholarship]);
    return results.length > 0 ? results[0] : null;
  }, [studentUser, scholarship]);

  // Fetch prediction from API when eligible
  useEffect(() => {
    const fetchPrediction = async () => {
      if (!studentUser || !scholarship || !matchResult?.isEligible) {
        setPrediction(null);
        return;
      }
      
      const scholarshipId = (scholarship as any)._id || scholarship.id;
      if (!scholarshipId) return;

      try {
        setPredictionLoading(true);
        const response = await predictionApi.getProbability(scholarshipId);
        if (response.success && response.data) {
          setPrediction(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch prediction:', err);
        // Keep prediction null if API fails
      } finally {
        setPredictionLoading(false);
      }
    };

    fetchPrediction();
  }, [studentUser, scholarship, matchResult?.isEligible]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date - handles both Date objects and ISO strings
  const formatDate = (date: Date | string | undefined | null): string => {
    if (!date) return 'No deadline';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
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

  // Calculate days until deadline - handles both Date objects and ISO strings
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

  // Get probability color
  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600';
    if (probability >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityBg = (probability: number) => {
    if (probability >= 0.7) return 'bg-green-500';
    if (probability >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Loading scholarship details...</p>
        </div>
      </div>
    );
  }

  // Not found or error state
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
              The scholarship you're looking for doesn't exist or has been removed.
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
      {/* Header */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(30, 58, 138, 0.88), rgba(29, 78, 216, 0.92)), url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/UPLB_Academic_Heritage_Monument%2C_June_2023.jpg/2560px-UPLB_Academic_Heritage_Monument%2C_June_2023.jpg')`
        }}
      >
        <div className="container-app py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/scholarships" className="hover:text-white transition-colors">Scholarships</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white truncate max-w-[200px]">{scholarship.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${
                  scholarship.type === 'government'
                    ? 'badge-warning'
                    : scholarship.type === 'thesis_grant'
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
                {(() => {
                  const amount = scholarship.awardAmount ?? scholarship.totalGrant ?? 0;
                  return amount > 0 ? formatCurrency(amount) : (scholarship.awardDescription || 'Varies');
                })()}
              </div>
              {scholarship.awardDescription && (scholarship.awardAmount ?? scholarship.totalGrant ?? 0) > 0 && (
                <div className="text-sm text-slate-400 mt-1">{scholarship.awardDescription}</div>
              )}
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
              <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary-600" />
                Eligibility Requirements
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                You must meet ALL requirements below to be eligible for this scholarship.
              </p>

              {/* Explanation Box */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Understanding Eligibility:</p>
                    <ul className="space-y-1 text-blue-800 ml-4 list-disc">
                      <li><strong className="text-green-600">✓ Eligible</strong> means you meet this specific requirement</li>
                      <li><strong className="text-red-600">✗ Not Met</strong> means you don't meet this requirement and are not eligible to apply</li>
                      <li>All requirements are mandatory - missing even one makes you ineligible</li>
                      <li>Update your profile to see which scholarships match your qualifications</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* GWA - handle both maxGWA (API) and minGWA */}
                {(() => {
                  const gwaReq = scholarship.eligibilityCriteria?.maxGWA || scholarship.eligibilityCriteria?.minGWA;
                  if (!gwaReq) return null;
                  
                  // For UP GWA scale: lower is better, so student.gwa <= maxGWA means eligible
                  const isGWAEligible = studentUser ? studentUser.gwa <= gwaReq : false;
                  const studentGwa = studentUser?.gwa;
                  
                  return (
                    <div className={`p-4 rounded-xl border-2 transition-all ${
                      matchResult
                        ? isGWAEligible
                          ? 'bg-green-50 border-green-300 hover:border-green-400'
                          : 'bg-red-50 border-red-300 hover:border-red-400'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            matchResult
                              ? isGWAEligible ? 'bg-green-100' : 'bg-red-100'
                              : 'bg-slate-100'
                          }`}>
                            <TrendingUp className={`w-5 h-5 ${
                              matchResult
                                ? isGWAEligible ? 'text-green-600' : 'text-red-600'
                                : 'text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                              GWA Requirement
                            </div>
                            <div className="font-bold text-slate-900 text-lg">
                              {gwaReq.toFixed(2)} or better
                            </div>
                            {studentUser && studentGwa && (
                              <div className={`text-xs mt-1 ${
                                isGWAEligible ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Your GWA: {studentGwa.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                        {matchResult && studentUser && (
                          <div className="flex-shrink-0">
                            {isGWAEligible ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <span className="text-xs font-bold text-green-600">✓ Eligible</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <XCircle className="w-6 h-6 text-red-600" />
                                <span className="text-xs font-bold text-red-600">✗ Not Met</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Year Levels - handle both requiredYearLevels and eligibleClassifications */}
                {(() => {
                  const yearLevels = scholarship.eligibilityCriteria?.requiredYearLevels || 
                                    scholarship.eligibilityCriteria?.eligibleClassifications || [];
                  if (yearLevels.length === 0) return null;
                  
                  const isYearEligible = studentUser ? yearLevels.some((y: string) => 
                    y.toLowerCase() === studentUser.yearLevel?.toLowerCase()
                  ) : false;
                  
                  return (
                    <div className={`p-4 rounded-xl border-2 transition-all ${
                      matchResult
                        ? isYearEligible
                          ? 'bg-green-50 border-green-300 hover:border-green-400'
                          : 'bg-red-50 border-red-300 hover:border-red-400'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            matchResult
                              ? isYearEligible ? 'bg-green-100' : 'bg-red-100'
                              : 'bg-slate-100'
                          }`}>
                            <GraduationCap className={`w-5 h-5 ${
                              matchResult
                                ? isYearEligible ? 'text-green-600' : 'text-red-600'
                                : 'text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                              Year Level
                            </div>
                            <div className="font-bold text-slate-900">
                              {yearLevels.map((y: string) => y.charAt(0).toUpperCase() + y.slice(1)).join(', ')}
                            </div>
                            {studentUser && studentUser.yearLevel && (
                              <div className={`text-xs mt-1 ${
                                isYearEligible ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Your level: {studentUser.yearLevel}
                              </div>
                            )}
                          </div>
                        </div>
                        {matchResult && studentUser && (
                          <div className="flex-shrink-0">
                            {isYearEligible ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <span className="text-xs font-bold text-green-600">✓ Eligible</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <XCircle className="w-6 h-6 text-red-600" />
                                <span className="text-xs font-bold text-red-600">✗ Not Met</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Colleges */}
                {scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0 && (
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    matchResult
                      ? studentUser && (scholarship.eligibilityCriteria.eligibleColleges as string[]).some(c => c === studentUser.college)
                        ? 'bg-green-50 border-green-300 hover:border-green-400'
                        : 'bg-red-50 border-red-300 hover:border-red-400'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          matchResult
                            ? studentUser && (scholarship.eligibilityCriteria.eligibleColleges as string[]).some(c => c === studentUser.college)
                              ? 'bg-green-100' : 'bg-red-100'
                            : 'bg-slate-100'
                        }`}>
                          <Users className={`w-5 h-5 ${
                            matchResult
                              ? studentUser && (scholarship.eligibilityCriteria.eligibleColleges as string[]).some(c => c === studentUser.college)
                                ? 'text-green-600' : 'text-red-600'
                              : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            Eligible Colleges
                          </div>
                          <div className="font-bold text-slate-900">
                            {scholarship.eligibilityCriteria.eligibleColleges.length <= 3
                              ? (scholarship.eligibilityCriteria.eligibleColleges as string[]).join(', ')
                              : `${scholarship.eligibilityCriteria.eligibleColleges.length} colleges`}
                          </div>
                          {studentUser && studentUser.college && (
                            <div className={`text-xs mt-1 ${
                              (scholarship.eligibilityCriteria.eligibleColleges as string[]).some(c => c === studentUser.college)
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              Your college: {studentUser.college}
                            </div>
                          )}
                        </div>
                      </div>
                      {matchResult && studentUser && (
                        <div className="flex-shrink-0">
                          {(scholarship.eligibilityCriteria.eligibleColleges as string[]).some(c => c === studentUser.college) ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                              <span className="text-xs font-bold text-green-600">✓ Eligible</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="w-6 h-6 text-red-600" />
                              <span className="text-xs font-bold text-red-600">✗ Not Met</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Income */}
                {scholarship.eligibilityCriteria?.maxAnnualFamilyIncome && (
                  <div className={`p-4 rounded-xl border ${
                    matchResult
                      ? studentUser && studentUser.annualFamilyIncome <= scholarship.eligibilityCriteria.maxAnnualFamilyIncome
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <DollarSign className={`w-5 h-5 ${
                        matchResult
                          ? studentUser && studentUser.annualFamilyIncome <= scholarship.eligibilityCriteria.maxAnnualFamilyIncome
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
                      {matchResult && studentUser && (
                        studentUser.annualFamilyIncome <= scholarship.eligibilityCriteria.maxAnnualFamilyIncome
                          ? <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                          : <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </div>
                )}

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

                {/* No Existing Scholarship */}
                {scholarship.eligibilityCriteria?.mustNotHaveOtherScholarship && (
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-500">Requirement</div>
                        <div className="font-semibold text-slate-900">
                          No existing scholarship
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prediction Factors (if eligible and logged in) */}
            {prediction && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary-600" />
                  Success Prediction Analysis
                </h2>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Your Success Probability</span>
                    <span className={`text-2xl font-bold ${getProbabilityColor(prediction.probability)}`}>
                      {(prediction.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getProbabilityBg(prediction.probability)}`}
                      style={{ width: `${prediction.probability * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Based on historical application data and machine learning analysis
                  </p>
                </div>

                {/* Categorized Factors */}
                {prediction.factors && typeof prediction.factors === 'object' && !Array.isArray(prediction.factors) ? (
                  <div className="space-y-6">
                    {Object.entries(prediction.factors).map(([category, factors]) => {
                      const categoryFactors = factors as any[];
                      if (!Array.isArray(categoryFactors) || categoryFactors.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-3">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            {category === 'Academic Performance' && <BookOpen className="w-4 h-4 text-blue-600" />}
                            {category === 'Financial Need' && <DollarSign className="w-4 h-4 text-green-600" />}
                            {category === 'Overall Match' && <Target className="w-4 h-4 text-purple-600" />}
                            {category}
                          </h3>
                          {categoryFactors.map((factor: any, idx: number) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-slate-900">{factor.factor}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      factor.impact === 'high' ? 'bg-amber-100 text-amber-700' :
                                      factor.impact === 'medium' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {factor.impact} impact
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">{factor.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-lg font-bold ${
                                    factor.contribution > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {factor.contribution > 0 ? '+' : ''}
                                    {(factor.contributionPercentage * 100).toFixed(0)}%
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          factor.contribution > 0 ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(Math.abs(factor.contributionPercentage) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Fallback for old format
                  <div className="space-y-3">
                    {prediction.featureContributions && Object.entries(prediction.featureContributions).map(([key, value], index) => {
                      const contribution = value as number || 0;
                      const factorName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">{factorName}</span>
                          <span className={`text-sm font-medium ${
                            contribution > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(contribution * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  matchResult?.isEligible ? (
                    <button className="btn-primary w-full flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      Apply Now
                    </button>
                  ) : (
                    <button disabled className="btn w-full bg-slate-100 text-slate-400 cursor-not-allowed">
                      Not Eligible
                    </button>
                  )
                ) : (
                  <button 
                    onClick={openAuthModal}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    Sign In to Apply
                  </button>
                )}

                <button className="btn-secondary w-full flex items-center justify-center gap-2">
                  <Bookmark className="w-5 h-5" />
                  Save for Later
                </button>
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
                {relatedScholarships.length > 0 ? relatedScholarships.map((s: Scholarship) => {
                    const amount = s.awardAmount ?? s.totalGrant ?? 0;
                    return (
                      <Link
                        key={(s as any)._id || s.id}
                        to={`/scholarships/${(s as any)._id || s.id}`}
                        className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="font-medium text-slate-900 text-sm line-clamp-1">
                          {s.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Award className="w-3 h-3" />
                          {amount > 0 ? formatCurrency(amount) : (s.awardDescription || 'Varies')}
                        </div>
                      </Link>
                    );
                  }) : (
                    <p className="text-sm text-slate-500">No similar scholarships found</p>
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