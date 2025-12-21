// ============================================================================
// ISKOlarship - Admin Dashboard Page
// Overview and management of scholarship platform
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield,
  Users,
  GraduationCap,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Eye,
  Building2,
  BarChart3,
  AlertCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { statisticsApi, scholarshipApi, applicationApi } from '../../services/apiClient';

interface Application {
  id: string;
  studentName: string;
  scholarshipName: string;
  status: 'pending' | 'approved' | 'rejected' | 'submitted' | 'under_review';
  submittedDate: string;
  matchScore: number;
}

interface ScholarshipSummary {
  id: string;
  name: string;
  sponsor: string;
  applicants: number;
  slots: number;
  deadline: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'scholarships'>('applications');
  const [loading, setLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [topScholarships, setTopScholarships] = useState<ScholarshipSummary[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalScholarships: 0,
    totalApplications: 0,
    pendingReviews: 0,
    approvedThisMonth: 0,
    conversionRate: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch platform statistics using getOverview
        const statsRes = await statisticsApi.getOverview();
        if (statsRes.success && statsRes.data) {
          setStats({
            totalStudents: statsRes.data.overview.totalStudents || 0,
            totalScholarships: statsRes.data.overview.totalScholarships || 0,
            totalApplications: statsRes.data.overview.totalApplications || 0,
            pendingReviews: statsRes.data.overview.pendingApplications || 0,
            approvedThisMonth: statsRes.data.overview.approvedApplications || 0,
            conversionRate: Math.round((statsRes.data.overview.successRate || 0) * 100)
          });
        }
        
        // Fetch recent applications
        try {
          const appsRes = await applicationApi.getAll({ limit: 5 });
          if (appsRes.success && appsRes.data?.applications) {
            setRecentApplications(appsRes.data.applications.map((app: any) => ({
              id: app._id || app.id,
              studentName: app.applicant?.studentProfile 
                ? `${app.applicant.studentProfile.firstName} ${app.applicant.studentProfile.lastName}`
                : 'Unknown Student',
              scholarshipName: app.scholarship?.name || 'Unknown Scholarship',
              status: app.status || 'pending',
              submittedDate: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A',
              matchScore: app.eligibilityScore || 0
            })));
          }
        } catch (err) {
          console.warn('Could not fetch applications:', err);
        }
        
        // Fetch scholarships
        const scholRes = await scholarshipApi.getAll({ limit: 5 });
        if (scholRes.success && scholRes.data?.scholarships) {
          setTopScholarships(scholRes.data.scholarships.map((s: any) => ({
            id: s._id || s.id,
            name: s.name,
            sponsor: s.sponsor,
            applicants: s.currentApplicants || 0,
            slots: s.maxSlots || s.totalSlots || 0,
            deadline: s.applicationDeadline ? new Date(s.applicationDeadline).toLocaleDateString() : 'N/A'
          })));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-gold-400/20 text-gold-400 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />Administrator
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-slate-400">Manage scholarships, applications, and platform analytics</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/admin/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-600 text-slate-200 font-semibold rounded-xl hover:bg-slate-800 transition-all">
                <GraduationCap className="w-4 h-4" />Scholarships
              </Link>
              <Link to="/admin/applicants" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-400 text-slate-900 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-lg shadow-gold-400/25">
                <FileText className="w-4 h-4" />Review Applications
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', sublabel: 'Registered', value: stats.totalStudents.toLocaleString(), color: 'primary', icon: Users },
            { label: 'Scholarships', sublabel: 'Active Programs', value: stats.totalScholarships, color: 'green', icon: GraduationCap },
            { label: 'Applications', sublabel: 'Total Submitted', value: stats.totalApplications, color: 'amber', icon: FileText },
            { label: 'Pending Review', sublabel: 'Needs Attention', value: stats.pendingReviews, color: 'red', icon: AlertCircle },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${stat.color}-400 to-${stat.color}-600 flex items-center justify-center shadow-lg shadow-${stat.color}-500/30`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-xs font-medium text-${stat.color}-600 bg-${stat.color}-50 px-2 py-1 rounded-full`}>{stat.label}</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-app pb-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100">
                {[
                  { id: 'applications', label: 'Recent Applications', icon: FileText },
                  { id: 'scholarships', label: 'Top Scholarships', icon: GraduationCap },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${activeTab === tab.id ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />}
                  </button>
                ))}
              </div>
              
              <div className="p-6">
                {activeTab === 'applications' && (
                  <div className="space-y-4">
                    {recentApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                            {app.studentName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{app.studentName}</div>
                            <div className="text-sm text-slate-500">{app.scholarshipName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <div className="text-sm font-medium text-primary-600">Match: {app.matchScore}%</div>
                            <div className="text-xs text-slate-500">{app.submittedDate}</div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            app.status === 'approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {app.status === 'approved' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                             app.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : null}
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                          <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/applicants" className="flex items-center justify-center gap-2 py-3 text-primary-600 hover:text-primary-700 font-medium text-sm">
                      View All Applications<ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {activeTab === 'scholarships' && (
                  <div className="space-y-4">
                    {topScholarships.map((scholarship) => (
                      <div key={scholarship.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{scholarship.name}</div>
                            <div className="text-sm text-slate-500 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />{scholarship.sponsor}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <div className="text-sm font-medium text-slate-900">{scholarship.applicants} / {scholarship.slots}</div>
                            <div className="text-xs text-slate-500">Applicants / Slots</div>
                          </div>
                          <div className="text-right hidden md:block">
                            <div className="text-sm text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />{scholarship.deadline}
                            </div>
                          </div>
                          <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/scholarships" className="flex items-center justify-center gap-2 py-3 text-primary-600 hover:text-primary-700 font-medium text-sm">
                      Manage Scholarships<ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-600" />Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-slate-700">Approved This Month</span>
                  </div>
                  <span className="font-bold text-green-700">{stats.approvedThisMonth}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary-600" />
                    <span className="text-sm text-slate-700">Conversion Rate</span>
                  </div>
                  <span className="font-bold text-primary-700">{stats.conversionRate}%</span>
                </div>
              </div>
            </div>

            {/* Pending Actions */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />Pending Actions
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-800">Applications to review</span>
                  <span className="font-bold text-amber-900">{stats.pendingReviews}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-800">Documents to verify</span>
                  <span className="font-bold text-amber-900">18</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-800">Expiring scholarships</span>
                  <span className="font-bold text-amber-900">5</span>
                </div>
              </div>
              <Link to="/admin/applicants" className="mt-4 inline-flex items-center gap-2 w-full justify-center py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-all text-sm">
                Start Reviewing<ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
