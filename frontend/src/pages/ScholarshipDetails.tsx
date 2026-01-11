
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
  RefreshCw
} from 'lucide-react';
import { AuthContext } from '../App';
import { fetchScholarshipDetails, fetchScholarships } from '../services/api';
import { matchStudentToScholarships } from '../services/filterEngine';
import { predictScholarshipSuccess } from '../services/logisticRegression';
import { Scholarship, MatchResult, EligibilityCheckResult, isStudentProfile } from '../types';

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

  // Fetch scholarship from API - updates mock data if API succeeds
  useEffect(() => {
    const loadScholarship = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchScholarshipDetails(id);
        if (data) {
          setScholarship(data);
          // Fetch similar scholarships of the same type
          try {
            const allScholarships = await fetchScholarships({ type: data.type });
            const similar = allScholarships.filter(s => (s.id || s._id) !== id && (s.id || s._id) !== (data.id || data._id)).slice(0, 3);
            if (similar.length > 0) {
              setSimilarScholarships(similar);
            }
          } catch {
            // Keep using mock similar scholarships
          }
        } else {
          setError('Scholarship not found');
        }
      } catch (err: any) {
        console.error('Failed to load scholarship:', err);
        setError('Failed to load scholarship details');
      } finally {
        setLoading(false);
      }
    };

    loadScholarship();
  }, [id]);

  // Get match result if user is logged in as student
  const matchResult = useMemo(() => {
    if (!studentUser || !scholarship) return null;
    const results = matchStudentToScholarships(studentUser, [scholarship]);
    return results.length > 0 ? results[0] : null;
  }, [studentUser, scholarship]);

  // Get prediction details if eligible
  const prediction = useMemo(() => {
    if (!studentUser || !scholarship || !matchResult?.isEligible) return null;
    return predictScholarshipSuccess(studentUser, scholarship);
  }, [studentUser, scholarship, matchResult]);

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
      weekday: 'long',
      month: 'long',
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
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="container-app py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white mb-6">
            <Link to="/" className="hover:text-white/80 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/scholarships" className="hover:text-white/80 transition-colors">Scholarships</Link>
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
                {/* GWA */}
                {scholarship.eligibilityCriteria?.minGWA && (
                  <div className={`p-4 rounded-xl border ${
                    matchResult
                      ? studentUser && studentUser.gwa >= scholarship.eligibilityCriteria.minGWA
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <TrendingUp className={`w-5 h-5 ${
                        matchResult
                          ? studentUser && studentUser.gwa >= scholarship.eligibilityCriteria.minGWA
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-slate-400'
                      }`} />
                      <div>
                        <div className="text-sm text-slate-500">Minimum GWA</div>
                        <div className="font-semibold text-slate-900">
                          {scholarship.eligibilityCriteria.minGWA.toFixed(2)}
                        </div>
                      </div>
                      {matchResult && studentUser && (
                        studentUser.gwa >= scholarship.eligibilityCriteria.minGWA
                          ? <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                          : <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </div>
                )}

                {/* Year Levels */}
                {scholarship.eligibilityCriteria?.requiredYearLevels && scholarship.eligibilityCriteria.requiredYearLevels.length > 0 && (
                  <div className={`p-4 rounded-xl border ${
                    matchResult
                      ? studentUser && scholarship.eligibilityCriteria.requiredYearLevels.includes(studentUser.yearLevel)
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <GraduationCap className={`w-5 h-5 ${
                        matchResult
                          ? studentUser && scholarship.eligibilityCriteria.requiredYearLevels.includes(studentUser.yearLevel)
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-slate-400'
                      }`} />
                      <div>
                        <div className="text-sm text-slate-500">Year Level</div>
                        <div className="font-semibold text-slate-900">
                          {scholarship.eligibilityCriteria.requiredYearLevels.join(', ')}
                        </div>
                      </div>
                      {matchResult && studentUser && (
                        scholarship.eligibilityCriteria.requiredYearLevels.includes(studentUser.yearLevel)
                          ? <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                          : <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </div>
                )}

                {/* Colleges */}
                {scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0 && (
                  <div className={`p-4 rounded-xl border ${
                    matchResult
                      ? studentUser && scholarship.eligibilityCriteria.eligibleColleges.includes(studentUser.college)
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Users className={`w-5 h-5 mt-0.5 ${
                        matchResult
                          ? studentUser && scholarship.eligibilityCriteria.eligibleColleges.includes(studentUser.college)
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
                      {matchResult && studentUser && (
                        scholarship.eligibilityCriteria.eligibleColleges.includes(studentUser.college)
                          ? <CheckCircle className="w-5 h-5 text-green-600" />
                          : <XCircle className="w-5 h-5 text-red-600" />
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
                  Success Prediction Factors
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
                    Based on historical data analysis
                  </p>
                </div>

                <div className="space-y-3">
                  {prediction.factors.map((factor, index) => {
                    const isPositive = factor.contribution > 0;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            isPositive ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm text-slate-700">{factor.factor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPositive ? '+' : ''}
                            {(factor.contribution * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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