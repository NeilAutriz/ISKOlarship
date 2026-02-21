// ============================================================================
// ISKOlarship - Admin Document Verification Page
// Review and verify student AND admin profile documents with OCR scanning support
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  CheckCheck,
  X,
  MessageSquare,
  Image,
  RotateCcw,
  ScanLine,
  Info,
  FileSearch,
  Users,
  Briefcase,
  FolderOpen,
  ShieldCheck,
  Ban,
  UploadCloud,
} from 'lucide-react';
import { verificationApi } from '../../services/apiClient';

// Types
interface VerificationDoc {
  _id: string;
  name: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'resubmit';
  verifiedAt: string | null;
  verificationRemarks: string;
  hasFile: boolean;
}

interface StudentVerification {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string;
  college: string;
  course: string;
  profilePicture: string | null;
  totalDocuments: number;
  pending: number;
  verified: number;
  rejected: number;
  resubmit: number;
  documents: VerificationDoc[];
}

interface VerificationStats {
  totalDocuments: number;
  pending: number;
  verified: number;
  rejected: number;
  resubmit: number;
  totalStudents: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface OcrFieldResult {
  field: string;
  extracted: string | number;
  expected: string | number;
  match: boolean;
  similarity?: number;
  difference?: number;
  severity: 'verified' | 'warning' | 'critical' | 'info';
  percentDifference?: string;
}

interface OcrResult {
  documentId: string;
  documentName?: string;
  documentType?: string;
  status: 'completed' | 'failed' | 'unavailable' | 'skipped' | 'unreadable';
  overallMatch?: 'verified' | 'mismatch' | 'partial' | 'unreadable';
  confidence?: number;
  fields?: OcrFieldResult[];
  extractedFields?: Record<string, unknown>;
  rawTextPreview?: string;
  message?: string;
  error?: string;
  profileSnapshot?: {
    name: string;
    studentNumber?: string;
    college?: string;
    collegeCode?: string;
    course?: string;
    gwa?: number | null;
    annualFamilyIncome?: number | null;
    homeAddress?: string;
    position?: string;
    department?: string;
    academicUnit?: string;
  };
}

interface AdminVerification {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  accessLevel: string;
  college: string;
  position: string;
  academicUnit: string | null;
  profilePicture: string | null;
  totalDocuments: number;
  pending: number;
  verified: number;
  rejected: number;
  resubmit: number;
  documents: VerificationDoc[];
}

interface AdminVerificationStats {
  totalDocuments: number;
  pending: number;
  verified: number;
  rejected: number;
  resubmit: number;
  totalAdmins: number;
}

type VerificationTab = 'students' | 'admins';

const DocumentVerification: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<VerificationTab>('students');

  // Student state
  const [students, setStudents] = useState<StudentVerification[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; mimeType: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [updatingDoc, setUpdatingDoc] = useState<string | null>(null);
  const [remarksModal, setRemarksModal] = useState<{ targetId: string; docId: string; action: string; isAdmin: boolean } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'has_pending'>('has_pending');
  const [adminScope, setAdminScope] = useState<{ level: string; levelDisplay: string; description: string } | null>(null);
  const [isScopeError, setIsScopeError] = useState(false);
  const [scopeErrorMsg, setScopeErrorMsg] = useState('');
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);
  const [ocrResults, setOcrResults] = useState<Record<string, OcrResult>>({});
  const [scanningDoc, setScanningDoc] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState<string | null>(null);
  const [expandedOcr, setExpandedOcr] = useState<string | null>(null);

