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
  Loader2,
  X,
  Download,
  User,
  GraduationCap,
  Award,
  ChevronRight,
  Database,
  Globe2
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
  personalStatement?: string;
  additionalInfo?: string;
  documents?: any[];
  statusHistory?: any[];
  prediction?: any;
  eligibilityChecks?: any[];
  applicantSnapshot?: any;
  criteriaPassed?: number;
  criteriaTotal?: number;
  appliedDate?: string | null;
  academicYear?: string;
  semester?: string;
}

const StudentApplications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'in_progress' | 'completed'>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; type: string } | null>(null);

  // Fetch applications from API
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    const fetchApplications = async () => {
      try {
        if (isMounted) setLoading(true);
        const response = await applicationApi.getMyApplications();
        if (isMounted && response.success && response.data?.applications) {
          setApplications(response.data.applications.map((app: any) => ({
            id: app._id || app.id,
            scholarshipId: app.scholarship?._id || app.scholarship?.id || app.scholarshipId,
            scholarshipName: app.scholarship?.name || 'Unknown Scholarship',
            sponsor: app.scholarship?.sponsor || 'Unknown Sponsor',
            status: app.status || 'draft',
            submittedDate: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : null,
            lastUpdated: app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            matchScore: app.eligibilityPercentage || app.eligibilityScore || 0,
            personalStatement: app.personalStatement,
            additionalInfo: app.additionalInfo,
            documents: app.documents,
            statusHistory: app.statusHistory,
            prediction: app.prediction,
            eligibilityChecks: app.eligibilityChecks
          })));
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch applications:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApplications();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch full application details
  const handleViewDetails = async (applicationId: string) => {
    try {
      setLoadingDetails(true);
      const response = await applicationApi.getById(applicationId);
      if (response.success && response.data) {
        const app = response.data as any; // Use any to access dynamic API response
        console.log('📋 Full application data:', app);
        console.log('👤 Applicant Snapshot:', app.applicantSnapshot);
        const scholarship = typeof app.scholarship === 'object' ? app.scholarship : null;
        setSelectedApplication({
          id: app._id || app.id || applicationId,
          scholarshipId: scholarship?._id || scholarship?.id || app.scholarshipId || '',
          scholarshipName: scholarship?.name || 'Unknown Scholarship',
          sponsor: scholarship?.sponsor || 'Unknown Sponsor',
          status: app.status || 'draft',
          submittedDate: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : null,
          lastUpdated: app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          matchScore: app.eligibilityPercentage || app.eligibilityScore || 0,
          personalStatement: app.personalStatement,
          additionalInfo: app.additionalInfo,
          documents: app.documents || [],
          statusHistory: app.statusHistory,
          prediction: app.prediction,
          eligibilityChecks: app.eligibilityChecks,
          applicantSnapshot: app.applicantSnapshot,
          criteriaPassed: app.criteriaPassed,
          criteriaTotal: app.criteriaTotal,
          appliedDate: app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : null,
          academicYear: app.academicYear,
          semester: app.semester
        });
      }
    } catch (error) {
      console.error('Failed to fetch application details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

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
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="https://international.uplb.edu.ph/wp-content/uploads/2022/02/M40A9936-min-scaled.jpg" 
            alt="UPLB Campus" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700/95 via-primary-600/90 to-primary-800/95" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full uppercase tracking-wide border border-white/10">Applications</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Applications</h1>
              <p className="text-primary-100">Track and manage your scholarship applications</p>
            </div>
            <Link to="/scholarships" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-lg">
              Browse More<ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Applications Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded-full">Total</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-500">Applications</div>
          </div>
          
          {/* In Progress Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">In Progress</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.inProgress}</div>
            <div className="text-sm text-slate-500">Being Reviewed</div>
          </div>
          
          {/* Approved Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Approved</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.approved}</div>
            <div className="text-sm text-slate-500">Successful</div>
          </div>
          
          {/* Drafts Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full">Drafts</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.drafts}</div>
            <div className="text-sm text-slate-500">Not Submitted</div>
          </div>
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
              
              // Color-coded card styles based on status - matching scholarship card design
              const cardStyles = {
                draft: {
                  border: 'border-l-slate-500',
                  bg: 'bg-gradient-to-r from-slate-50 via-slate-50/50 to-white',
                  accent: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600',
                  iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600'
                },
                submitted: {
                  border: 'border-l-blue-500',
                  bg: 'bg-gradient-to-r from-blue-50 via-blue-50/50 to-white',
                  accent: 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600',
                  iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600'
                },
                under_review: {
                  border: 'border-l-amber-500',
                  bg: 'bg-gradient-to-r from-amber-50 via-amber-50/50 to-white',
                  accent: 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600',
                  iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600'
                },
                approved: {
                  border: 'border-l-green-500',
                  bg: 'bg-gradient-to-r from-green-50 via-green-50/50 to-white',
                  accent: 'bg-gradient-to-r from-green-400 via-green-500 to-green-600',
                  iconBg: 'bg-gradient-to-br from-green-400 to-green-600'
                },
                rejected: {
                  border: 'border-l-red-500',
                  bg: 'bg-gradient-to-r from-red-50 via-red-50/50 to-white',
                  accent: 'bg-gradient-to-r from-red-400 via-red-500 to-red-600',
                  iconBg: 'bg-gradient-to-br from-red-400 to-red-600'
                }
              }[application.status];
              
              return (
                <div key={application.id} className={`group ${cardStyles.bg} rounded-2xl border-l-4 ${cardStyles.border} border border-slate-200 shadow-md hover:shadow-2xl hover:border-slate-300 transition-all duration-300 overflow-hidden`}>
                  <div className="p-6 relative">
                    {/* Status-colored gradient accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${cardStyles.accent} opacity-100 group-hover:h-1.5 transition-all`} />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-14 h-14 rounded-2xl shadow-lg ${cardStyles.iconBg} flex items-center justify-center flex-shrink-0 transform group-hover:scale-110 transition-transform`}>
                          <StatusIcon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors">{application.scholarshipName}</h3>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${statusConfig.bg} ${statusConfig.text} border-2 ${statusConfig.bg.replace('bg-', 'border-').replace('-100', '-200')}`}>{statusConfig.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 font-medium">
                            <Building2 className="w-5 h-5 text-primary-600" />
                            <span className="truncate">{application.sponsor}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                            {application.submittedDate && (
                              <span className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">Submitted: {application.submittedDate}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                              <Clock className="w-4 h-4 text-slate-600" />
                              <span className="text-xs font-medium text-slate-700">Updated: {application.lastUpdated}</span>
                            </span>
                            {application.matchScore && application.matchScore > 0 && (
                              <span className="flex items-center gap-2 bg-gradient-to-r from-primary-50 to-primary-100 px-3 py-1.5 rounded-lg border border-primary-200">
                                <TrendingUp className="w-4 h-4 text-primary-600" />
                                <span className="text-xs font-bold text-primary-700">Match: {application.matchScore}%</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {application.status === 'draft' && (
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-xl text-sm hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all transform hover:scale-105">Continue Application</button>
                      )}
                      <button 
                        onClick={() => handleViewDetails(application.id)}
                        disabled={loadingDetails}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl text-sm hover:bg-white hover:border-primary-500 hover:text-primary-700 transition-all transform hover:scale-105 disabled:opacity-50 shadow-sm"
                      >
                        {loadingDetails ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        View Details
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

      {/* Application Details Modal */}
      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onPreviewDocument={setPreviewDocument}
        />
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
};

// Application Details Modal Component
interface ApplicationDetailsModalProps {
  application: Application;
  onClose: () => void;
  onPreviewDocument: (doc: { url: string; name: string; type: string }) => void;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({ application, onClose, onPreviewDocument }) => {
  const statusConfig = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Draft' },
    submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
    under_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Under Review' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' }
  }[application.status];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-6 rounded-t-2xl flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 hover:bg-white/20 rounded-lg transition-colors group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
          <div className="flex items-start gap-4 pr-12">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-2 text-white leading-tight">{application.scholarshipName}</h2>
              <p className="text-white/90 text-sm flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{application.sponsor}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${statusConfig.bg} ${statusConfig.text} shadow-sm`}>
                  {statusConfig.label}
                </span>
                {application.matchScore && application.matchScore > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm text-white text-xs font-bold shadow-sm">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {application.matchScore}% Match
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Application Info */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-600" />
                Application Info
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-600">Submitted</span>
                  <span className="text-xs font-bold text-slate-900">
                    {application.submittedDate || 'Not submitted'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-600">Last Updated</span>
                  <span className="text-xs font-bold text-slate-900">{application.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Prediction Score */}
            {application.prediction && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    Success Prediction
                  </span>
                  {/* Model Type Tag */}
                  {application.prediction.modelType && application.prediction.modelType !== 'none' && application.prediction.modelType !== 'unknown' && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                      application.prediction.modelType === 'scholarship_specific' 
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                        : 'bg-sky-100 text-sky-700 border border-sky-200'
                    }`}
                    title={application.prediction.modelType === 'scholarship_specific' 
                      ? 'Uses scholarship-specific training data' 
                      : 'Uses aggregated global training data'}
                    >
                      {application.prediction.modelType === 'scholarship_specific' ? (
                        <>
                          <Database className="w-2.5 h-2.5" />
                          Local
                        </>
                      ) : (
                        <>
                          <Globe2 className="w-2.5 h-2.5" />
                          Global
                        </>
                      )}
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Probability</span>
                    <span className="text-lg font-black text-amber-600">
                      {(application.prediction.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Confidence</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      application.prediction.confidence === 'high' ? 'bg-green-100 text-green-700' :
                      application.prediction.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {application.prediction.confidence?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Full width sections */}
          <div className="space-y-4 mt-4">
            {/* Applicant Profile Snapshot - Styled like Admin Applicants View */}
            {application.applicantSnapshot && Object.keys(application.applicantSnapshot).length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-600" />
                    Profile Snapshot
                    <span className="text-xs font-normal text-slate-500">(At Time of Application)</span>
                  </h3>
                </div>
                
                {/* Primary Info Grid - Course, Year Level, GWA, Family Income (like admin view) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Course</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {application.applicantSnapshot.course || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Year Level</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {application.applicantSnapshot.classification || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">GWA</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {application.applicantSnapshot.gwa !== undefined && application.applicantSnapshot.gwa !== null 
                        ? Number(application.applicantSnapshot.gwa).toFixed(2) 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Family Income</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {application.applicantSnapshot.annualFamilyIncome !== undefined && application.applicantSnapshot.annualFamilyIncome !== null
                        ? `₱${Number(application.applicantSnapshot.annualFamilyIncome).toLocaleString()}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Secondary Info Grid - Additional Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                  {application.applicantSnapshot.college && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">College</p>
                      <p className="text-sm font-medium text-slate-700 truncate" title={application.applicantSnapshot.college}>
                        {application.applicantSnapshot.college}
                      </p>
                    </div>
                  )}
                  {application.applicantSnapshot.stBracket && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">ST Bracket</p>
                      <p className="text-sm font-medium text-slate-700">
                        {application.applicantSnapshot.stBracket}
                      </p>
                    </div>
                  )}
                  {application.applicantSnapshot.unitsEnrolled !== undefined && application.applicantSnapshot.unitsEnrolled !== null && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Units Enrolled</p>
                      <p className="text-sm font-medium text-slate-700">
                        {application.applicantSnapshot.unitsEnrolled}
                      </p>
                    </div>
                  )}
                  {application.applicantSnapshot.provinceOfOrigin && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Province</p>
                      <p className="text-sm font-medium text-slate-700 truncate" title={application.applicantSnapshot.provinceOfOrigin}>
                        {application.applicantSnapshot.provinceOfOrigin}
                      </p>
                    </div>
                  )}
                  {application.applicantSnapshot.studentNumber && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Student Number</p>
                      <p className="text-sm font-medium text-slate-700">
                        {application.applicantSnapshot.studentNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personal Statement */}
            {application.personalStatement && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Personal Statement
                </h3>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {application.personalStatement}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Information */}
            {application.additionalInfo && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Additional Information</h3>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {application.additionalInfo}
                  </p>
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Required Documents
                {application.documents && application.documents.length > 0 && (
                  <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                    {application.documents.length} uploaded
                  </span>
                )}
              </h3>
              {application.documents && application.documents.length > 0 ? (
                <div className="space-y-2">
                  {application.documents.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                      <div 
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (doc.url) {
                            onPreviewDocument({
                              url: doc.url,
                              name: doc.name,
                              type: doc.mimeType || 'application/pdf'
                            });
                          }
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                            {doc.name}
                            {doc.url && <span className="text-purple-600 text-xs">(Click to preview)</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500">
                              {doc.fileName || 'Document'}
                            </p>
                            {doc.fileSize && (
                              <>
                                <span className="text-xs text-slate-300">•</span>
                                <p className="text-xs text-slate-500">
                                  {(doc.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </>
                            )}
                            {doc.uploadedAt && (
                              <>
                                <span className="text-xs text-slate-300">•</span>
                                <p className="text-xs text-slate-500">
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {doc.url && (
                        <button 
                          onClick={() => {
                            onPreviewDocument({
                              url: doc.url,
                              name: doc.name,
                              type: doc.mimeType || 'application/pdf'
                            });
                          }}
                          className="p-1.5 hover:bg-purple-100 rounded transition-colors flex-shrink-0"
                          title="Preview document"
                        >
                          <Eye className="w-4 h-4 text-purple-600" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-lg">
                  <XCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No documents uploaded</p>
                </div>
              )}
            </div>

            {/* Eligibility Checks */}
            {application.eligibilityChecks && application.eligibilityChecks.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-green-600" />
                  Eligibility ({application.eligibilityChecks.filter((c: any) => c.passed).length}/{application.eligibilityChecks.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {application.eligibilityChecks.map((check: any, index: number) => (
                    <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${check.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className="text-xs font-medium text-slate-700 truncate">{check.criterion}</span>
                      {check.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status History */}
            {application.statusHistory && application.statusHistory.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Status History
                </h3>
                <div className="space-y-2">
                  {application.statusHistory.map((history: any, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 capitalize truncate">
                            {history.status.replace('_', ' ')}
                          </p>
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {new Date(history.changedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {history.notes && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between flex-shrink-0">
          <Link
            to={`/scholarships/${application.scholarshipId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-primary-600 hover:text-primary-700 font-bold rounded-lg hover:bg-white transition-all"
          >
            View Scholarship
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Document Preview Modal Component
interface DocumentPreviewModalProps {
  document: { url: string; name: string; type: string } | null;
  onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ document, onClose }) => {
  if (!document) return null;

  const isPDF = document.type === 'application/pdf' || document.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col border border-slate-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 bg-primary-600 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-lg text-white">{document.name}</h3>
              <p className="text-sm text-primary-100">{isPDF ? 'PDF Document' : 'Image'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          {isPDF ? (
            <iframe
              src={document.url}
              className="w-full h-full rounded-lg border-2 border-slate-200 bg-white"
              title={document.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <img
                src={document.url}
                alt={document.name}
                className="max-w-full max-h-full rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between flex-shrink-0">
          <a
            href={document.url}
            download={document.name}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-md"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentApplications;
