// ============================================================================
// ISKOlarship - Scholarship Applicants Page
// View and manage applicants for a specific scholarship
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search,
  User,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  ChevronDown,
  Award,
  Loader2,
  ArrowLeft,
  Users,
  Calendar,
  GraduationCap,
  DollarSign,
  FileText,
  TrendingUp,
  Building2,
  Sparkles,
  Shield,
  AlertCircle
} from 'lucide-react';
import { applicationApi, scholarshipApi } from '../../services/apiClient';
import { getPredictionForApplication } from '../../services/api';

interface ApplicationData {
  id: string;
  studentName: string;
  email: string;
  course: string;
  yearLevel: string;
  gwa: number;
  familyIncome: number;
  submittedDate: string;
  status: string;
  matchScore: number;
  canManage?: boolean;
}

interface ScholarshipData {
  id: string;
  name: string;
  sponsor: string;
  type: string;
  slots: number;
  applicationDeadline: string;
  status: string;
  applicantCount?: number;
}

type ApplicationStatus = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

const ScholarshipApplicants: React.FC = () => {
  const { id: scholarshipId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('all');
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [scholarship, setScholarship] = useState<ScholarshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScopeError, setIsScopeError] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const hasFetchedPredictions = useRef(false);

  // Fetch scholarship and its applications
  useEffect(() => {
    if (!scholarshipId) {
      setError('No scholarship ID provided');
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        // Fetch scholarship details
        const scholarshipResponse = await scholarshipApi.getById(scholarshipId);
        if (isMounted && scholarshipResponse.success && scholarshipResponse.data) {
          const s = scholarshipResponse.data as any; // Use any for flexible property access
          setScholarship({
            id: s._id || s.id || scholarshipId,
            name: s.name || 'Unknown Scholarship',
            sponsor: s.sponsor || 'Unknown Sponsor',
            type: s.type || 'Scholarship',
            slots: s.slots || 0,
            applicationDeadline: s.applicationDeadline 
              ? new Date(s.applicationDeadline).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })
              : 'No deadline set',
            status: s.status || 'draft',
            applicantCount: s.applicantCount || s.applicants || 0
          });
        } else {
          if (isMounted) {
            setError('Scholarship not found');
            return;
          }
        }
        
        // Fetch applications for this specific scholarship
        const response = await applicationApi.getAll({ 
          limit: 100,
          scholarshipId: scholarshipId
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
            submittedDate: app.submittedAt ? new Date(app.submittedAt).toISOString().split('T')[0] : 'N/A',
            status: app.status || 'pending',
            matchScore: 0, // Placeholder - will be updated with fresh ML predictions
            canManage: app.canManage
          })));
        } else if (isMounted) {
          setApplications([]);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('❌ Failed to fetch data:', err);
          if (err.response?.status === 403) {
            setIsScopeError(true);
            setError(err.response?.data?.message || 'This scholarship is outside your administrative scope. You can only view applicants for scholarships you manage.');
          } else if (err.response?.status === 404) {
            setError('Scholarship not found. It may have been removed or the link is incorrect.');
          } else {
            setError('Failed to load scholarship applicants. Please try again later.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [scholarshipId]);

  // Fetch fresh ML predictions for each loaded application
  useEffect(() => {
    if (applications.length === 0 || hasFetchedPredictions.current) return;
    hasFetchedPredictions.current = true;

    let isMounted = true;

    const fetchPredictions = async () => {
      setLoadingPredictions(true);
      try {
        const results = await Promise.allSettled(
          applications.map(app => getPredictionForApplication(app.id))
        );

        if (!isMounted) return;

        setApplications(prev => prev.map((app, idx) => {
          const result = results[idx];
          if (result.status === 'fulfilled' && result.value) {
            const pred = result.value;
            return {
              ...app,
              matchScore: pred.probabilityPercentage ?? Math.round((pred.probability || 0) * 100)
            };
          }
          return app;
        }));
      } catch (err) {
        console.warn('Could not fetch ML predictions:', err);
      } finally {
        if (isMounted) setLoadingPredictions(false);
      }
    };

    fetchPredictions();

    return () => { isMounted = false; };
  }, [applications.length]);

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending' || a.status === 'submitted').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.course.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter || 
      (statusFilter === 'pending' && (app.status === 'pending' || app.status === 'submitted'));

    return matchesSearch && matchesStatus;
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
        return <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">{status}</span>;
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading applicants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 ${isScopeError ? 'bg-amber-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isScopeError ? <Shield className="w-8 h-8 text-amber-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{isScopeError ? 'Access Restricted' : 'Error'}</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          {isScopeError && (
            <p className="text-sm text-slate-500 mb-4">Your admin scope only allows viewing applicants for scholarships within your assigned college or academic unit.</p>
          )}
          <button
            onClick={() => navigate('/admin/scholarships')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Scholarships
          </button>
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
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/UPLB_Academic_Heritage_Monument%2C_June_2023.jpg/2560px-UPLB_Academic_Heritage_Monument%2C_June_2023.jpg" 
            alt="UPLB Heritage Monument" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800/95 via-primary-700/90 to-primary-900/95" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate('/admin/scholarships')}
            className="inline-flex items-center gap-2 text-primary-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Scholarships</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-blue-200 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-white/10">
                  <Users className="w-3.5 h-3.5" />Scholarship Applicants
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {scholarship?.name || 'Scholarship Applicants'}
              </h1>
              <p className="text-primary-100 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {scholarship?.sponsor}
                <span className="text-primary-300">•</span>
                <span className="text-primary-200">{scholarship?.type}</span>
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-primary-200">Total Applicants</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <div className="text-2xl font-bold text-white">{scholarship?.slots || '∞'}</div>
                <div className="text-xs text-primary-200">Available Slots</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-6">
        {/* Scholarship Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{scholarship?.name}</h3>
                <p className="text-sm text-slate-500">{scholarship?.sponsor}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Deadline: {scholarship?.applicationDeadline}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{stats.approved} / {scholarship?.slots || '∞'} slots filled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
                <div className="text-xs text-slate-500">Pending Review</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.underReview}</div>
                <div className="text-xs text-slate-500">Under Review</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.approved}</div>
                <div className="text-xs text-slate-500">Approved</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.rejected}</div>
                <div className="text-xs text-slate-500">Rejected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Applicants Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Applicants Found</h3>
              <p className="text-slate-500 text-sm">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No one has applied for this scholarship yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Applicant</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Course & Year</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">GWA</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">ML Prediction</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Submitted</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                            {app.studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{app.studentName}</div>
                            <div className="text-xs text-slate-500">{app.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800">{app.course}</div>
                        <div className="text-xs text-slate-500">{app.yearLevel}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">{app.gwa.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {loadingPredictions ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 bg-slate-100">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getMatchScoreColor(app.matchScore)}`}>
                            <Sparkles className="w-3 h-3" />
                            {app.matchScore}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {app.submittedDate}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate(`/admin/applications/${app.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 transition-colors"
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
          )}
        </div>

        {/* Results Count */}
        {filteredApplications.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-500">
            Showing {filteredApplications.length} of {applications.length} applicants
          </div>
        )}
      </div>
    </div>
  );
};

export default ScholarshipApplicants;