  // Admin tab state
  const [admins, setAdmins] = useState<AdminVerification[]>([]);
  const [adminStats, setAdminStats] = useState<AdminVerificationStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPagination, setAdminPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);
  const [adminFilterStatus, setAdminFilterStatus] = useState<'all' | 'has_pending'>('has_pending');

  // Load student data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch scope info first time
      if (!adminScope) {
        try {
          const scopeRes = await verificationApi.getScope();
          if (scopeRes.success && scopeRes.data) {
            const scopeData = scopeRes.data as { level: string; levelDisplay: string; description: string };
            setAdminScope(scopeData);
          }
        } catch (scopeErr: any) {
          if (scopeErr?.response?.status === 403) {
            setIsScopeError(true);
            setScopeErrorMsg(scopeErr.response?.data?.message || 'Your admin profile is not configured for document verification.');
            setLoading(false);
            return;
          }
        }
      }

      // Check OCR availability (once)
      if (ocrAvailable === null) {
        try {
          const ocrRes = await verificationApi.getOcrStatus();
          if (ocrRes.success && ocrRes.data) {
            setOcrAvailable((ocrRes.data as { available: boolean }).available);
          }
        } catch {
          setOcrAvailable(false);
        }
      }

      const [pendingRes, statsRes] = await Promise.all([
        verificationApi.getPending({ page: pagination.page, limit: pagination.limit, search }),
        verificationApi.getStats(),
      ]);

      if (pendingRes.success) {
        const data = pendingRes.data as { students: StudentVerification[]; pagination: Pagination };
        let filtered = data.students;
        if (filterStatus === 'has_pending') {
          filtered = filtered.filter(s => s.pending > 0);
        }
        setStudents(filtered);
        setPagination(data.pagination);
      }
      if (statsRes.success) {
        setStats(statsRes.data as VerificationStats);
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsScopeError(true);
        setScopeErrorMsg(err.response?.data?.message || 'You do not have access to verify documents within your administrative scope.');
      } else {
        toast.error('Failed to load verification data');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterStatus, adminScope, ocrAvailable]);

  // Load admin data
  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [pendingRes, statsRes] = await Promise.all([
        verificationApi.getAdminPending({ page: adminPagination.page, limit: adminPagination.limit, search: adminSearch }),
        verificationApi.getAdminStats(),
      ]);

      if (pendingRes.success) {
        const data = pendingRes.data as { admins: AdminVerification[]; pagination: Pagination };
        let filtered = data.admins;
        if (adminFilterStatus === 'has_pending') {
          filtered = filtered.filter(a => a.pending > 0);
        }
        setAdmins(filtered);
        setAdminPagination(data.pagination);
      }
      if (statsRes.success) {
        setAdminStats(statsRes.data as AdminVerificationStats);
      }
    } catch {
      // Admin verification may not be available for academic_unit level admins - silently handle
    } finally {
      setAdminLoading(false);
    }
  }, [adminPagination.page, adminPagination.limit, adminSearch, adminFilterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [adminSearchInput, setAdminSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAdminSearch(adminSearchInput), 400);
    return () => clearTimeout(timer);
  }, [adminSearchInput]);

  // Preview document (works for both student and admin)
  const handlePreview = async (targetId: string, doc: VerificationDoc, isAdmin = false) => {
    if (!doc.hasFile) {
      toast.warning('No file available for this document');
      return;
    }
    setLoadingPreview(doc._id);
    try {
      const res = isAdmin
        ? await verificationApi.getAdminDocumentPreview(targetId, doc._id)
        : await verificationApi.getDocumentPreview(targetId, doc._id);
      if (res.success) {
        const data = res.data as { url: string; mimeType: string };
        // Fetch the signed URL as a blob to enable inline rendering
        // (Cloudinary private_download_url sends Content-Disposition: attachment
        //  which forces download instead of inline display in iframe)
        const blobRes = await fetch(data.url);
        if (!blobRes.ok) throw new Error('Failed to fetch document');
        const blob = await blobRes.blob();
        const fetchedType = blobRes.headers.get('content-type');
        // Cloudinary raw resources return 'application/octet-stream' — ignore it
        const contentType = (fetchedType && fetchedType !== 'application/octet-stream')
          ? fetchedType
          : data.mimeType || doc.mimeType || 'application/octet-stream';
        const typedBlob = new Blob([blob], { type: contentType });
        const blobUrl = URL.createObjectURL(typedBlob);
        setPreviewUrl(blobUrl);
        setPreviewDoc({ name: doc.fileName, mimeType: contentType });
      }
    } catch {
      toast.error('Failed to load preview');
    } finally {
      setLoadingPreview(null);
    }
  };

  // Update document status (works for both student and admin)
  const handleUpdateStatus = async (targetId: string, docId: string, status: string, remarksText?: string, isAdmin = false) => {
    setUpdatingDoc(docId);
    try {
      const res = isAdmin
        ? await verificationApi.updateAdminDocumentStatus(targetId, docId, status, remarksText)
        : await verificationApi.updateDocumentStatus(targetId, docId, status, remarksText);
      if (res.success) {
        toast.success(`Document ${status}`);
        if (isAdmin) {
          await loadAdminData();
        } else {
          await loadData();
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error(isAdmin ? 'This admin is outside your verification scope' : 'This student is outside your administrative scope');
      } else {
        toast.error('Failed to update document status');
      }
    } finally {
      setUpdatingDoc(null);
      setRemarksModal(null);
      setRemarks('');
    }
  };

  // Verify all for a student or admin
  const handleVerifyAll = async (targetId: string, isAdmin = false) => {
    setUpdatingDoc(`all-${targetId}`);
    try {
      const res = isAdmin
        ? await verificationApi.verifyAllForAdmin(targetId, 'verified')
        : await verificationApi.verifyAllForStudent(targetId, 'verified');
      if (res.success) {
        const data = res.data as { updated: number };
        toast.success(`${data.updated} document(s) verified`);
        if (isAdmin) {
          await loadAdminData();
        } else {
          await loadData();
        }
      }
    } catch {
      toast.error('Failed to verify all documents');
    } finally {
      setUpdatingDoc(null);
    }
  };

  // Submit rejection/resubmit with remarks
  const handleRemarksSubmit = () => {
    if (!remarksModal) return;
    if (!remarks.trim() && remarksModal.action !== 'verified') {
      toast.warning('Please provide a reason');
      return;
    }
    handleUpdateStatus(remarksModal.targetId, remarksModal.docId, remarksModal.action, remarks, remarksModal.isAdmin);
  };

  // OCR scan a single document (student or admin)
  const handleOcrScan = async (targetId: string, doc: VerificationDoc, isAdmin = false) => {
    setScanningDoc(doc._id);
    try {
      const res = isAdmin
        ? await verificationApi.ocrScanAdminDocument(targetId, doc._id)
        : await verificationApi.ocrScanDocument(targetId, doc._id);
      if (res.success && res.data) {
        const result = res.data as OcrResult;
        setOcrResults(prev => ({ ...prev, [doc._id]: result }));
        setExpandedOcr(doc._id);
        if (result.status === 'completed') {
          if (result.overallMatch === 'verified') {
            toast.success(`OCR: Document matches profile data (${Math.round((result.confidence || 0) * 100)}% confidence)`);
          } else if (result.overallMatch === 'mismatch') {
            toast.error('OCR: Document data does NOT match profile');
          } else if (result.overallMatch === 'partial') {
            toast.warning('OCR: Partial match — some fields need review');
          } else {
            toast.info('OCR: Could not read text from this document');
          }
        } else if (result.status === 'unavailable') {
          toast.warning(result.message || 'OCR service not available');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OCR scan failed');
    } finally {
      setScanningDoc(null);
    }
  };

  // OCR scan all pending docs for a student or admin
  const handleOcrScanAll = async (targetId: string, isAdmin = false) => {
    setScanningAll(targetId);
    try {
      const res = isAdmin
        ? await verificationApi.ocrScanAllAdmin(targetId)
        : await verificationApi.ocrScanAll(targetId);
      if (res.success && res.data) {
        const data = res.data as { documents: OcrResult[]; summary: Record<string, number> };
        const newResults: Record<string, OcrResult> = {};
        for (const doc of data.documents) {
          newResults[doc.documentId] = doc;
        }
        setOcrResults(prev => ({ ...prev, ...newResults }));
        const summary = data.summary;
        if (summary) {
          toast.info(`OCR scan complete: ${summary.verified || 0} verified, ${summary.mismatches || 0} mismatches, ${summary.partial || 0} partial`);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OCR scan failed');
    } finally {
      setScanningAll(null);
    }
  };

  // Helper: OCR match badge
  const OcrMatchBadge: React.FC<{ match: string }> = ({ match }) => {
    switch (match) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> OCR Match
          </span>
        );
      case 'mismatch':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Mismatch
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            <Info className="w-3 h-3" /> Unreadable
          </span>
        );
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
    const baseClass = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
    switch (status) {
      case 'verified':
        return (
          <span className={`inline-flex items-center gap-1.5 ${baseClass} font-semibold rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200`}>
            <CheckCircle className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className={`inline-flex items-center gap-1.5 ${baseClass} font-semibold rounded-lg bg-red-100 text-red-700 border border-red-200`}>
            <XCircle className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} /> Rejected
          </span>
        );
      case 'resubmit':
        return (
          <span className={`inline-flex items-center gap-1.5 ${baseClass} font-semibold rounded-lg bg-amber-100 text-amber-700 border border-amber-200`}>
            <RotateCcw className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} /> Resubmit
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 ${baseClass} font-semibold rounded-lg bg-slate-100 text-slate-600 border border-slate-200`}>
            <Clock className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} /> Pending
          </span>
        );
    }
  };

  // Shared OCR results panel renderer (ApplicationReview-style)
  const renderOcrPanel = (docOcr: OcrResult, targetId: string, doc: VerificationDoc, isAdmin: boolean) => (
    <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white">
      <div className="px-5 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            OCR Verification Details
          </h4>
          <div className="flex items-center gap-2">
            {docOcr.overallMatch && <OcrMatchBadge match={docOcr.overallMatch} />}
            {docOcr.confidence !== undefined && (() => {
              const pct = Math.round(docOcr.confidence! * 100);
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
            <button
              onClick={() => handleOcrScan(targetId, doc, isAdmin)}
              disabled={scanningDoc === doc._id}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200 transition-colors"
              title="Re-scan"
            >
              {scanningDoc === doc._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Re-scan
            </button>
            <button
              onClick={() => setExpandedOcr(null)}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Field-by-field comparison grid */}
        {docOcr.fields && docOcr.fields.length > 0 ? (
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            {/* Grid header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
              <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field</div>
              <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">OCR Extracted</div>
              <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Profile Data</div>
              <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Result</div>
            </div>
            {/* Grid rows */}
            {docOcr.fields.map((field, idx) => {
              const leftBorder = field.severity === 'verified' ? 'border-l-emerald-400'
                : field.severity === 'warning' ? 'border-l-amber-400'
                : field.severity === 'info' ? 'border-l-slate-300'
                : 'border-l-red-400';
              const rowBg = field.severity === 'verified' ? ''
                : field.severity === 'warning' ? 'bg-amber-50/40'
                : field.severity === 'info' ? 'bg-slate-50/40'
                : 'bg-red-50/60';
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 last:border-b-0 border-l-[3px] ${leftBorder} ${rowBg} hover:bg-slate-50/80 transition-colors`}
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
                    {field.severity === 'verified' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Match</span>
                    ) : field.severity === 'warning' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Mismatch</span>
                    ) : field.severity === 'info' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"><Info className="w-3 h-3" /> Not Found</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Critical</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-500">
              {docOcr.overallMatch === 'unreadable'
                ? 'Could not extract readable text from this document.'
                : 'No comparable fields were extracted from this document.'}
            </p>
          </div>
        )}

        {/* Raw text - terminal style */}
        {docOcr.rawTextPreview && (
          <details className="group">
            <summary className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-200 transition-colors cursor-pointer list-none">
              <FileText className="w-3.5 h-3.5" />
              View Raw OCR Text
              <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 p-4 bg-slate-900 text-emerald-300 rounded-xl text-xs font-mono max-h-72 overflow-auto whitespace-pre-wrap border border-slate-700 shadow-inner">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-slate-500 ml-2">Raw OCR Output</span>
              </div>
              {docOcr.rawTextPreview}
            </div>
          </details>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scope Error Screen */}
        {isScopeError && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
              <p className="text-slate-600 mb-4">{scopeErrorMsg}</p>
              <p className="text-sm text-slate-500 mb-6">You can only verify documents for students within your assigned administrative scope. Contact a university-level admin if you need broader access.</p>
              <button
                onClick={() => { setIsScopeError(false); setScopeErrorMsg(''); loadData(); }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!isScopeError && (
          <>
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-200">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Document Verification</h1>
              <p className="text-sm text-slate-500">Review and verify student &amp; admin profile documents</p>
            </div>
          </div>
          {/* Admin Scope Badge */}
          {adminScope && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm">
              <Shield className="w-3.5 h-3.5 text-primary-600" />
              <span className="font-medium text-primary-700">{adminScope.levelDisplay}</span>
              <span className="text-primary-500">—</span>
              <span className="text-primary-600">{adminScope.description}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Students
            {stats && stats.pending > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {stats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'admins'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Admins
            {adminStats && adminStats.pending > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {adminStats.pending}
              </span>
            )}
          </button>
        </div>

        {/* ==================== STUDENTS TAB ==================== */}
        {activeTab === 'students' && (
        <>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{stats.totalStudents}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Students</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-300" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{stats.totalDocuments}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total Docs</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
                  <div className="text-xs font-medium text-amber-600 uppercase tracking-wider mt-1">Pending</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-700">{stats.verified}</div>
                  <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider mt-1">Verified</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                  <div className="text-xs font-medium text-red-600 uppercase tracking-wider mt-1">Rejected</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">{stats.resubmit}</div>
                  <div className="text-xs font-medium text-orange-600 uppercase tracking-wider mt-1">Resubmit</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {stats && stats.totalDocuments > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Progress</span>
              <span className="text-sm font-bold text-primary-600">
                {Math.round(((stats.verified) / stats.totalDocuments) * 100)}% complete
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full flex">
                {stats.verified > 0 && (
                  <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(stats.verified / stats.totalDocuments) * 100}%` }} />
                )}
                {stats.rejected > 0 && (
                  <div className="bg-red-400 transition-all duration-700" style={{ width: `${(stats.rejected / stats.totalDocuments) * 100}%` }} />
                )}
                {stats.resubmit > 0 && (
                  <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(stats.resubmit / stats.totalDocuments) * 100}%` }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or student number..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'has_pending')}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="has_pending">Has Pending</option>
              <option value="all">All Students</option>
            </select>
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && students.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">All Clear!</h3>
            <p className="text-sm text-slate-500">
              {filterStatus === 'has_pending'
                ? 'No students with pending document verifications.'
                : 'No students have uploaded documents yet.'}
            </p>
          </div>
        )}

        {/* Student List */}
        {!loading && students.length > 0 && (
          <div className="space-y-3">
            {students.map(student => {
              const isExpanded = expandedStudent === student.studentId;
              const isAllVerified = student.pending === 0 && student.rejected === 0 && student.resubmit === 0;

              return (
                <div
                  key={student.studentId}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                    isAllVerified ? 'border-emerald-200' : student.rejected > 0 ? 'border-red-200' : 'border-slate-200'
                  }`}
                >
                  {/* Student Row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                          {student.firstName} {student.lastName}
                          {isAllVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> All Verified
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>{student.studentNumber}</span>
                          <span className="text-slate-300">|</span>
                          <span>{student.college}</span>
                          <span className="text-slate-300">|</span>
                          <span className="truncate">{student.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Mini status counts */}
                      <div className="hidden sm:flex items-center gap-2">
                        {student.pending > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                            <Clock className="w-3 h-3" /> {student.pending}
                          </span>
                        )}
                        {student.verified > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> {student.verified}
                          </span>
                        )}
                        {student.rejected > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600">
                            <XCircle className="w-3 h-3" /> {student.rejected}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-400">{student.totalDocuments} docs</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Document List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {/* Quick Actions */}
                      {student.pending > 0 && (
                        <div className="px-5 py-3 border-b border-slate-100 bg-primary-50/50 flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary-700">
                            {student.pending} document{student.pending > 1 ? 's' : ''} awaiting review
                          </span>
                          <div className="flex items-center gap-2">
                            {ocrAvailable && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOcrScanAll(student.studentId); }}
                                disabled={scanningAll === student.studentId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                              >
                                {scanningAll === student.studentId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ScanLine className="w-3.5 h-3.5" />
                                )}
                                OCR Scan All
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVerifyAll(student.studentId); }}
                              disabled={updatingDoc === `all-${student.studentId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {updatingDoc === `all-${student.studentId}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                              )}
                              Verify All Pending
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="px-5 py-4 space-y-2">
                        {student.documents.map(doc => {
                          const isPDF = doc.mimeType?.includes('pdf');
                          const isImage = doc.mimeType?.startsWith('image/');
                          const isUpdating = updatingDoc === doc._id;
                          const docOcr = ocrResults[doc._id];
                          const isOcrExpanded = expandedOcr === doc._id;

                          return (
                            <div key={doc._id} className="space-y-0">
                              <div
                                className={`rounded-xl border transition-all ${
                                  doc.verificationStatus === 'verified'
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : doc.verificationStatus === 'rejected'
                                    ? 'bg-red-50/50 border-red-200'
                                    : doc.verificationStatus === 'resubmit'
                                    ? 'bg-amber-50/50 border-amber-200'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                {/* Document row */}
                                <div className="flex items-center justify-between p-3.5">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      isPDF ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-slate-100'
                                    }`}>
                                      {isPDF ? (
                                        <FileText className="w-5 h-5 text-red-500" />
                                      ) : isImage ? (
                                        <Image className="w-5 h-5 text-blue-500" />
                                      ) : (
                                        <FileText className="w-5 h-5 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{doc.name}</span>
                                        <StatusBadge status={doc.verificationStatus} />
                                        {docOcr && docOcr.status === 'completed' && docOcr.overallMatch && (
                                          <OcrMatchBadge match={docOcr.overallMatch} />
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span>{doc.documentType.replace(/_/g, ' ')}</span>
                                        <span className="text-slate-300">·</span>
                                        <span>{doc.fileName}</span>
                                        <span className="text-slate-300">·</span>
                                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                        <span className="text-slate-300">·</span>
                                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                        {docOcr && docOcr.status === 'completed' && docOcr.confidence !== undefined && (
                                          <>
                                            <span className="text-slate-300">·</span>
                                            <span className={`font-semibold ${
                                              docOcr.confidence >= 0.8 ? 'text-emerald-600' :
                                              docOcr.confidence >= 0.5 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                              OCR {Math.round(docOcr.confidence * 100)}%
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {doc.verificationRemarks && (
                                        <div className="mt-1 text-xs text-slate-600 italic flex items-start gap-1">
                                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                                          {doc.verificationRemarks}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                                    {/* Preview */}
                                    <button
                                      onClick={() => handlePreview(student.studentId, doc)}
                                      disabled={loadingPreview === doc._id || !doc.hasFile}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                                      title="Preview document"
                                    >
                                      {loadingPreview === doc._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                                      Preview
                                    </button>

                                    {/* OCR Scan */}
                                    {ocrAvailable && doc.hasFile && (
                                      <button
                                        onClick={() => docOcr ? setExpandedOcr(isOcrExpanded ? null : doc._id) : handleOcrScan(student.studentId, doc)}
                                        disabled={scanningDoc === doc._id}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                                          docOcr
                                            ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                                            : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                                        }`}
                                        title={docOcr ? 'View OCR results' : 'Run OCR scan'}
                                      >
                                        {scanningDoc === doc._id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : docOcr ? (
                                          <FileSearch className="w-3.5 h-3.5" />
                                        ) : (
                                          <ScanLine className="w-3.5 h-3.5" />
                                        )}
                                        {docOcr ? 'OCR' : 'Scan'}
                                      </button>
                                    )}

                                    {/* Verify */}
                                    {doc.verificationStatus !== 'verified' && (
                                      <button
                                        onClick={() => handleUpdateStatus(student.studentId, doc._id, 'verified')}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                        title="Mark as verified"
                                      >
                                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        Verify
                                      </button>
                                    )}

                                    {/* Reject (open remarks modal) */}
                                    {doc.verificationStatus !== 'rejected' && (
                                      <button
                                        onClick={() => setRemarksModal({ targetId: student.studentId, docId: doc._id, action: 'rejected', isAdmin: false })}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                        title="Reject document"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Reject
                                      </button>
                                    )}

                                    {/* Request resubmit */}
                                    {doc.verificationStatus !== 'resubmit' && doc.verificationStatus !== 'verified' && (
                                      <button
                                        onClick={() => setRemarksModal({ targetId: student.studentId, docId: doc._id, action: 'resubmit', isAdmin: false })}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                        title="Request resubmission"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Resubmit
                                      </button>
                                    )}

                                    {/* Reset to pending */}
                                    {doc.verificationStatus !== 'pending' && (
                                      <button
                                        onClick={() => handleUpdateStatus(student.studentId, doc._id, 'pending')}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                        title="Reset to pending"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* OCR Results Panel (expandable) */}
                                {isOcrExpanded && docOcr && docOcr.status === 'completed' && renderOcrPanel(docOcr, student.studentId, doc, false)}

                                {/* OCR unavailable/failed message */}
                                {isOcrExpanded && docOcr && (docOcr.status === 'unavailable' || docOcr.status === 'failed') && (
                                  <div className="border-t border-slate-200 bg-amber-50/50 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                      <span className="text-xs text-amber-700">{docOcr.message || docOcr.error || 'OCR scan could not be completed.'}</span>
                                      <button onClick={() => setExpandedOcr(null)} className="ml-auto p-1 hover:bg-amber-100 rounded-lg">
                                        <X className="w-3.5 h-3.5 text-amber-500" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
        </>
        )}

        {/* ==================== ADMINS TAB ==================== */}
        {activeTab === 'admins' && (
        <>
        {/* Admin Stats Cards */}
        {adminStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{adminStats.totalAdmins}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Admins</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-300" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{adminStats.totalDocuments}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total Docs</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-700">{adminStats.pending}</div>
                  <div className="text-xs font-medium text-amber-600 uppercase tracking-wider mt-1">Pending</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-700">{adminStats.verified}</div>
                  <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider mt-1">Verified</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-700">{adminStats.rejected}</div>
                  <div className="text-xs font-medium text-red-600 uppercase tracking-wider mt-1">Rejected</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-700">{adminStats.resubmit}</div>
                  <div className="text-xs font-medium text-orange-600 uppercase tracking-wider mt-1">Resubmit</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Progress bar */}
        {adminStats && adminStats.totalDocuments > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Progress</span>
              <span className="text-sm font-bold text-primary-600">
                {Math.round(((adminStats.verified) / adminStats.totalDocuments) * 100)}% complete
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full flex">
                {adminStats.verified > 0 && (
                  <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(adminStats.verified / adminStats.totalDocuments) * 100}%` }} />
                )}
                {adminStats.rejected > 0 && (
                  <div className="bg-red-400 transition-all duration-700" style={{ width: `${(adminStats.rejected / adminStats.totalDocuments) * 100}%` }} />
                )}
                {adminStats.resubmit > 0 && (
                  <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(adminStats.resubmit / adminStats.totalDocuments) * 100}%` }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={adminSearchInput}
              onChange={e => setAdminSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={adminFilterStatus}
              onChange={e => setAdminFilterStatus(e.target.value as 'all' | 'has_pending')}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="has_pending">Has Pending</option>
              <option value="all">All Admins</option>
            </select>
            <button
              onClick={() => loadAdminData()}
              disabled={adminLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${adminLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Admin Loading */}
        {adminLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {/* Admin Empty State */}
        {!adminLoading && admins.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">All Clear!</h3>
            <p className="text-sm text-slate-500">
              {adminFilterStatus === 'has_pending'
                ? 'No admins with pending document verifications.'
                : 'No admins have uploaded documents yet.'}
            </p>
            {adminScope?.level === 'academic_unit' && (
              <p className="text-xs text-slate-400 mt-2">Academic unit-level admins cannot verify other admin documents.</p>
            )}
          </div>
        )}

        {/* Admin List */}
        {!adminLoading && admins.length > 0 && (
          <div className="space-y-3">
            {admins.map(admin => {
              const isExpanded = expandedAdmin === admin.adminId;
              const isAllVerified = admin.pending === 0 && admin.rejected === 0 && admin.resubmit === 0;

              return (
                <div
                  key={admin.adminId}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                    isAllVerified ? 'border-emerald-200' : admin.rejected > 0 ? 'border-red-200' : 'border-slate-200'
                  }`}
                >
                  {/* Admin Row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedAdmin(isExpanded ? null : admin.adminId)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                          {admin.firstName} {admin.lastName}
                          {isAllVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> All Verified
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                          <span className="capitalize">{admin.accessLevel.replace(/_/g, ' ')}</span>
                          <span className="text-slate-300">|</span>
                          <span>{admin.college}</span>
                          {admin.position && admin.position !== 'N/A' && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span>{admin.position}</span>
                            </>
                          )}
                          <span className="text-slate-300">|</span>
                          <span className="truncate">{admin.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        {admin.pending > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                            <Clock className="w-3 h-3" /> {admin.pending}
                          </span>
                        )}
                        {admin.verified > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> {admin.verified}
                          </span>
                        )}
                        {admin.rejected > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600">
                            <XCircle className="w-3 h-3" /> {admin.rejected}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-400">{admin.totalDocuments} docs</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Admin Document List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {/* Quick Actions */}
                      {admin.pending > 0 && (
                        <div className="px-5 py-3 border-b border-slate-100 bg-primary-50/50 flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary-700">
                            {admin.pending} document{admin.pending > 1 ? 's' : ''} awaiting review
                          </span>
                          <div className="flex items-center gap-2">
                            {ocrAvailable && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOcrScanAll(admin.adminId, true); }}
                                disabled={scanningAll === admin.adminId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                              >
                                {scanningAll === admin.adminId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ScanLine className="w-3.5 h-3.5" />
                                )}
                                OCR Scan All
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVerifyAll(admin.adminId, true); }}
                              disabled={updatingDoc === `all-${admin.adminId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {updatingDoc === `all-${admin.adminId}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                              )}
                              Verify All Pending
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="px-5 py-4 space-y-2">
                        {admin.documents.map(doc => {
                          const isPDF = doc.mimeType?.includes('pdf');
                          const isImage = doc.mimeType?.startsWith('image/');
                          const isUpdating = updatingDoc === doc._id;
                          const docOcr = ocrResults[doc._id];
                          const isOcrExpanded = expandedOcr === doc._id;

                          return (
                            <div key={doc._id} className="space-y-0">
                              <div
                                className={`rounded-xl border transition-all ${
                                  doc.verificationStatus === 'verified'
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : doc.verificationStatus === 'rejected'
                                    ? 'bg-red-50/50 border-red-200'
                                    : doc.verificationStatus === 'resubmit'
                                    ? 'bg-amber-50/50 border-amber-200'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                {/* Document row */}
                                <div className="flex items-center justify-between p-3.5">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      isPDF ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-slate-100'
                                    }`}>
                                      {isPDF ? (
                                        <FileText className="w-5 h-5 text-red-500" />
                                      ) : isImage ? (
                                        <Image className="w-5 h-5 text-blue-500" />
                                      ) : (
                                        <FileText className="w-5 h-5 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{doc.name}</span>
                                        <StatusBadge status={doc.verificationStatus} />
                                        {docOcr && docOcr.status === 'completed' && docOcr.overallMatch && (
                                          <OcrMatchBadge match={docOcr.overallMatch} />
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span>{doc.documentType.replace(/_/g, ' ')}</span>
                                        <span className="text-slate-300">·</span>
                                        <span>{doc.fileName}</span>
                                        <span className="text-slate-300">·</span>
                                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                        <span className="text-slate-300">·</span>
                                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                        {docOcr && docOcr.status === 'completed' && docOcr.confidence !== undefined && (
                                          <>
                                            <span className="text-slate-300">·</span>
                                            <span className={`font-semibold ${
                                              docOcr.confidence >= 0.8 ? 'text-emerald-600' :
                                              docOcr.confidence >= 0.5 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                              OCR {Math.round(docOcr.confidence * 100)}%
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {doc.verificationRemarks && (
                                        <div className="mt-1 text-xs text-slate-600 italic flex items-start gap-1">
                                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                                          {doc.verificationRemarks}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                                    {/* Preview */}
                                    <button
                                      onClick={() => handlePreview(admin.adminId, doc, true)}
                                      disabled={loadingPreview === doc._id || !doc.hasFile}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                                      title="Preview document"
                                    >
                                      {loadingPreview === doc._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                                      Preview
                                    </button>

                                    {/* OCR Scan */}
                                    {ocrAvailable && doc.hasFile && (
                                      <button
                                        onClick={() => docOcr ? setExpandedOcr(isOcrExpanded ? null : doc._id) : handleOcrScan(admin.adminId, doc, true)}
                                        disabled={scanningDoc === doc._id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100"
                                        title={docOcr ? 'View OCR results' : 'Run OCR scan'}
                                      >
                                        {scanningDoc === doc._id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : docOcr ? (
                                          <FileSearch className="w-3.5 h-3.5" />
                                        ) : (
                                          <ScanLine className="w-3.5 h-3.5" />
                                        )}
                                        {docOcr ? 'OCR' : 'Scan'}
                                      </button>
                                    )}

                                    {/* Verify */}
                                    {doc.verificationStatus !== 'verified' && (
                                      <button
                                        onClick={() => handleUpdateStatus(admin.adminId, doc._id, 'verified', undefined, true)}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                        title="Mark as verified"
                                      >
                                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        Verify
                                      </button>
                                    )}

                                    {/* Reject */}
                                    {doc.verificationStatus !== 'rejected' && (
                                      <button
                                        onClick={() => setRemarksModal({ targetId: admin.adminId, docId: doc._id, action: 'rejected', isAdmin: true })}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                        title="Reject document"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Reject
                                      </button>
                                    )}

                                    {/* Request resubmit */}
                                    {doc.verificationStatus !== 'resubmit' && doc.verificationStatus !== 'verified' && (
                                      <button
                                        onClick={() => setRemarksModal({ targetId: admin.adminId, docId: doc._id, action: 'resubmit', isAdmin: true })}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                        title="Request resubmission"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Resubmit
                                      </button>
                                    )}

                                    {/* Reset to pending */}
                                    {doc.verificationStatus !== 'pending' && (
                                      <button
                                        onClick={() => handleUpdateStatus(admin.adminId, doc._id, 'pending', undefined, true)}
                                        disabled={isUpdating}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                        title="Reset to pending"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* OCR Results Panel (expandable) */}
                                {isOcrExpanded && docOcr && docOcr.status === 'completed' && renderOcrPanel(docOcr, admin.adminId, doc, true)}

                                {/* OCR unavailable/failed message */}
                                {isOcrExpanded && docOcr && (docOcr.status === 'unavailable' || docOcr.status === 'failed') && (
                                  <div className="border-t border-slate-200 bg-amber-50/50 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                      <span className="text-xs text-amber-700">{docOcr.message || docOcr.error || 'OCR scan could not be completed.'}</span>
                                      <button onClick={() => setExpandedOcr(null)} className="ml-auto p-1 hover:bg-amber-100 rounded-lg">
                                        <X className="w-3.5 h-3.5 text-amber-500" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Admin Pagination */}
        {!adminLoading && adminPagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setAdminPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={adminPagination.page <= 1}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {adminPagination.page} of {adminPagination.pages}
            </span>
            <button
              onClick={() => setAdminPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={adminPagination.page >= adminPagination.pages}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
        </>
        )}

        </>
        )}      </div>

      {/* Remarks Modal */}
      {remarksModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setRemarksModal(null); setRemarks(''); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">
                {remarksModal.action === 'rejected' ? 'Reject Document' : 'Request Resubmission'}
              </h3>
              <button onClick={() => { setRemarksModal(null); setRemarks(''); }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              {remarksModal.action === 'rejected'
                ? 'Please provide a reason for rejecting this document. The student will see this message.'
                : 'Please specify what needs to be corrected. The student will be asked to resubmit.'}
            </p>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRemarksModal(null); setRemarks(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRemarksSubmit}
                disabled={updatingDoc !== null}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 ${
                  remarksModal.action === 'rejected'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {updatingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : remarksModal.action === 'rejected' ? 'Reject' : 'Request Resubmit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewUrl && previewDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewDoc(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <span className="font-medium text-slate-800 text-sm truncate">{previewDoc.name}</span>
              <button onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewDoc(null); }} className="p-1.5 hover:bg-slate-200 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
              {previewDoc.mimeType?.includes('pdf') ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-[75vh] rounded-lg border border-slate-200"
                  aria-label={previewDoc.name}
                >
                  <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
                    <FileText className="w-12 h-12" />
                    <p>PDF preview not available in this browser.</p>
                    <a href={previewUrl} download={previewDoc.name} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Download PDF</a>
                  </div>
                </object>
              ) : previewDoc.mimeType?.startsWith('image/') ? (
                <img src={previewUrl} alt={previewDoc.name} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg" />
              ) : (
                <div className="text-center text-slate-500 py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="text-primary-600 text-sm mt-2 inline-block hover:underline">
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVerification;
