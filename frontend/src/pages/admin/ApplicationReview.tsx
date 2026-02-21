// ============================================================================
// ISKOlarship - Application Review Page
// Review and process individual scholarship applications
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Award,
  Building2,
  TrendingUp,
  AlertTriangle,
  Loader2,
  BookOpen,
  Users,
  Briefcase,
  Download,
  Eye,
  X,
  ExternalLink,
  Image,
  Sparkles,
  Target,
  BarChart2,
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { applicationApi, ocrApi, API_SERVER_URL } from '../../services/apiClient';
import { getPredictionForApplication } from '../../services/api';
import { PredictionResult } from '../../types';
import { OcrFieldResult, OcrVerificationStatus, OcrDocumentResult } from '../../types/ocr.types';

interface ApplicationDetails {
  id: string;
  // Applicant Info
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantAddress: string;
  // Academic Info
  studentNumber: string;
  college: string;
  course: string;
  yearLevel: string;
  gwa: number;
  unitsEnrolled: number;
  unitsPassed: number;
  // Financial Info
  annualFamilyIncome: number;
  stBracket: string;
  householdSize?: number;
  provinceOfOrigin?: string;
  citizenship?: string;
  // Scholarship Info
  scholarshipId: string;
  scholarshipName: string;
  scholarshipSponsor: string;
  scholarshipType: string;
  // Application Info
  personalStatement: string;
  additionalInfo: string;
  submittedDate: string;
  status: string;
  matchScore: number;
  // Custom Field Answers (scholarship-specific)
  customFieldAnswers?: Record<string, string | number | boolean>;
  // Prediction Data
  prediction?: {
    probability: number;
    predictedOutcome?: 'approved' | 'rejected';
    confidence?: 'low' | 'medium' | 'high';
    featureContributions?: {
      gwa?: number;
      financialNeed?: number;
      yearLevel?: number;
      collegeMatch?: number;
      courseMatch?: number;
      locationMatch?: number;
      completenessScore?: number;
    };
  };
  // Documents
  documents: Array<{
    _id?: string;
    name: string;
    type: string;
    mimeType?: string;
    url: string;
    uploadedAt: string;
    textContent?: string;
    isTextDocument?: boolean;
  }>;
  // Review Info
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const ApplicationReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScopeError, setIsScopeError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<{ _id?: string; name: string; type: string; mimeType?: string; url: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Fresh ML prediction data
  const [freshPrediction, setFreshPrediction] = useState<PredictionResult | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  // OCR Verification state
  const [ocrStatus, setOcrStatus] = useState<OcrVerificationStatus | null>(null);
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [expandedOcrDoc, setExpandedOcrDoc] = useState<string | null>(null);
  const [rawTextDoc, setRawTextDoc] = useState<{ docId: string; text: string } | null>(null);

  // Load OCR verification status
  const loadOcrStatus = async (appId: string) => {
    try {
      const [serviceRes, statusRes] = await Promise.all([
        ocrApi.getServiceStatus(),
        ocrApi.getVerificationStatus(appId),
      ]);
      if (serviceRes.success) setOcrAvailable((serviceRes.data as { available: boolean }).available);
      if (statusRes.success) setOcrStatus(statusRes.data as OcrVerificationStatus);
    } catch {
      // OCR not available — that's fine
    }
  };

  // Verify a single document
  const handleVerifyDocument = async (docId: string) => {
    if (!id) return;
    setVerifyingDocId(docId);
    try {
      const res = await ocrApi.verifyDocument(id, docId);
      if (res.success) {
        toast.success('Document verified via OCR');
        await loadOcrStatus(id);
      } else {
        toast.error('OCR verification failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OCR verification failed';
      toast.error(message);
    } finally {
      setVerifyingDocId(null);
    }
  };

  // Verify all documents
  const handleVerifyAll = async () => {
    if (!id) return;
    setLoadingOcr(true);
    try {
      const res = await ocrApi.verifyAllDocuments(id);
      if (res.success) {
        const data = res.data as { summary?: { completed?: number; failed?: number } };
        toast.success(`OCR verification complete: ${data.summary?.completed || 0} processed, ${data.summary?.failed || 0} failed`);
        await loadOcrStatus(id);
      } else {
        toast.error('OCR batch verification failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OCR batch verification failed';
      toast.error(message);
    } finally {
      setLoadingOcr(false);
    }
  };

  // View raw OCR text
  const handleViewRawText = async (docId: string) => {
    if (!id) return;
    if (rawTextDoc?.docId === docId) { setRawTextDoc(null); return; }
    try {
      const res = await ocrApi.getRawText(id, docId);
      if (res.success) {
        const data = res.data as { rawText: string | null };
        setRawTextDoc({ docId, text: data.rawText || 'No text extracted' });
      }
    } catch {
      toast.error('Failed to load raw text');
    }
  };

  // Helper: get OCR result for a specific document
  const getDocOcrStatus = (docId: string) => {
    return ocrStatus?.documents.find(d => d.documentId === docId) || null;
  };

  // Helper: severity badge
  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'verified': return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Match</span>;
      case 'warning': return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Mismatch</span>;
      case 'critical': return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Critical</span>;
      default: return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">Unknown</span>;
    }
  };

  // Fetch application details
  useEffect(() => {
    if (!id) {
      setError('No application ID provided');
      setLoading(false);
      return;
    }

    const fetchApplication = async () => {
      try {
        setLoading(true);
        const response = await applicationApi.getById(id);
        
        if (response.success && response.data) {
          const app = response.data as any;
          
          // Extract applicant info from various possible locations
          const applicant = app.applicant || {};
          const profile = applicant.studentProfile || app.applicantSnapshot || {};
          
          setApplication({
            id: app._id || app.id || id,
            // Applicant Info
            applicantId: applicant._id || applicant.id || app.applicant || '',
            applicantName: profile.firstName && profile.lastName 
              ? `${profile.firstName} ${profile.lastName}`.trim()
              : applicant.firstName && applicant.lastName
                ? `${applicant.firstName} ${applicant.lastName}`.trim()
                : 'Unknown Applicant',
            applicantEmail: applicant.email || profile.email || 'N/A',
            applicantPhone: profile.contactNumber || profile.phoneNumber || profile.phone || 'N/A',
            applicantAddress: profile.homeAddress
              ? (profile.homeAddress.fullAddress || `${profile.homeAddress.street || ''}, ${profile.homeAddress.barangay || ''}, ${profile.homeAddress.city || ''}, ${profile.homeAddress.province || ''}`.replace(/, ,/g, ',').replace(/^, |, $/g, '').replace(/^,\s*|,\s*$/g, ''))
              : profile.address
                ? `${profile.address.barangay || ''}, ${profile.address.city || ''}, ${profile.address.province || ''}`.replace(/, ,/g, ',').replace(/^, |, $/g, '')
                : 'N/A',
            // Academic Info
            studentNumber: profile.studentNumber || profile.studentId || 'N/A',
            college: profile.college || 'N/A',
            course: profile.course || 'N/A',
            yearLevel: profile.classification || profile.yearLevel || 'N/A',
            gwa: profile.gwa || 0,
            unitsEnrolled: profile.unitsEnrolled || 0,
            unitsPassed: profile.unitsPassed || 0,
            // Financial Info
            annualFamilyIncome: profile.annualFamilyIncome || 0,
            stBracket: profile.stBracket || 'N/A',
            householdSize: profile.householdSize,
            provinceOfOrigin: profile.provinceOfOrigin || profile.province || undefined,
            citizenship: profile.citizenship,
            // Scholarship Info
            scholarshipId: app.scholarship?._id || app.scholarship?.id || '',
            scholarshipName: app.scholarship?.name || 'Unknown Scholarship',
            scholarshipSponsor: app.scholarship?.sponsor || 'Unknown Sponsor',
            scholarshipType: app.scholarship?.type || 'Scholarship',
            // Application Info
            personalStatement: app.personalStatement || '',
            additionalInfo: app.additionalInfo || '',
            submittedDate: app.submittedAt 
              ? new Date(app.submittedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'N/A',
            status: app.status || 'pending',
            matchScore: app.prediction?.probability != null
              ? Math.round(app.prediction.probability * 100)
              : app.eligibilityPercentage || app.eligibilityScore || 0,
            // Prediction Data
            prediction: app.prediction ? {
              probability: app.prediction.probability || 0,
              predictedOutcome: app.prediction.predictedOutcome,
              confidence: app.prediction.confidence,
              featureContributions: app.prediction.featureContributions
            } : undefined,
            // Custom Field Answers (scholarship-specific requirements)
            customFieldAnswers: (() => {
              const answers = app.customFieldAnswers && typeof app.customFieldAnswers === 'object' 
                ? app.customFieldAnswers 
                : {};
              return answers;
            })(),
            // Documents
            documents: (app.documents || []).map((doc: any) => ({
              _id: doc._id || doc.id,
              name: doc.name || doc.originalName || 'Document',
              type: doc.documentType || doc.type || 'Other',
              mimeType: doc.mimeType || doc.contentType || '',
              url: doc.url || doc.path || '',
              uploadedAt: doc.uploadedAt 
                ? new Date(doc.uploadedAt).toLocaleDateString()
                : 'N/A',
              textContent: doc.textContent || '',
              isTextDocument: doc.isTextDocument || false
            })),
            // Review Info
            reviewNotes: app.reviewNotes || app.notes || '',
            reviewedBy: app.reviewedBy?.email || app.reviewedBy?.name || '',
            reviewedAt: app.reviewedAt 
              ? new Date(app.reviewedAt).toLocaleDateString()
              : '',
            rejectionReason: app.rejectionReason || app.reason || ''
          });
        } else {
          setError('Application not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch application:', err);
        if (err.isSessionExpired) {
          setError('Your session has expired. Please log in again.');
        } else if (err.response?.status === 403) {
          setIsScopeError(true);
          setError(err.response?.data?.message || 'This application is outside your administrative scope. You can only view applications for scholarships you manage.');
        } else if (err.response?.status === 404) {
          setError('Application not found. It may have been deleted or the link is incorrect.');
        } else {
          setError('Failed to load application details. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  // Fetch OCR status when application loads
  useEffect(() => {
    if (id && application) {
      loadOcrStatus(id);
    }
  }, [id, application]);

  // Fetch fresh ML prediction when application is loaded
  useEffect(() => {
    const fetchFreshPrediction = async () => {
      if (!id || !application) return;
      
      try {
        setLoadingPrediction(true);
        const prediction = await getPredictionForApplication(id);
        setFreshPrediction(prediction);
      } catch (err) {
        console.warn('Failed to fetch fresh prediction:', err);
        // Fall back to stored prediction if fresh fetch fails
      } finally {
        setLoadingPrediction(false);
      }
    };

    fetchFreshPrediction();
  }, [id, application?.id]);

  // Use fresh prediction if available, otherwise fall back to stored prediction
  const currentPrediction = freshPrediction || (application?.prediction ? {
    probability: application.prediction.probability,
    probabilityPercentage: Math.round((application.prediction.probability || 0) * 100),
    predictedOutcome: application.prediction.predictedOutcome,
    confidence: application.prediction.confidence,
    featureContributions: application.prediction.featureContributions
  } as PredictionResult : null);

  // Load document preview — backend streams file from Cloudinary
  const loadDocumentPreview = async (document: { _id?: string; name: string; type: string; mimeType?: string; url: string }) => {
    try {
      setLoadingPreview(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const applicationId = application?.id || id;

      if (!document._id || !applicationId) {
        toast.error('Document ID not available');
        return;
      }

      // Fetch the file content streamed through the backend
      const response = await fetch(`${API_SERVER_URL}/api/applications/${applicationId}/documents/${document._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Failed to fetch document: ${response.statusText}`);

      const responseBlob = await response.blob();
      // Explicitly type the blob so the PDF viewer recognises the format
      const contentType = response.headers.get('content-type') || document.mimeType || 'application/octet-stream';
      const blob = new Blob([responseBlob], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      
      setPreviewUrl(blobUrl);
      setPreviewDoc(document);
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error('Preview load error:', error);
      toast.error(`Failed to load document preview: ${error.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle document download — backend streams file from Cloudinary
  const handleDownloadDocument = async (document: { _id?: string; name: string; url: string }) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const applicationId = application?.id || id;

      if (!document._id || !applicationId) {
        toast.error('Document ID not available');
        return;
      }

      // Fetch the file streamed through the backend
      const response = await fetch(`${API_SERVER_URL}/api/applications/${applicationId}/documents/${document._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download document');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Failed to download: ${error.message}`);
    }
  };

  // Clean up preview URL when modal closes
  useEffect(() => {
    if (!isPreviewOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [isPreviewOpen, previewUrl]);

  // Handle approve action
  const handleApprove = async () => {
    if (!id) return;
    
    setProcessing(true);
    try {
      const response = await applicationApi.updateStatus(id, 'approved', reviewNotes);
      
      if (response.success) {
        toast.success('Application approved successfully!', {
          position: 'top-right',
          autoClose: 3000
        });
        setApplication(prev => prev ? { ...prev, status: 'approved' } : null);
      } else {
        throw new Error(response.message || 'Failed to approve application');
      }
    } catch (err: any) {
      console.error('Failed to approve:', err);
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || 'You do not have permission to approve this application. It is outside your administrative scope.');
      } else {
        toast.error(err.message || 'Failed to approve application');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await applicationApi.updateStatus(id, 'rejected', reviewNotes, rejectionReason);
      
      if (response.success) {
        toast.success('Application rejected', {
          position: 'top-right',
          autoClose: 3000
        });
        setApplication(prev => prev ? { ...prev, status: 'rejected', rejectionReason } : null);
        setShowRejectModal(false);
      } else {
        throw new Error(response.message || 'Failed to reject application');
      }
    } catch (err: any) {
      console.error('Failed to reject:', err);
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || 'You do not have permission to reject this application. It is outside your administrative scope.');
      } else {
        toast.error(err.message || 'Failed to reject application');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle mark as under review
  const handleMarkUnderReview = async () => {
    if (!id) return;
    
    setProcessing(true);
    try {
      const response = await applicationApi.updateStatus(id, 'under_review', reviewNotes);
      
      if (response.success) {
        toast.info('Application marked as under review', {
          position: 'top-right',
          autoClose: 3000
        });
        setApplication(prev => prev ? { ...prev, status: 'under_review' } : null);
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || 'You do not have permission to update this application. It is outside your administrative scope.');
      } else {
        toast.error(err.message || 'Failed to update application status');
      }
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-700 rounded-full">
            <Clock className="w-4 h-4" />
            Pending Review
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
            <Eye className="w-4 h-4" />
            Under Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-4 h-4" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-4 h-4" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 ${isScopeError ? 'bg-amber-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isScopeError ? <Shield className="w-8 h-8 text-amber-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{isScopeError ? 'Access Restricted' : 'Error'}</h2>
          <p className="text-slate-600 mb-4">{error || 'Application not found'}</p>
          {isScopeError && (
            <p className="text-sm text-slate-500 mb-4">Your admin scope only allows viewing applications for scholarships within your assigned college or academic unit.</p>
          )}
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isPending = application.status === 'pending' || application.status === 'submitted' || application.status === 'under_review';

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
        
        <div className="container-app py-8 relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-primary-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Applicants</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-blue-200 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-white/10">
                  <FileText className="w-3.5 h-3.5" />Application Review
                </span>
                {getStatusBadge(application.status)}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {application.applicantName}
              </h1>
              <p className="text-primary-100 flex items-center gap-2">
                <Award className="w-4 h-4" />
                {application.scholarshipName}
              </p>
            </div>
            
            {/* ML Prediction Score */}
            {currentPrediction && (currentPrediction.probabilityPercentage || currentPrediction.probability) && (
              <div className={`rounded-2xl px-6 py-4 border ${
                (currentPrediction.probabilityPercentage ?? currentPrediction.probability * 100) >= 70 
                  ? 'bg-green-50 border-green-300 text-green-700' 
                  : (currentPrediction.probabilityPercentage ?? currentPrediction.probability * 100) >= 40
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <div className="text-3xl font-bold">
                      {currentPrediction.probabilityPercentage ?? Math.round(currentPrediction.probability * 100)}%
                      {loadingPrediction && <Loader2 className="w-4 h-4 inline ml-2 animate-spin" />}
                    </div>
                    <div className="text-sm font-medium">ML Prediction</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container-app py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-600" />
                  Personal Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Email</div>
                      <div className="font-medium text-slate-800">{application.applicantEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Phone</div>
                      <div className="font-medium text-slate-800">{application.applicantPhone}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Address</div>
                      <div className="font-medium text-slate-800">{application.applicantAddress}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                  Academic Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Student Number</div>
                      <div className="font-medium text-slate-800">{application.studentNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">College</div>
                      <div className="font-medium text-slate-800">{application.college}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Year Level</div>
                      <div className="font-medium text-slate-800">{application.yearLevel}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <Briefcase className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Course/Program</div>
                      <div className="font-medium text-slate-800">{application.course}</div>
                    </div>
                  </div>
                  <div>
                    <div className="bg-primary-50 rounded-xl p-4 text-center border border-primary-100">
                      <div className="text-3xl font-bold text-primary-600">{application.gwa.toFixed(2)}</div>
                      <div className="text-sm text-primary-700 font-medium">GWA</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-slate-800">{application.unitsEnrolled}</div>
                      <div className="text-sm text-slate-600">Units Enrolled</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-slate-800">{application.unitsPassed}</div>
                      <div className="text-sm text-slate-600">Units Passed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                  Financial Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-sm text-amber-700 mb-1">Annual Family Income</div>
                    <div className="text-2xl font-bold text-amber-800">
                      {formatCurrency(application.annualFamilyIncome)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-sm text-blue-700 mb-1">ST Bracket</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {application.stBracket}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Statement */}
            {application.personalStatement && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-600" />
                    Personal Statement
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {application.personalStatement}
                  </p>
                </div>
              </div>
            )}

            {/* Custom Field Answers (Scholarship-Specific) */}
            {application.customFieldAnswers && Object.keys(application.customFieldAnswers).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
                <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
                  <h2 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Scholarship-Specific Answers
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-700 text-xs font-semibold rounded-full">
                      Custom Fields
                    </span>
                  </h2>
                  <p className="text-sm text-purple-600 mt-1">
                    Answers provided by the applicant for this scholarship's custom requirements
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(application.customFieldAnswers).map(([key, value]) => {
                      // Convert camelCase to readable label
                      const label = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                      
                      return (
                        <div key={key} className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                          <div className="text-xs font-medium text-purple-600 mb-1">{label}</div>
                          <div className="text-slate-800 font-semibold">
                            {typeof value === 'boolean' 
                              ? (value ? '✅ Yes' : '❌ No')
                              : typeof value === 'number'
                                ? value.toLocaleString()
                                : String(value) || 'Not provided'
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            {application.documents.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      Submitted Documents ({application.documents.length})
                    </h2>
                    {ocrAvailable && (
                      <button
                        onClick={handleVerifyAll}
                        disabled={loadingOcr}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {loadingOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        {loadingOcr ? 'Verifying...' : 'Verify All Documents'}
                      </button>
                    )}
                  </div>
                  {/* OCR Summary Banner */}
                  {ocrStatus && ocrStatus.summary && (() => {
                    const s = ocrStatus.summary;
                    const total = (s.verified || 0) + (s.mismatches || 0) + (s.partial || 0) + (s.pending || 0);
                    const scanned = total - (s.pending || 0);
                    return (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/60 border border-indigo-100">
                        {/* Progress bar */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">OCR Verification Progress</span>
                          <span className="text-xs font-bold text-indigo-700">{scanned}/{total} scanned</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3.5">
                          <div className="h-full flex">
                            {s.verified > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(s.verified / total) * 100}%` }} />}
                            {s.mismatches > 0 && <div className="bg-red-500 transition-all duration-500" style={{ width: `${(s.mismatches / total) * 100}%` }} />}
                            {s.partial > 0 && <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(s.partial / total) * 100}%` }} />}
                          </div>
                        </div>
                        {/* Stat chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {s.verified > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-emerald-700 leading-tight">{s.verified}</div>
                                <div className="text-[10px] font-medium text-emerald-600 uppercase">Verified</div>
                              </div>
                            </div>
                          )}
                          {s.mismatches > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                              <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-red-700 leading-tight">{s.mismatches}</div>
                                <div className="text-[10px] font-medium text-red-600 uppercase">Mismatch</div>
                              </div>
                            </div>
                          )}
                          {s.partial > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                              <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-amber-700 leading-tight">{s.partial}</div>
                                <div className="text-[10px] font-medium text-amber-600 uppercase">Partial</div>
                              </div>
                            </div>
                          )}
                          {(s.pending || 0) > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-slate-600 leading-tight">{s.pending}</div>
                                <div className="text-[10px] font-medium text-slate-500 uppercase">Pending</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {application.documents.map((doc, index) => {
                      const isPDF = doc.mimeType?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
                      const isImage = doc.mimeType?.startsWith('image/') || 
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name);
                      const isTextInput = doc.isTextDocument || doc.textContent;
                      
                      // Text input document - show text content directly
                      if (isTextInput) {
                        return (
                          <div 
                            key={index}
                            className="p-4 bg-amber-50 rounded-xl border border-amber-200"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100">
                                <FileText className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-800">{doc.name}</div>
                                <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                  📝 Text Response • {doc.uploadedAt}
                                </div>
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-amber-200">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {doc.textContent || 'No content provided'}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      
                      // File document - show preview/download buttons + OCR
                      const docOcr = doc._id ? getDocOcrStatus(doc._id) : null;
                      const isExpanded = expandedOcrDoc === doc._id;
                      const isVerifying = verifyingDocId === doc._id;

                      return (
                        <div key={index} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isPDF ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-primary-100'
                              }`}>
                                {isPDF ? (
                                  <FileText className="w-6 h-6 text-red-600" />
                                ) : isImage ? (
                                  <Image className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <FileText className="w-6 h-6 text-primary-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-800 flex items-center gap-2 flex-wrap">
                                  <span className="truncate">{doc.name}</span>
                                  {/* OCR Status Badge */}
                                  {docOcr && docOcr.ocrStatus === 'completed' && docOcr.overallMatch === 'verified' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg shadow-sm shadow-emerald-100">
                                      <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></span>
                                      Verified
                                    </span>
                                  )}
                                  {docOcr && docOcr.ocrStatus === 'completed' && docOcr.overallMatch === 'mismatch' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-gradient-to-r from-red-100 to-red-50 border border-red-300 px-2.5 py-1 rounded-lg shadow-sm shadow-red-100 animate-pulse">
                                      <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"><XCircle className="w-3 h-3 text-white" /></span>
                                      Mismatch
                                    </span>
                                  )}
                                  {docOcr && docOcr.ocrStatus === 'completed' && docOcr.overallMatch === 'partial' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg shadow-sm shadow-amber-100">
                                      <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-white" /></span>
                                      Partial Match
                                    </span>
                                  )}
                                  {docOcr && docOcr.ocrStatus === 'completed' && docOcr.overallMatch === 'unreadable' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-gradient-to-r from-slate-150 to-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg shadow-sm">
                                      <span className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center"><Eye className="w-3 h-3 text-white" /></span>
                                      Unreadable
                                    </span>
                                  )}
                                  {docOcr && docOcr.ocrStatus === 'failed' && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                                      <XCircle className="w-3.5 h-3.5" /> OCR Failed
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  <span>{doc.type} • {doc.uploadedAt}</span>
                                  {isPDF && <span className="ml-1 text-red-600 font-medium">PDF</span>}
                                  {isImage && <span className="ml-1 text-blue-600 font-medium">Image</span>}
                                  {docOcr?.confidence != null && (() => {
                                    const pct = Math.round(docOcr.confidence * 100);
                                    const color = pct >= 75 ? 'emerald' : pct >= 40 ? 'amber' : 'red';
                                    return (
                                      <span className="inline-flex items-center gap-1.5 ml-1">
                                        <span className="text-xs font-semibold text-slate-500">OCR</span>
                                        <span className="relative inline-flex items-center">
                                          <span className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <span
                                              className={`block h-full rounded-full transition-all duration-700 ${
                                                color === 'emerald' ? 'bg-emerald-500' :
                                                color === 'amber' ? 'bg-amber-400' : 'bg-red-500'
                                              }`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </span>
                                        </span>
                                        <span className={`text-xs font-bold ${
                                          color === 'emerald' ? 'text-emerald-600' :
                                          color === 'amber' ? 'text-amber-600' : 'text-red-600'
                                        }`}>{pct}%</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* OCR Verify Button */}
                              {ocrAvailable && doc._id && (
                                <button
                                  onClick={() => handleVerifyDocument(doc._id!)}
                                  disabled={isVerifying}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                  title="Verify with OCR"
                                >
                                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                  {isVerifying ? 'Scanning...' : docOcr ? 'Re-scan' : 'OCR'}
                                </button>
                              )}
                              {/* Preview Button */}
                              <button
                                onClick={() => loadDocumentPreview(doc)}
                                disabled={loadingPreview}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                              >
                                {loadingPreview ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                                Preview
                              </button>
                              {/* Download Button */}
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                              {/* Expand OCR Details */}
                              {docOcr && docOcr.ocrStatus === 'completed' && doc._id && (
                                <button
                                  onClick={() => setExpandedOcrDoc(isExpanded ? null : doc._id!)}
                                  className="inline-flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                                  title={isExpanded ? 'Hide OCR details' : 'Show OCR details'}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded OCR Comparison Panel */}
                          {isExpanded && docOcr && docOcr.ocrStatus === 'completed' && (
                            <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white">
                              <div className="px-5 py-4 space-y-4">
                                {/* Overall result header inside panel */}
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-indigo-500" />
                                    OCR Verification Details
                                  </h4>
                                  {docOcr.confidence != null && (() => {
                                    const pct = Math.round(docOcr.confidence * 100);
                                    const color = pct >= 75 ? 'emerald' : pct >= 40 ? 'amber' : 'red';
                                    return (
                                      <div className={`px-3 py-1.5 rounded-lg border font-bold text-sm ${
                                        color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                        color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                        'bg-red-50 border-red-200 text-red-700'
                                      }`}>
                                        {pct}% Confidence
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Field-by-field comparison */}
                                {docOcr.comparisonResults && docOcr.comparisonResults.length > 0 && (
                                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                    {/* Table header */}
                                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field</div>
                                      <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">OCR Extracted</div>
                                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Application</div>
                                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Result</div>
                                    </div>
                                    {/* Table rows */}
                                    {docOcr.comparisonResults.map((field: OcrFieldResult, fi: number) => {
                                      const isMatch = field.match;
                                      const isCritical = field.severity === 'critical';
                                      const rowBg = isMatch ? '' : isCritical ? 'bg-red-50/60' : 'bg-amber-50/40';
                                      const leftBorder = isMatch ? 'border-l-emerald-400' : isCritical ? 'border-l-red-400' : 'border-l-amber-400';
                                      return (
                                        <div
                                          key={fi}
                                          className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 last:border-b-0 border-l-[3px] ${leftBorder} ${rowBg} hover:bg-slate-50 transition-colors`}
                                        >
                                          <div className="col-span-3">
                                            <span className="text-sm font-semibold text-slate-700 capitalize">
                                              {field.field.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                          </div>
                                          <div className="col-span-4">
                                            <span className="text-sm font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                              {String(field.extracted ?? '—')}
                                            </span>
                                          </div>
                                          <div className="col-span-3">
                                            <span className="text-sm font-mono text-slate-600">
                                              {String(field.expected ?? '—')}
                                            </span>
                                          </div>
                                          <div className="col-span-2 flex justify-end">
                                            {severityBadge(isMatch ? 'verified' : (isCritical ? 'critical' : 'warning'))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Extracted fields (no comparison) */}
                                {docOcr.extractedFields && (!docOcr.comparisonResults || docOcr.comparisonResults.length === 0) && (
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Extracted Fields</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(docOcr.extractedFields).map(([key, val]) => (
                                        <div key={key} className="text-sm p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                          </span>
                                          <span className="font-semibold text-slate-800">{String(val)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Raw Text Button */}
                                {doc._id && (
                                  <button
                                    onClick={() => handleViewRawText(doc._id!)}
                                    className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-200 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {rawTextDoc?.docId === doc._id ? 'Hide Raw Text' : 'View Raw OCR Text'}
                                  </button>
                                )}

                                {/* Raw Text Display */}
                                {rawTextDoc && rawTextDoc.docId === doc._id && (
                                  <div className="mt-2 p-4 bg-slate-900 text-emerald-300 rounded-xl text-xs font-mono max-h-72 overflow-auto whitespace-pre-wrap border border-slate-700 shadow-inner">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                                      <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                                      <span className="text-[10px] text-slate-500 ml-2">Raw OCR Output</span>
                                    </div>
                                    {rawTextDoc.text}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Scholarship Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-primary-50 border-b border-primary-100">
                <h2 className="text-lg font-semibold text-primary-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-600" />
                  Scholarship Details
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-sm text-slate-500">Scholarship</div>
                  <div className="font-semibold text-slate-800">{application.scholarshipName}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Sponsor</div>
                  <div className="font-medium text-slate-700">{application.scholarshipSponsor}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Type</div>
                  <div className="font-medium text-slate-700">{application.scholarshipType}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Submitted</div>
                  <div className="font-medium text-slate-700">{application.submittedDate}</div>
                </div>
                {application.scholarshipId && (
                  <button
                    onClick={() => navigate(`/scholarships/${application.scholarshipId}`)}
                    className="w-full mt-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    View Scholarship Details
                  </button>
                )}
              </div>
            </div>

            {/* Success Prediction - ML Analysis */}
            {currentPrediction && (currentPrediction.probabilityPercentage || currentPrediction.probability) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary-600" />
                      ML Prediction
                      {loadingPrediction && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-semibold flex items-center gap-1 border border-primary-100">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {(() => {
                    const pct = currentPrediction.probabilityPercentage ?? Math.round(currentPrediction.probability * 100);
                    return (
                      <>
                        {/* Main Prediction Display */}
                        <div className={`p-4 rounded-xl border ${
                          pct >= 70 ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-200' :
                          pct >= 40 ? 'bg-gradient-to-br from-amber-50 to-yellow-50/50 border-amber-200' : 'bg-gradient-to-br from-red-50 to-rose-50/50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                pct >= 70 ? 'bg-green-100' :
                                pct >= 40 ? 'bg-amber-100' : 'bg-red-100'
                              }`}>
                                <Sparkles className={`w-3.5 h-3.5 ${
                                  pct >= 70 ? 'text-green-600' :
                                  pct >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`} />
                              </div>
                              <span className="text-sm font-medium text-slate-700">Success Probability</span>
                            </div>
                            <span className={`text-xl font-bold ${
                              pct >= 70 ? 'text-green-600' :
                              pct >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {pct}%
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-2 bg-white/80 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 70 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                pct >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Predicted Outcome & Confidence */}
                        <div className="flex gap-2.5 mt-4">
                          {currentPrediction.predictedOutcome && (
                            <div className="flex-1 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-500 mb-0.5 font-medium">Outcome</div>
                              <span className={`text-xs font-semibold ${
                                currentPrediction.predictedOutcome === 'approved'
                                  ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {currentPrediction.predictedOutcome === 'approved' ? 'Likely Approved' : 'Likely Rejected'}
                              </span>
                            </div>
                          )}
                          {currentPrediction.confidence && (
                            <div className="flex-1 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-500 mb-0.5 font-medium">Confidence</div>
                              <span className={`text-xs font-semibold capitalize ${
                                currentPrediction.confidence === 'high' ? 'text-green-700' :
                                currentPrediction.confidence === 'medium' ? 'text-amber-700' : 'text-slate-700'
                              }`}>
                                {currentPrediction.confidence}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* View Detailed Calculation Button */}
                  <button
                    onClick={() => navigate(`/scholarships/${application.scholarshipId}/prediction`, {
                      state: {
                        applicationId: application.id,
                        scholarshipName: application.scholarshipName,
                        scholarshipId: application.scholarshipId,
                        fromAdmin: true
                      }
                    })}
                    className="w-full mt-4 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    View Detailed Calculation
                  </button>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-slate-400 mt-3 text-center">
                    Based on historical data. Use as guidance only.
                  </p>
                </div>
              </div>
            )}

            {/* Review Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">Review Notes</h2>
              </div>
              <div className="p-6">
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this application (optional)..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  disabled={!isPending}
                />
                {application.reviewNotes && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">Previous Notes:</div>
                    <p className="text-slate-700 text-sm">{application.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason (if rejected) */}
            {application.status === 'rejected' && application.rejectionReason && (
              <div className="bg-red-50 rounded-2xl border border-red-200 overflow-hidden">
                <div className="px-6 py-4 bg-red-100 border-b border-red-200">
                  <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Rejection Reason
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-red-700">{application.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800">Take Action</h2>
                </div>
                <div className="p-6 space-y-3">
                  {application.status !== 'under_review' && (
                    <button
                      onClick={handleMarkUnderReview}
                      disabled={processing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 disabled:opacity-50"
                    >
                      {processing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                      Mark as Under Review
                    </button>
                  )}
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    Approve Application
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 font-semibold rounded-xl hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Application
                  </button>
                </div>
              </div>
            )}

            {/* Already Processed Message */}
            {!isPending && (
              <div className={`rounded-2xl p-6 ${
                application.status === 'approved' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="text-center">
                  {application.status === 'approved' ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-green-800">Application Approved</h3>
                      <p className="text-green-700 text-sm mt-1">
                        This application has been approved.
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-red-800">Application Rejected</h3>
                      <p className="text-red-700 text-sm mt-1">
                        This application has been rejected.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Reject Application
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Please provide a reason for rejecting this application. This will be visible to the applicant.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {isPreviewOpen && previewDoc && previewUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setIsPreviewOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col border border-slate-200" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-primary-600 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {previewDoc.mimeType?.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <Image className="w-6 h-6" />
                )}
                <div>
                  <h3 className="font-bold text-lg text-white">{previewDoc.name}</h3>
                  <p className="text-sm text-primary-100">
                    {previewDoc.mimeType?.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') 
                      ? 'PDF Document' 
                      : 'Image Document'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {previewDoc.mimeType?.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-lg border-2 border-slate-200 bg-white"
                  aria-label={previewDoc.name}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <FileText className="w-12 h-12" />
                    <p>PDF preview not available in this browser.</p>
                    <a href={previewUrl} download={previewDoc.name} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Download PDF</a>
                  </div>
                </object>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewUrl}
                    alt={previewDoc.name}
                    className="max-w-full max-h-full rounded-lg shadow-lg object-contain"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadDocument(previewDoc)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationReview;
