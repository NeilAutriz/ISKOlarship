// ============================================================================
// ISKOlarship - Admin Applicants Page
// Review and process scholarship applications
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { applicationApi } from '../../services/apiClient';

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

const Applicants: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch applications from API
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const response = await applicationApi.getAll({ limit: 100 });
        if (response.success && response.data?.applications) {
          setApplications(response.data.applications.map((app: any) => ({
            id: app._id || app.id,
            studentName: app.applicant?.studentProfile 
              ? `${app.applicant.studentProfile.firstName} ${app.applicant.studentProfile.lastName}`
              : 'Unknown Student',
            email: app.applicant?.email || 'N/A',
            course: app.applicant?.studentProfile?.course || 'N/A',
            yearLevel: app.applicant?.studentProfile?.classification || 'N/A',
            gwa: app.applicant?.studentProfile?.gwa || 0,
            familyIncome: app.applicant?.studentProfile?.familyAnnualIncome || 0,
            scholarship: app.scholarship?.name || 'Unknown Scholarship',
            scholarshipType: app.scholarship?.type || 'Regular',
            submittedDate: app.submittedAt ? new Date(app.submittedAt).toISOString().split('T')[0] : 'N/A',
            status: app.status || 'pending',
            matchScore: app.eligibilityScore || 0
          })));
        }
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Calculate stats
  const stats = {
    pendingReview: applications.filter(a => a.status === 'pending' || a.status === 'submitted').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.scholarship.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = app.status === 'pending' || app.status === 'submitted' || app.status === 'under_review';
    } else if (activeTab === 'processed') {
      matchesTab = app.status === 'approved' || app.status === 'rejected';
    }

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesTab && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Under Review</span>;
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Rejected</span>;
      default:
        return null;
    }
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
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Application Review</h1>
          <p className="text-slate-600">Review and process scholarship applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-yellow-500">
            <p className="text-sm text-slate-500">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Under Review</p>
            <p className="text-2xl font-bold text-blue-600">{stats.underReview}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-red-500">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or scholarship..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="relative w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus)}
                className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white pr-10"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All ({tabCounts.all})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Pending ({tabCounts.pending})
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'processed'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Processed ({tabCounts.processed})
          </button>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{app.studentName}</p>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-sm text-slate-500">{app.email}</p>
                  </div>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-y border-slate-100">
                <div>
                  <p className="text-sm text-slate-500">Course</p>
                  <p className="font-medium text-slate-900">{app.course}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Year Level</p>
                  <p className="font-medium text-slate-900">{app.yearLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">GWA</p>
                  <p className="font-medium text-slate-900">{app.gwa.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Family Income</p>
                  <p className="font-medium text-slate-900">₱{app.familyIncome.toLocaleString()}</p>
                </div>
              </div>

              {/* Scholarship Info */}
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-slate-900">{app.scholarship}</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                  {app.scholarshipType}
                </span>
              </div>

              {/* Match Score and Date */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-slate-600">Match Score:</span>
                  <span className="font-medium text-green-600">{app.matchScore}%</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Submitted: {app.submittedDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                {(app.status === 'pending' || app.status === 'under_review') && (
                  <>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all">
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 font-medium rounded-lg hover:bg-red-50 transition-all">
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredApplications.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">No applications found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Applicants;
