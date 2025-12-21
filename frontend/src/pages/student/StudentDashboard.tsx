// ============================================================================
// ISKOlarship - Student Dashboard Page
// Personalized scholarship recommendations and student profile management
// ============================================================================

import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  Edit2,
  BookOpen,
  DollarSign,
  Target,
  Calendar,
  FileText,
  Sparkles,
  Loader2,
  ArrowUpRight,
  Bell
} from 'lucide-react';
import { AuthContext } from '../../App';
import { scholarshipApi, applicationApi } from '../../services/apiClient';
import { matchStudentToScholarships } from '../../services/filterEngine';
import ScholarshipCard from '../../components/ScholarshipCard';
import { Scholarship, MatchResult, isStudentProfile } from '../../types';

const StudentDashboard: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const studentUser = isStudentProfile(user) ? user : null;
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'applied' | 'saved'>('recommended');
  
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const scholarshipRes = await scholarshipApi.getAll({ limit: 100 });
        if (scholarshipRes.success && scholarshipRes.data?.scholarships) {
          setScholarships(scholarshipRes.data.scholarships);
        }
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
        console.error('Failed to fetch from API:', error);
        // No fallback - require API data only
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentUser?.studentNumber]);

  if (!studentUser) return null;

  const matchResults = useMemo(() => matchStudentToScholarships(studentUser, scholarships), [studentUser, scholarships]);

  const stats = useMemo(() => {
    const eligible = matchResults.filter((r: MatchResult) => r.isEligible);
    const highMatch = eligible.filter((r: MatchResult) => (r.predictionScore ?? 0) >= 0.7);
    const mediumMatch = eligible.filter((r: MatchResult) => {
      const score = r.predictionScore ?? 0;
      return score >= 0.4 && score < 0.7;
    });
    // Handle both awardAmount and totalGrant field names
    const totalFunding = eligible.reduce((sum: number, r: MatchResult) => {
      const amount = (r.scholarship as any)?.awardAmount ?? (r.scholarship as any)?.totalGrant ?? 0;
      return sum + amount;
    }, 0);
    return {
      total: matchResults.length,
      eligible: eligible.length,
      highMatch: highMatch.length,
      mediumMatch: mediumMatch.length,
      totalFunding,
      averageScore: eligible.length > 0 ? eligible.reduce((sum: number, r: MatchResult) => sum + (r.predictionScore ?? 0), 0) / eligible.length : 0
    };
  }, [matchResults]);

  const displayedScholarships = useMemo(() => {
    const results = matchResults.map((result: MatchResult) => ({ scholarship: result.scholarship, matchResult: result }));
    switch (activeTab) {
      case 'recommended':
        return results.filter((r: { matchResult: MatchResult }) => r.matchResult.isEligible).sort((a: { matchResult: MatchResult }, b: { matchResult: MatchResult }) => (b.matchResult.predictionScore ?? 0) - (a.matchResult.predictionScore ?? 0)).slice(0, 6);
      case 'all':
        return results.sort((a: { matchResult: MatchResult }, b: { matchResult: MatchResult }) => {
          if (a.matchResult.isEligible && !b.matchResult.isEligible) return -1;
          if (!a.matchResult.isEligible && b.matchResult.isEligible) return 1;
          return (b.matchResult.predictionScore ?? 0) - (a.matchResult.predictionScore ?? 0);
        });
      case 'applied':
        const appliedIds = new Set(userApplications.map(app => app.scholarship?._id || app.scholarshipId));
        return results.filter((r: { scholarship: Scholarship | undefined }) => {
          const schol = r.scholarship as any;
          return appliedIds.has(schol?.id) || appliedIds.has(schol?._id);
        });
      case 'saved':
        return [];
      default:
        return results;
    }
  }, [matchResults, activeTab, userApplications]);

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-gold-400/20 text-gold-300 text-xs font-semibold rounded-full uppercase tracking-wide">Student Portal</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Welcome back, {studentUser.firstName}!</h1>
                <p className="text-primary-100 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" />{studentUser.college}</span>
                  <span className="text-primary-300">•</span>
                  <span>{studentUser.yearLevel}</span>
                  {studentUser.gwa !== undefined && studentUser.gwa !== null && (
                    <>
                      <span className="text-primary-300">•</span>
                      <span>GWA: {studentUser.gwa.toFixed(2)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/my-profile" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium rounded-xl hover:bg-white/20 transition-all">
                <Edit2 className="w-4 h-4" />Edit Profile
              </Link>
              <Link to="/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-400 text-primary-900 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-lg shadow-gold-400/25">
                <Target className="w-4 h-4" />Find Scholarships
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CheckCircle, label: 'Eligible', sublabel: 'Scholarships Available', value: stats.eligible, color: 'green' },
            { icon: Sparkles, label: 'High Match', sublabel: 'Best Matches', value: stats.highMatch, color: 'gold' },
            { icon: TrendingUp, label: 'Avg Score', sublabel: 'Match Rate', value: `${(stats.averageScore * 100).toFixed(0)}%`, color: 'primary' },
            { icon: DollarSign, label: 'Potential', sublabel: 'Total Funding', value: formatCurrency(stats.totalFunding), color: 'blue', isSmall: true },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${stat.color}-400 to-${stat.color}-600 flex items-center justify-center shadow-lg shadow-${stat.color}-500/30`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-xs font-medium text-${stat.color}-600 bg-${stat.color}-50 px-2 py-1 rounded-full`}>{stat.label}</span>
              </div>
              <div className={`${stat.isSmall ? 'text-2xl' : 'text-3xl'} font-bold text-slate-900`}>{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container-app pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Your Scholarships</h2>
                <p className="text-sm text-slate-500">Personalized recommendations based on your profile</p>
              </div>
              
              <div className="flex border-b border-slate-100">
                {[
                  { id: 'recommended', label: 'Recommended', icon: Sparkles, count: stats.eligible },
                  { id: 'all', label: 'All', icon: GraduationCap, count: stats.total },
                  { id: 'applied', label: 'Applied', icon: FileText, count: userApplications.length },
                  { id: 'saved', label: 'Saved', icon: BookOpen, count: 0 }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${activeTab === tab.id ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />}
                  </button>
                ))}
              </div>
            </div>

            {displayedScholarships.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-5">
                {displayedScholarships.map(({ scholarship, matchResult }: { scholarship: Scholarship | undefined; matchResult: MatchResult }) => (
                  scholarship && <ScholarshipCard key={(scholarship as any)._id || scholarship.id} scholarship={scholarship} matchResult={matchResult} showPrediction={true} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'applied' ? <FileText className="w-8 h-8 text-slate-400" /> : activeTab === 'saved' ? <BookOpen className="w-8 h-8 text-slate-400" /> : <GraduationCap className="w-8 h-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">{activeTab === 'applied' ? 'No Applications Yet' : activeTab === 'saved' ? 'No Saved Scholarships' : 'No Scholarships Found'}</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-4">{activeTab === 'applied' ? "You haven't applied to any scholarships yet." : activeTab === 'saved' ? 'Save scholarships to review later.' : 'Try browsing all available scholarships.'}</p>
                <Link to="/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-all">Browse Scholarships<ArrowUpRight className="w-4 h-4" /></Link>
              </div>
            )}

            {activeTab === 'recommended' && stats.eligible > 6 && (
              <div className="text-center">
                <button onClick={() => setActiveTab('all')} className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors">View All {stats.eligible} Eligible Scholarships<ChevronRight className="w-5 h-5" /></button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Your Profile</h3>
                <Link to="/my-profile" className="text-primary-600 hover:text-primary-700"><Edit2 className="w-4 h-4" /></Link>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { icon: GraduationCap, label: 'College', value: studentUser.college },
                  { icon: BookOpen, label: 'Course', value: studentUser.course },
                  { icon: TrendingUp, label: 'GWA', value: studentUser.gwa !== undefined && studentUser.gwa !== null ? studentUser.gwa.toFixed(4) : 'N/A' },
                  { icon: Calendar, label: 'Year Level', value: studentUser.yearLevel },
                  { icon: DollarSign, label: 'Annual Income', value: formatCurrency(studentUser.annualFamilyIncome) },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><item.icon className="w-5 h-5 text-slate-500" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className="font-medium text-slate-900 truncate">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Match Overview</h3></div>
              <div className="p-5 space-y-4">
                {[
                  { label: 'High Match (70%+)', value: stats.highMatch, color: 'green', pct: stats.eligible > 0 ? (stats.highMatch / stats.eligible) * 100 : 0 },
                  { label: 'Medium Match (40-70%)', value: stats.mediumMatch, color: 'amber', pct: stats.eligible > 0 ? (stats.mediumMatch / stats.eligible) * 100 : 0 },
                  { label: 'Not Eligible', value: stats.total - stats.eligible, color: 'slate', pct: stats.total > 0 ? ((stats.total - stats.eligible) / stats.total) * 100 : 0 },
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className={`text-sm font-semibold text-${item.color}-600`}>{item.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-2xl border border-gold-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-200 flex items-center justify-center flex-shrink-0"><Bell className="w-5 h-5 text-gold-700" /></div>
                <div>
                  <h4 className="font-semibold text-gold-900 mb-1">Pro Tip</h4>
                  <p className="text-sm text-gold-800">Keep your profile updated! Changes to your GWA or financial status can unlock new opportunities.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Upcoming Deadlines</h3></div>
              <div className="p-3">
                {displayedScholarships.filter(({ scholarship }: { scholarship: Scholarship | undefined }) => scholarship?.applicationDeadline).sort((a: { scholarship: Scholarship | undefined }, b: { scholarship: Scholarship | undefined }) => new Date(a.scholarship!.applicationDeadline!).getTime() - new Date(b.scholarship!.applicationDeadline!).getTime()).slice(0, 3).map(({ scholarship }: { scholarship: Scholarship | undefined }) => {
                  if (!scholarship) return null;
                  const daysLeft = Math.ceil((new Date(scholarship.applicationDeadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link key={scholarship.id} to={`/scholarships/${scholarship.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${daysLeft <= 7 ? 'bg-red-100' : 'bg-slate-100'}`}>
                        <Clock className={`w-5 h-5 ${daysLeft <= 7 ? 'text-red-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">{scholarship.name}</div>
                        <div className={`text-xs ${daysLeft <= 7 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  );
                })}
                {displayedScholarships.filter(({ scholarship }: { scholarship: Scholarship | undefined }) => scholarship?.applicationDeadline).length === 0 && (
                  <div className="p-5 text-center text-sm text-slate-500">No upcoming deadlines</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
