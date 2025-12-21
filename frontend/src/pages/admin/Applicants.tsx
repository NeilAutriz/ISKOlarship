// ============================================================================
// ISKOlarship - Admin Applicants Page
// Review and process scholarship applications
// ============================================================================

import React, { useState } from 'react';
import { 
  Search,
  User,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  ChevronDown,
  Award
} from 'lucide-react';

// Mock applications data
const mockApplications = [
  {
    id: 'app-1',
    studentName: 'Maria Santos',
    email: 'maria.santos@university.edu',
    course: 'BS Biology',
    yearLevel: 'Junior',
    gwa: 2.30,
    familyIncome: 240000,
    scholarship: 'Sterix HOPE Scholarship',
    scholarshipType: 'Regular',
    submittedDate: '2025-11-08',
    status: 'pending',
    matchScore: 95,
  },
  {
    id: 'app-2',
    studentName: 'Juan Dela Cruz',
    email: 'juan.delacruz@university.edu',
    course: 'BS Chemistry',
    yearLevel: 'Sophomore',
    gwa: 2.45,
    familyIncome: 280000,
    scholarship: 'Dr. Ernesto Tuazon Memorial',
    scholarshipType: 'Regular',
    submittedDate: '2025-11-07',
    status: 'pending',
    matchScore: 88,
  },
  {
    id: 'app-3',
    studentName: 'Ana Reyes',
    email: 'ana.reyes@university.edu',
    course: 'BS Mathematics',
    yearLevel: 'Senior',
    gwa: 1.85,
    familyIncome: 180000,
    scholarship: 'Academic Excellence Award',
    scholarshipType: 'Merit',
    submittedDate: '2025-11-06',
    status: 'under_review',
    matchScore: 92,
  },
  {
    id: 'app-4',
    studentName: 'Pedro Garcia',
    email: 'pedro.garcia@university.edu',
    course: 'BS Agriculture',
    yearLevel: 'Freshman',
    gwa: 2.10,
    familyIncome: 150000,
    scholarship: 'DOST Merit Scholarship',
    scholarshipType: 'Government',
    submittedDate: '2025-11-05',
    status: 'approved',
    matchScore: 90,
  },
  {
    id: 'app-5',
    studentName: 'Lisa Fernandez',
    email: 'lisa.fernandez@university.edu',
    course: 'BS Computer Science',
    yearLevel: 'Junior',
    gwa: 1.75,
    familyIncome: 320000,
    scholarship: 'Tech Leaders Program',
    scholarshipType: 'Industry',
    submittedDate: '2025-11-04',
    status: 'pending',
    matchScore: 85,
  },
];

type ApplicationStatus = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';
type TabFilter = 'all' | 'pending' | 'processed';

const Applicants: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Calculate stats
  const stats = {
    pendingReview: mockApplications.filter(a => a.status === 'pending').length,
    underReview: mockApplications.filter(a => a.status === 'under_review').length,
    approved: mockApplications.filter(a => a.status === 'approved').length,
    rejected: mockApplications.filter(a => a.status === 'rejected').length,
  };

  // Filter applications
  const filteredApplications = mockApplications.filter(app => {
    const matchesSearch = 
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.scholarship.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = app.status === 'pending' || app.status === 'under_review';
    } else if (activeTab === 'processed') {
      matchesTab = app.status === 'approved' || app.status === 'rejected';
    }

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesTab && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
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
    all: mockApplications.length,
    pending: mockApplications.filter(a => a.status === 'pending' || a.status === 'under_review').length,
    processed: mockApplications.filter(a => a.status === 'approved' || a.status === 'rejected').length,
  };

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
