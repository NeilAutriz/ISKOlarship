// ============================================================================
// ISKOlarship - Student Applications Page
// Track and manage scholarship applications
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  Calendar,
  ArrowUpRight,
  Filter,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { applicationApi } from '../../services/apiClient';

type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

interface Application {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  sponsor: string;
  status: ApplicationStatus;
  submittedDate: string | null;
  lastUpdated: string;
  matchScore?: number;
}

const StudentApplications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'in_progress' | 'completed'>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch applications from API
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const response = await applicationApi.getMyApplications();
        if (response.success && response.data?.applications) {
          setApplications(response.data.applications.map((app: any) => ({
            id: app._id || app.id,
            scholarshipId: app.scholarship?._id || app.scholarship?.id || app.scholarshipId,
            scholarshipName: app.scholarship?.name || 'Unknown Scholarship',
            sponsor: app.scholarship?.sponsor || 'Unknown Sponsor',
            status: app.status || 'draft',
            submittedDate: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : null,
            lastUpdated: app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
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

  const stats = useMemo(() => {
    const total = applications.length;
    const inProgress = applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
    const approved = applications.filter(a => a.status === 'approved').length;
    const drafts = applications.filter(a => a.status === 'draft').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    return { total, inProgress, approved, drafts, rejected };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    switch (activeTab) {
      case 'drafts': return applications.filter(a => a.status === 'draft');
      case 'in_progress': return applications.filter(a => a.status === 'submitted' || a.status === 'under_review');
      case 'completed': return applications.filter(a => a.status === 'approved' || a.status === 'rejected');
      default: return applications;
    }
  }, [activeTab, applications]);

  const getStatusConfig = (status: ApplicationStatus) => {
    const configs = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-600', icon: FileText, iconColor: 'text-slate-400', label: 'Draft' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, iconColor: 'text-blue-500', label: 'Submitted' },
      under_review: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, iconColor: 'text-amber-500', label: 'Under Review' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, iconColor: 'text-green-500', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, iconColor: 'text-red-500', label: 'Rejected' }
    };
    return configs[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wide">Applications</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Applications</h1>
              <p className="text-primary-100">Track and manage your scholarship applications</p>
            </div>
            <Link to="/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-400 text-primary-900 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-lg shadow-gold-400/25">
              Browse More<ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', sublabel: 'Applications', value: stats.total, color: 'primary', icon: FileText },
            { label: 'In Progress', sublabel: 'Being Reviewed', value: stats.inProgress, color: 'amber', icon: Clock },
            { label: 'Approved', sublabel: 'Successful', value: stats.approved, color: 'green', icon: CheckCircle },
            { label: 'Drafts', sublabel: 'Not Submitted', value: stats.drafts, color: 'slate', icon: AlertCircle },
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
        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex">
            {[
              { id: 'all', label: 'All Applications', count: stats.total },
              { id: 'drafts', label: 'Drafts', count: stats.drafts },
              { id: 'in_progress', label: 'In Progress', count: stats.inProgress },
              { id: 'completed', label: 'Completed', count: stats.approved + stats.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 text-sm font-medium transition-all relative ${activeTab === tab.id ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No applications found</h3>
              <p className="text-slate-500 mb-4">{activeTab === 'all' ? "You haven't submitted any applications yet." : `No ${activeTab.replace('_', ' ')} applications.`}</p>
              <Link to="/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-all">Browse Scholarships</Link>
            </div>
          ) : (
            filteredApplications.map((application) => {
              const statusConfig = getStatusConfig(application.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={application.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl ${application.status === 'approved' ? 'bg-green-100' : application.status === 'under_review' ? 'bg-amber-100' : 'bg-primary-100'} flex items-center justify-center flex-shrink-0`}>
                          <StatusIcon className={`w-6 h-6 ${statusConfig.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-semibold text-slate-900 truncate">{application.scholarshipName}</h3>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>{statusConfig.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{application.sponsor}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                            {application.submittedDate && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />Submitted: {application.submittedDate}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />Updated: {application.lastUpdated}
                            </span>
                            {application.matchScore && (
                              <span className="flex items-center gap-1.5 text-primary-600 font-medium">
                                <TrendingUp className="w-4 h-4" />Match: {application.matchScore}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {application.status === 'draft' && (
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg text-sm hover:bg-primary-700 transition-all">Continue Application</button>
                      )}
                      <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-white transition-all">
                        <Eye className="w-4 h-4" />View Details
                      </button>
                    </div>
                    {application.status === 'approved' && (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />Congratulations!
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentApplications;
