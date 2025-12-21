// ============================================================================
// ISKOlarship - My Applications Page
// Track and manage scholarship applications
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  Calendar
} from 'lucide-react';

// Application status types
type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

interface Application {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  sponsor: string;
  status: ApplicationStatus;
  submittedDate: string | null;
  lastUpdated: string;
}

// Mock data for applications
const mockApplications: Application[] = [
  {
    id: 'app-001',
    scholarshipId: 'sch-001',
    scholarshipName: 'Sterix HOPE Scholarship',
    sponsor: 'Sterix Incorporated',
    status: 'under_review',
    submittedDate: '11/1/2025',
    lastUpdated: '11/5/2025'
  },
  {
    id: 'app-002',
    scholarshipId: 'sch-002',
    scholarshipName: 'Dr. Ernesto Tuazon Scholarship',
    sponsor: 'Dr. Ernesto Tuazon Foundation',
    status: 'submitted',
    submittedDate: '10/28/2025',
    lastUpdated: '10/28/2025'
  },
  {
    id: 'app-003',
    scholarshipId: 'sch-003',
    scholarshipName: 'LBMFI Undergraduate Thesis Grant',
    sponsor: 'Lola Basyang Memorial Foundation Inc.',
    status: 'approved',
    submittedDate: '10/15/2025',
    lastUpdated: '10/30/2025'
  },
  {
    id: 'app-004',
    scholarshipId: 'sch-004',
    scholarshipName: 'DOST-SEI Merit Scholarship',
    sponsor: 'Department of Science and Technology',
    status: 'draft',
    submittedDate: null,
    lastUpdated: '11/10/2025'
  }
];

const MyApplications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'in_progress' | 'completed'>('all');

  // Calculate stats
  const stats = useMemo(() => {
    const total = mockApplications.length;
    const inProgress = mockApplications.filter(a => 
      a.status === 'submitted' || a.status === 'under_review'
    ).length;
    const approved = mockApplications.filter(a => a.status === 'approved').length;
    const drafts = mockApplications.filter(a => a.status === 'draft').length;
    
    return { total, inProgress, approved, drafts };
  }, []);

  // Filter applications based on active tab
  const filteredApplications = useMemo(() => {
    switch (activeTab) {
      case 'drafts':
        return mockApplications.filter(a => a.status === 'draft');
      case 'in_progress':
        return mockApplications.filter(a => 
          a.status === 'submitted' || a.status === 'under_review'
        );
      case 'completed':
        return mockApplications.filter(a => 
          a.status === 'approved' || a.status === 'rejected'
        );
      default:
        return mockApplications;
    }
  }, [activeTab]);

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Draft
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Submitted
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            Under Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Rejected
          </span>
        );
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-5 h-5 text-slate-400" />;
      case 'submitted':
      case 'under_review':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'drafts', label: 'Drafts', count: stats.drafts },
    { id: 'in_progress', label: 'In Progress', count: stats.inProgress },
    { id: 'completed', label: 'Completed', count: stats.approved },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-600">Track and manage your scholarship applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-12 bg-primary-500 rounded-full" />
              <div>
                <p className="text-sm text-slate-500">Total Applications</p>
                <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-12 bg-amber-500 rounded-full" />
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-12 bg-green-500 rounded-full" />
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-12 bg-slate-400 rounded-full" />
              <div>
                <p className="text-sm text-slate-500">Drafts</p>
                <p className="text-2xl font-bold text-slate-600">{stats.drafts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600 -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No applications found</h3>
              <p className="text-slate-500 mb-4">
                {activeTab === 'all' 
                  ? "You haven't submitted any applications yet."
                  : `No ${activeTab.replace('_', ' ')} applications.`}
              </p>
              <Link
                to="/scholarships"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all"
              >
                Browse Scholarships
              </Link>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getStatusIcon(application.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {application.scholarshipName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <Building2 className="w-4 h-4" />
                        {application.sponsor}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {application.submittedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Submitted: {application.submittedDate}
                          </span>
                        )}
                        <span>Last Updated: {application.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(application.status)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyApplications;
