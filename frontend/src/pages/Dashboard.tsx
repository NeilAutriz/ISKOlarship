// ============================================================================
// ISKOlarship - Student Dashboard Page
// Personalized scholarship recommendations and student profile management
// Based on research paper Figure 9
// ============================================================================

import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Edit2,
  BookOpen,
  DollarSign,
  Target,
  BarChart2,
  Calendar,
  FileText,
  Settings,
  Bell,
  Filter,
  Sparkles,
  ArrowRight,
  XCircle,
  Loader2
} from 'lucide-react';
import { AuthContext } from '../App';
import { scholarships as staticScholarships } from '../data/scholarships';
import { scholarshipApi, applicationApi } from '../services/apiClient';
import { matchStudentToScholarships } from '../services/filterEngine';
import { predictScholarshipSuccess } from '../services/logisticRegression';
import ScholarshipCard from '../components/ScholarshipCard';
import { Scholarship, MatchResult, StudentProfile, YearLevel, UPLBCollege, isStudentProfile } from '../types';

const Dashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const studentUser = isStudentProfile(user) ? user : null;
  const updateProfile = authContext?.updateProfile;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'applied' | 'saved'>('recommended');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // API state
  const [scholarships, setScholarships] = useState<Scholarship[]>(staticScholarships);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch scholarships and user applications from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch scholarships
        const scholarshipRes = await scholarshipApi.getAll({ limit: 100 });
        if (scholarshipRes.success && scholarshipRes.data?.scholarships) {
          setScholarships(scholarshipRes.data.scholarships);
        }
        
        // Fetch user applications if logged in
        if (studentUser?.studentNumber) {
          try {
            const appRes = await applicationApi.getMyApplications();
            if (appRes.success && appRes.data?.applications) {
              setUserApplications(appRes.data.applications);
            }
          } catch (err) {
            console.warn('Could not fetch user applications:', err);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch from API, using static data:', error);
        setScholarships(staticScholarships);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [studentUser?.studentNumber]);

  // If no user or not a student, the ProtectedRoute will handle the redirect
  // This is a fallback that shouldn't normally show
  if (!studentUser) {
    return null;
  }

  // Get match results for the student
  const matchResults = useMemo(() => {
    return matchStudentToScholarships(studentUser, scholarships);
  }, [studentUser, scholarships]);

  // Calculate statistics
  const stats = useMemo(() => {
    const eligible = matchResults.filter((r: MatchResult) => r.isEligible);
    const highMatch = eligible.filter((r: MatchResult) => (r.predictionScore ?? 0) >= 0.7);
    const mediumMatch = eligible.filter((r: MatchResult) => {
      const score = r.predictionScore ?? 0;
      return score >= 0.4 && score < 0.7;
    });

    // Calculate total potential funding
    const totalFunding = eligible.reduce((sum: number, r: MatchResult) => {
      return sum + (r.scholarship?.awardAmount ?? 0);
    }, 0);

    return {
      total: matchResults.length,
      eligible: eligible.length,
      highMatch: highMatch.length,
      mediumMatch: mediumMatch.length,
      totalFunding,
      averageScore: eligible.length > 0
        ? eligible.reduce((sum: number, r: MatchResult) => sum + (r.predictionScore ?? 0), 0) / eligible.length
        : 0
    };
  }, [matchResults]);

  // Filter scholarships by tab
  const displayedScholarships = useMemo(() => {
    // matchResults already contains scholarship objects
    const results = matchResults.map((result: MatchResult) => ({
      scholarship: result.scholarship,
      matchResult: result
    }));

    switch (activeTab) {
      case 'recommended':
        return results
          .filter((r: { matchResult: MatchResult }) => r.matchResult.isEligible)
          .sort((a: { matchResult: MatchResult }, b: { matchResult: MatchResult }) => (b.matchResult.predictionScore ?? 0) - (a.matchResult.predictionScore ?? 0))
          .slice(0, 6);
      case 'all':
        return results.sort((a: { matchResult: MatchResult }, b: { matchResult: MatchResult }) => {
          // Eligible first
          if (a.matchResult.isEligible && !b.matchResult.isEligible) return -1;
          if (!a.matchResult.isEligible && b.matchResult.isEligible) return 1;
          return (b.matchResult.predictionScore ?? 0) - (a.matchResult.predictionScore ?? 0);
        });
      case 'applied':
        // Filter to show only scholarships user has applied for
        const appliedIds = new Set(userApplications.map(app => 
          app.scholarship?._id || app.scholarshipId
        ));
        return results.filter((r: { scholarship: Scholarship | undefined; matchResult: MatchResult }) => {
          const schol = r.scholarship as any;
          return appliedIds.has(schol.id) || appliedIds.has(schol._id);
        });
      case 'saved':
        // Would connect to saved scholarships (future feature)
        return [];
      default:
        return results;
    }
  }, [matchResults, activeTab, userApplications, scholarships]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-slate-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="container-app py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Welcome Section */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">Welcome back,</p>
                <h1 className="text-2xl md:text-3xl font-display font-bold">
                  {studentUser.firstName} {studentUser.lastName}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {studentUser.yearLevel} • {studentUser.college} • GWA: {studentUser.gwa.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
              <Link
                to="/scholarships"
                className="btn bg-gold-500 text-primary-700 hover:bg-gold-400 flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Find More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.eligible}</div>
                <div className="text-sm text-slate-500">Eligible</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.highMatch}</div>
                <div className="text-sm text-slate-500">High Match</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {(stats.averageScore * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-slate-500">Avg. Match</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats.totalFunding)}
                </div>
                <div className="text-sm text-slate-500">Potential</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-app py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Scholarships Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'recommended', label: 'Recommended', icon: Sparkles },
                { id: 'all', label: 'All Scholarships', icon: GraduationCap },
                { id: 'applied', label: 'Applied', icon: FileText },
                { id: 'saved', label: 'Saved', icon: BookOpen }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Scholarship Cards */}
            {displayedScholarships.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {displayedScholarships.map(({ scholarship, matchResult }: { scholarship: Scholarship | undefined; matchResult: MatchResult }) => (
                  scholarship && (
                    <ScholarshipCard
                      key={scholarship.id}
                      scholarship={scholarship}
                      matchResult={matchResult}
                      showPrediction={true}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'applied' ? (
                    <FileText className="w-8 h-8 text-slate-400" />
                  ) : activeTab === 'saved' ? (
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  ) : (
                    <GraduationCap className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {activeTab === 'applied'
                    ? 'No Applications Yet'
                    : activeTab === 'saved'
                    ? 'No Saved Scholarships'
                    : 'No Scholarships Found'}
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  {activeTab === 'applied'
                    ? 'You haven\'t applied to any scholarships yet. Start exploring your matches!'
                    : activeTab === 'saved'
                    ? 'Save scholarships you\'re interested in to review them later.'
                    : 'Try adjusting your profile or browsing all available scholarships.'}
                </p>
              </div>
            )}

            {/* View All Link */}
            {activeTab === 'recommended' && stats.eligible > 6 && (
              <div className="text-center">
                <button
                  onClick={() => setActiveTab('all')}
                  className="text-primary-700 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all"
                >
                  View All {stats.eligible} Eligible Scholarships
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Summary Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Your Profile</h3>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-500">College</div>
                    <div className="font-medium text-slate-900">{studentUser.college}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-500">Course</div>
                    <div className="font-medium text-slate-900">{studentUser.course}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-500">GWA</div>
                    <div className="font-medium text-slate-900">{studentUser.gwa.toFixed(4)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-500">Year Level</div>
                    <div className="font-medium text-slate-900">{studentUser.yearLevel}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-500">Annual Income</div>
                    <div className="font-medium text-slate-900">
                      {formatCurrency(studentUser.annualFamilyIncome)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Score Breakdown */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Match Overview</h3>
              
              <div className="space-y-4">
                {/* High Match */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">High Match (70%+)</span>
                    <span className="text-sm font-medium text-green-600">{stats.highMatch}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${stats.eligible > 0 ? (stats.highMatch / stats.eligible) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium Match */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Medium Match (40-70%)</span>
                    <span className="text-sm font-medium text-yellow-600">{stats.mediumMatch}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${stats.eligible > 0 ? (stats.mediumMatch / stats.eligible) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Not Eligible */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Not Eligible</span>
                    <span className="text-sm font-medium text-slate-500">
                      {stats.total - stats.eligible}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${stats.total > 0 ? ((stats.total - stats.eligible) / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="card p-6 bg-gradient-to-br from-gold-50 to-gold-100 border-gold-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-200 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-gold-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gold-900 mb-1">Pro Tip</h4>
                  <p className="text-sm text-gold-800">
                    Keep your profile updated! Changes to your GWA, units enrolled, or 
                    financial status can unlock new scholarship opportunities.
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {displayedScholarships
                  .filter(({ scholarship }: { scholarship: Scholarship | undefined }) => scholarship?.applicationDeadline)
                  .sort((a: { scholarship: Scholarship | undefined }, b: { scholarship: Scholarship | undefined }) => new Date(a.scholarship!.applicationDeadline!).getTime() - new Date(b.scholarship!.applicationDeadline!).getTime())
                  .slice(0, 3)
                  .map(({ scholarship }: { scholarship: Scholarship | undefined }) => {
                    if (!scholarship) return null;
                    const daysLeft = Math.ceil(
                      (new Date(scholarship.applicationDeadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <Link
                        key={scholarship.id}
                        to={`/scholarships/${scholarship.id}`}
                        className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="font-medium text-slate-900 text-sm line-clamp-1">
                          {scholarship.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className={daysLeft <= 7 ? 'text-red-600 font-medium' : 'text-slate-500'}>
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                {displayedScholarships.filter(({ scholarship }: { scholarship: Scholarship | undefined }) => scholarship?.applicationDeadline).length === 0 && (
                  <p className="text-sm text-slate-500">No upcoming deadlines</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;