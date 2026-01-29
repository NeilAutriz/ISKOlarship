// ============================================================================
// ISKOlarship - Admin Applicants Page
// Review and process scholarship applications
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search,
  User,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  ChevronDown,
  Award,
  Loader2,
  ArrowLeft,
  Filter,
  X,
  GraduationCap,
  DollarSign,
  Calendar,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  FileText,
  Users,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { applicationApi, scholarshipApi } from '../../services/apiClient';

interface ApplicationData {
  id: string;
  studentName: string;
  email: string;
  course: string;
  yearLevel: string;
  gwa: number;
  familyIncome: number;
  scholarship: string;
  scholarshipType: string;
  submittedDate: string;
  status: string;
  matchScore: number;
}

type ApplicationStatus = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';
type TabFilter = 'all' | 'pending' | 'processed';
type ViewMode = 'card' | 'table';

const Applicants: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scholarshipIdFilter = searchParams.get('scholarshipId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminScope, setAdminScope] = useState<{ level: string; description: string } | null>(null);
  const [scholarshipFilter, setScholarshipFilter] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchApplications = async () => {
      try {
        if (isMounted) setLoading(true);
        
        try {
          const scopeResponse = await applicationApi.getAdminScope();
          if (isMounted && scopeResponse.success && scopeResponse.data) {
            setAdminScope({
              level: scopeResponse.data.level,
              description: scopeResponse.data.description
            });
            
            if (!scopeResponse.data.level) {
              console.error('Admin profile not configured');
              setApplications([]);
              return;
            }
          }
        } catch (scopeError) {
          console.error('Failed to fetch admin scope:', scopeError);
        }
        
        if (scholarshipIdFilter) {
          try {
            const scholarshipResponse = await scholarshipApi.getById(scholarshipIdFilter);
            if (scholarshipResponse.success && scholarshipResponse.data) {
              setScholarshipFilter({
                id: scholarshipIdFilter,
                name: scholarshipResponse.data.name || 'Unknown Scholarship'
              });
            }
          } catch (err) {
            console.error('Failed to fetch scholarship:', err);
          }
        } else {
          setScholarshipFilter(null);
        }
        
        const response = await applicationApi.getAll({ 
          limit: 100,
          scholarshipId: scholarshipIdFilter || undefined
        });
        if (isMounted && response.success && response.data?.applications) {
          setApplications(response.data.applications.map((app: any) => ({
            id: app._id || app.id,
            studentName: app.applicant?.studentProfile 
              ? `${app.applicant.studentProfile.firstName || app.applicant.firstName || ''} ${app.applicant.studentProfile.lastName || app.applicant.lastName || ''}`.trim()
              : app.applicantSnapshot 
                ? `${app.applicantSnapshot.firstName || ''} ${app.applicantSnapshot.lastName || ''}`.trim()
                : 'Unknown Student',
            email: app.applicant?.email || 'N/A',
            course: app.applicant?.studentProfile?.course || app.applicantSnapshot?.course || 'N/A',
            yearLevel: app.applicant?.studentProfile?.classification || app.applicantSnapshot?.classification || 'N/A',
            gwa: app.applicant?.studentProfile?.gwa || app.applicantSnapshot?.gwa || 0,
            familyIncome: app.applicant?.studentProfile?.annualFamilyIncome || app.applicantSnapshot?.annualFamilyIncome || 0,
            scholarship: app.scholarship?.name || 'Unknown Scholarship',
            scholarshipType: app.scholarship?.type || 'Regular',
            submittedDate: app.submittedAt ? new Date(app.submittedAt).toISOString().split('T')[0] : 'N/A',
            status: app.status || 'pending',
            matchScore: app.eligibilityPercentage || app.eligibilityScore || 0,
          })));
        } else if (isMounted) {
          setApplications([]);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch applications:', error);
          setApplications([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApplications();
    return () => { isMounted = false; };
  }, [scholarshipIdFilter]);

  const clearScholarshipFilter = () => {
    setSearchParams({});
    setScholarshipFilter(null);
  };

  const stats = {
    total: applications.length,
    pendingReview: applications.filter(a => a.status === 'pending' || a.status === 'submitted').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.scholarship.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = app.status === 'pending' || app.status === 'submitted' || app.status === 'under_review';
    } else if (activeTab === 'processed') {
      matchesTab = app.status === 'approved' || app.status === 'rejected';
    }

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter ||
      (statusFilter === 'pending' && (app.status === 'pending' || app.status === 'submitted'));

    return matchesSearch && matchesTab && matchesStatus;
  });

  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'sm') => {
    const baseClasses = size === 'sm' 
      ? 'px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1'
      : 'px-3 py-1.5 text-sm font-semibold rounded-full inline-flex items-center gap-1.5';
    
    switch (status) {
      case 'pending':
      case 'submitted':
        return (
          <span className={`${baseClasses} bg-amber-100 text-amber-700 border border-amber-200`}>
            <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Pending
          </span>
        );
      case 'under_review':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-700 border border-blue-200`}>
            <Eye className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Under Review
          </span>
        );
      case 'approved':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-700 border border-green-200`}>
            <CheckCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-700 border border-red-200`}>
            <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getMatchScoreDisplay = (score: number) => {
    let colorClass = 'text-slate-600 bg-slate-100';
    if (score >= 80) colorClass = 'text-green-700 bg-green-100';
    else if (score >= 60) colorClass = 'text-amber-700 bg-amber-100';
    else if (score > 0) colorClass = 'text-red-700 bg-red-100';
    
    return (
      <span className={`px-2 py-0.5 text-xs font-bold rounded ${colorClass}`}>
        {score}%
      </span>
    );
  };

  const tabCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending' || a.status === 'submitted' || a.status === 'under_review').length,
    processed: applications.filter(a => a.status === 'approved' || a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-slate-800 font-semibold">Loading Applications</p>
            <p className="text-slate-500 text-sm">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/UPLB_Academic_Heritage_Monument%2C_June_2023.jpg/2560px-UPLB_Academic_Heritage_Monument%2C_June_2023.jpg" 
            alt="UPLB Heritage Monument" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800/95 via-primary-700/90 to-primary-900/95" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              {scholarshipFilter && (
                <button
                  onClick={() => navigate('/admin/scholarships')}
                  className="inline-flex items-center gap-2 text-primary-200 hover:text-white mb-3 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-medium">Back to Scholarships</span>
                </button>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1.5 bg-white/15 backdrop-blur-sm text-primary-100 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-white/20">
                  <Users className="w-3.5 h-3.5" />
                  Application Management
                </span>
                {scholarshipFilter && (
                  <span className="px-3 py-1.5 bg-amber-500/20 backdrop-blur-sm text-amber-200 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-amber-400/30">
                    <Filter className="w-3.5 h-3.5" />
                    Filtered View
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {scholarshipFilter ? 'Scholarship Applicants' : 'All Applications'}
              </h1>
              <p className="text-primary-200 text-sm md:text-base">
                {scholarshipFilter 
                  ? `Viewing applicants for "${scholarshipFilter.name}"`
                  : 'Review and process scholarship applications within your scope'
                }
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-primary-200">Total</div>
              </div>
              <div className="bg-rose-500/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-rose-400/40 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.pendingReview + stats.underReview}</div>
                <div className="text-xs text-rose-100">Needs Action</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scholarship Filter Banner */}
      {scholarshipFilter && (
        <div className="container-app -mt-2 mb-4 relative z-20">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-900 font-semibold">Filtering by Scholarship</p>
                <p className="text-xs text-amber-700">{scholarshipFilter.name}</p>
              </div>
            </div>
            <button
              onClick={clearScholarshipFilter}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-amber-700 text-sm font-semibold rounded-lg border border-amber-300 hover:bg-amber-50 transition-colors shadow-sm"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`container-app ${scholarshipFilter ? '' : '-mt-6'} relative z-20 mb-6`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-amber-200 transition-all group cursor-pointer"
            onClick={() => { setActiveTab('pending'); setStatusFilter('pending'); }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200/50 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">Pending</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.pendingReview}</div>
            <div className="text-sm text-slate-500">Awaiting Review</div>
          </div>
          
          <div 
            className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all group cursor-pointer"
            onClick={() => { setActiveTab('pending'); setStatusFilter('under_review'); }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200">In Progress</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.underReview}</div>
            <div className="text-sm text-slate-500">Under Review</div>
          </div>
          
          <div 
            className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all group cursor-pointer"
            onClick={() => { setActiveTab('processed'); setStatusFilter('approved'); }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">Success</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.approved}</div>
            <div className="text-sm text-slate-500">Approved</div>
          </div>
          
          <div 
            className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-red-200 transition-all group cursor-pointer"
            onClick={() => { setActiveTab('processed'); setStatusFilter('rejected'); }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-200/50 group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">Rejected</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.rejected}</div>
            <div className="text-sm text-slate-500">Not Approved</div>
          </div>
        </div>
      </div>

      <div className="container-app pb-12">
        {/* Search, Filter, and View Toggle */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, course, or scholarship..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-700 placeholder:text-slate-400"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus)}
                  className="appearance-none px-4 py-3 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-700 font-medium min-w-[160px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'card' 
                      ? 'bg-white shadow-sm text-primary-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'table' 
                      ? 'bg-white shadow-sm text-primary-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Table View"
                >
                  <LayoutList className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            All Applications
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>{tabCounts.all}</span>
          </button>
          <button
            onClick={() => { setActiveTab('pending'); setStatusFilter('all'); }}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Needs Action
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
            }`}>{tabCounts.pending}</span>
          </button>
          <button
            onClick={() => { setActiveTab('processed'); setStatusFilter('all'); }}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'processed'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Processed
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'processed' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
            }`}>{tabCounts.processed}</span>
          </button>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredApplications.length}</span> of {applications.length} applications
          </p>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredApplications.map((app) => (
              <div 
                key={app.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all overflow-hidden group"
              >
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-200/50">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{app.studentName}</h3>
                        <p className="text-sm text-slate-500 truncate">{app.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(app.status, 'md')}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-primary-50 rounded-xl border border-primary-100">
                    <Award className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-primary-900 truncate text-sm">{app.scholarship}</p>
                      <p className="text-xs text-primary-600">{app.scholarshipType}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Course</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{app.course}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Year Level</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{app.yearLevel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">GWA</p>
                        <p className="text-sm font-bold text-slate-800">{app.gwa.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Family Income</p>
                        <p className="text-sm font-medium text-slate-800 truncate">₱{app.familyIncome.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Match Score:</span>
                      {getMatchScoreDisplay(app.matchScore)}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">{app.submittedDate}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/admin/applications/${app.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200/50 group-hover:shadow-primary-300/50"
                  >
                    <Eye className="w-4 h-4" />
                    Review Application
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Applicant</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Scholarship</th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Course</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">GWA</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Match</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Submitted</th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate max-w-[180px]">{app.studentName}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate max-w-[180px]">{app.scholarship}</p>
                          <p className="text-xs text-slate-500">{app.scholarshipType}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800 truncate max-w-[150px]">{app.course}</p>
                          <p className="text-xs text-slate-500">{app.yearLevel}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-bold text-slate-800">{app.gwa.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {getMatchScoreDisplay(app.matchScore)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm text-slate-600">{app.submittedDate}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/applications/${app.id}`)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredApplications.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Applications Found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria to find applications.'
                : 'There are no applications matching your current view.'
              }
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setActiveTab('all'); }}
                className="mt-4 px-4 py-2 text-primary-600 font-semibold hover:bg-primary-50 rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Applicants;
