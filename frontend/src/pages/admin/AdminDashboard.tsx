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
    let isMounted = true;
    
    const fetchDashboardData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        // Fetch platform statistics using getOverview
        const statsRes = await statisticsApi.getOverview();
        if (isMounted && statsRes.success && statsRes.data) {
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
          if (isMounted && appsRes.success && appsRes.data?.applications) {
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
          if (isMounted) {
            console.warn('Could not fetch applications:', err);
          }
        }
        
        // Fetch scholarships
        const scholRes = await scholarshipApi.getAll({ limit: 5 });
        if (isMounted && scholRes.success && scholRes.data?.scholarships) {
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
        if (isMounted) {
          console.error('Failed to fetch dashboard data:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    
    return () => {
      isMounted = false;
    };
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
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="https://international.uplb.edu.ph/wp-content/uploads/2022/02/M40A9936-min-scaled.jpg" 
            alt="UPLB Campus" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800/95 via-primary-700/90 to-primary-900/95" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-white/10">
                  <Shield className="w-3.5 h-3.5" />Administrator Portal
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-primary-100">Manage scholarships, applications, and platform analytics</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/admin/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-xl hover:bg-white/30 hover:border-white/40 transition-all">
                <GraduationCap className="w-4 h-4" />Scholarships
              </Link>
              <Link to="/admin/applicants" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-lg">
                <FileText className="w-4 h-4" />Review Applications
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Students Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded-full">Total Students</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalStudents.toLocaleString()}</div>
            <div className="text-sm text-slate-500">Registered</div>
          </div>
          
          {/* Scholarships Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Scholarships</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalScholarships}</div>
            <div className="text-sm text-slate-500">Active Programs</div>
          </div>
          
          {/* Applications Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Applications</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalApplications}</div>
            <div className="text-sm text-slate-500">Total Submitted</div>
          </div>
          
          {/* Pending Review Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">Pending Review</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.pendingReviews}</div>
            <div className="text-sm text-slate-500">Needs Attention</div>
          </div>
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
