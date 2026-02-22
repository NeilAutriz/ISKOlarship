// ============================================================================
// ISKOlarship - Admin Profile Page
// Manage administrator profile and settings
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { 
  User,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Camera,
  Key,
  Bell,
  Lock,
  Building2,
  Award,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  History,
  FileText,
  Loader2,
  X,
  Briefcase,
  Landmark,
  Info,
  XCircle,
  RotateCcw,
  Clock,
  Upload,
  Eye
} from 'lucide-react';
import { userApi, API_SERVER_URL } from '../../services/apiClient';
import { 
  UPLBColleges, 
  UniversityUnits, 
  UPLBDepartments,
  getCollegeOptions, 
  getDepartmentOptions, 
  getUniversityUnitOptions,
  getAdminScopeDisplay,
  type UPLBCollegeCode
} from '../../utils/uplbStructure';

// API Response structure from backend for admin
interface AdminProfileData {
  _id: string;
  email: string;
  role: string;
  adminProfile: {
    firstName: string;
    middleName?: string;
    lastName: string;
    department: string;
    accessLevel: string;
    permissions: string[];
    college?: string;
    // New UPLB organizational codes
    collegeCode?: string;
    academicUnitCode?: string;
    universityUnitCode?: string;
    position?: string;
    officeLocation?: string;
    responsibilities?: string;
    address?: {
      street?: string;
      barangay?: string;
      city?: string;
      zipCode?: string;
      fullAddress?: string;
    };
    documents?: Array<{
      _id?: string;
      name?: string;
      documentType: string;
      fileName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      uploadedAt: string;
      verificationStatus?: 'pending' | 'verified' | 'rejected' | 'resubmit';
      verifiedAt?: string;
      verificationRemarks?: string;
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// Format access level for display
const formatAccessLevel = (level: string): string => {
  const levelMap: Record<string, string> = {
    'university': 'University Administrator',
    'college': 'College Administrator',
    'academic_unit': 'Academic Unit Administrator'
  };
  return levelMap[level?.toLowerCase()] || level || 'Unknown';
};

// Format date for display
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

// Verification status display helper
const getVerificationDisplay = (status?: string) => {
  switch (status) {
    case 'verified':
      return { label: 'Verified', color: 'emerald', icon: CheckCircle, bgClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'rejected':
      return { label: 'Rejected', color: 'red', icon: XCircle, bgClass: 'bg-red-100 text-red-700 border-red-200' };
    case 'resubmit':
      return { label: 'Resubmit Required', color: 'amber', icon: RotateCcw, bgClass: 'bg-amber-100 text-amber-700 border-amber-200' };
    default:
      return { label: 'Pending Review', color: 'slate', icon: Clock, bgClass: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
};

const AdminProfile: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'documents'>('profile');
  const [admin, setAdmin] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [reuploadingDoc, setReuploadingDoc] = useState<string | null>(null);

  // Fetch admin profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await userApi.getProfile();
        
        if (response.success && response.data) {
          // Cast to AdminProfileData since we're on admin page
          setAdmin(response.data as unknown as AdminProfileData);
        } else {
          setError('Failed to load profile data');
        }
      } catch (err: any) {
        console.error('Error fetching admin profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Load document preview with authentication
  const loadDocumentPreview = async (document: any) => {
    try {
      setLoadingPreview(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.warning('Authentication required. Please log in again.');
        return;
      }

      // Fetch the file content streamed through the backend
      const url = `${API_SERVER_URL}/api/users/documents/${document._id}`;
      
      const fileRes = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!fileRes.ok) {
        const errorData = await fileRes.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${fileRes.status}`);
      }

      const responseBlob = await fileRes.blob();
      // Explicitly type the blob so the PDF viewer recognises the format
      const fetchedType = fileRes.headers.get('content-type');
      // Cloudinary raw resources return 'application/octet-stream' — ignore it
      const contentType = (fetchedType && fetchedType !== 'application/octet-stream')
        ? fetchedType
        : document.mimeType || 'application/octet-stream';
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

  // Clean up preview URL when modal closes
  useEffect(() => {
    if (!isPreviewOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [isPreviewOpen]);

  // Handle document reupload (replace existing file)
  const handleDocumentReupload = async (e: React.ChangeEvent<HTMLInputElement>, doc: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.warning('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.warning('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    try {
      setReuploadingDoc(doc._id);

      const { reuploadDocument } = await import('../../services/documentUpload');
      const result = await reuploadDocument(doc._id, file);

      if (result.success) {
        // Refresh profile to get updated documents
        const profileResponse = await userApi.getProfile();
        if (profileResponse.success && profileResponse.data) {
          setAdmin(profileResponse.data as unknown as AdminProfileData);
        }
        toast.success('Document reuploaded successfully! It will be reviewed again.');
      } else {
        toast.error(result.message || 'Failed to reupload document');
      }
    } catch (error: any) {
      console.error('Document reupload error:', error);
      toast.error(error.message || 'Failed to reupload document');
    } finally {
      setReuploadingDoc(null);
      e.target.value = '';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-slate-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Profile</h2>
          <p className="text-slate-600 mb-4">{error || 'Profile data not found'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Helper to access admin profile data
  const ap = admin.adminProfile;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-primary-600">
        {/* UPLB Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://international.uplb.edu.ph/wp-content/uploads/2022/02/M40A9936-min-scaled.jpg"
            alt="UPLB Campus"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 via-primary-700/90 to-primary-800/90" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-white to-slate-100 flex items-center justify-center text-primary-600 font-bold text-3xl shadow-lg shadow-primary-900/30 border-2 border-white/20">
                {ap?.firstName?.[0] || 'A'}{ap?.lastName?.[0] || 'D'}
              </div>
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <Shield className="w-4 h-4 text-primary-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 backdrop-blur-sm border border-white/30">
                  <Shield className="w-3 h-3" />{formatAccessLevel(ap?.accessLevel || '')}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{ap?.firstName} {ap?.lastName}</h1>
              <p className="text-white/80 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {ap?.department} {ap?.college ? `• ${ap.college}` : ''}
              </p>
            </div>

            <button 
              onClick={() => {
                setEditFormData({
                  firstName: ap?.firstName || '',
                  middleName: ap?.middleName || '',
                  lastName: ap?.lastName || '',
                  department: ap?.department || '',
                  college: ap?.college || '',
                  // New UPLB organizational fields
                  accessLevel: ap?.accessLevel || 'university',
                  collegeCode: ap?.collegeCode || '',
                  academicUnitCode: ap?.academicUnitCode || '',
                  universityUnitCode: ap?.universityUnitCode || '',
                  position: ap?.position || '',
                  officeLocation: ap?.officeLocation || '',
                  responsibilities: ap?.responsibilities || '',
                  address: {
                    street: ap?.address?.street || '',
                    barangay: ap?.address?.barangay || '',
                    city: ap?.address?.city || '',
                    zipCode: ap?.address?.zipCode || '',
                    fullAddress: ap?.address?.fullAddress || ''
                  }
                });
                setIsEditModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg"
            >
              <Edit3 className="w-4 h-4" />Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Administrator Account</h3>
                <p className="text-sm text-slate-500">Last updated: {formatDate(admin.updatedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />Account Active
              </span>
              <span className="px-3 py-1.5 bg-primary-100 text-primary-700 text-sm font-medium rounded-full flex items-center gap-1.5">
                <Key className="w-4 h-4" />2FA Enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app pb-12">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-6">
              <nav className="space-y-1">
                {[
                  { id: 'profile', label: 'Profile Info', icon: User },
                  { id: 'security', label: 'Security', icon: Lock },
                  { id: 'documents', label: 'Documents', icon: FileText },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeSection === item.id ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {activeSection === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Information */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Profile Information</h2>
                  </div>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {[
                    { label: 'First Name', value: ap?.firstName || 'N/A', icon: User },
                    { label: 'Middle Name', value: ap?.middleName || 'N/A', icon: User },
                    { label: 'Last Name', value: ap?.lastName || 'N/A', icon: User },
                    { label: 'Email Address', value: admin.email, icon: Mail },
                    { label: 'Access Level', value: formatAccessLevel(ap?.accessLevel || ''), icon: Shield },
                    { 
                      label: 'Organizational Scope', 
                      value: getAdminScopeDisplay(
                        (ap?.accessLevel || 'university') as 'university' | 'college' | 'academic_unit',
                        ap?.collegeCode || null,
                        ap?.academicUnitCode || null
                      ), 
                      icon: Landmark 
                    },
                    { 
                      label: 'College', 
                      value: ap?.collegeCode 
                        ? `${ap.collegeCode} - ${UPLBColleges[ap.collegeCode as UPLBCollegeCode]?.name || ap.college}` 
                        : 'University-wide', 
                      icon: Building2 
                    },
                    { 
                      label: 'Academic Unit', 
                      value: ap?.academicUnitCode 
                        ? `${ap.academicUnitCode} - ${UPLBDepartments[ap.collegeCode as UPLBCollegeCode]?.find(d => d.code === ap.academicUnitCode)?.name || ap.academicUnitCode}` 
                        : (ap?.universityUnitCode 
                          ? `${ap.universityUnitCode} - ${UniversityUnits.find(u => u.code === ap.universityUnitCode)?.name}` 
                          : 'N/A'), 
                      icon: Building2 
                    },
                    { label: 'Position', value: ap?.position || 'N/A', icon: Briefcase },
                    { label: 'Office Location', value: ap?.officeLocation || 'N/A', icon: MapPin },
                    { label: 'Member Since', value: formatDate(admin.createdAt), icon: Calendar },
                  ].map((field, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <field.icon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-0.5">{field.label}</div>
                        <div className="font-medium text-slate-900">{field.value}</div>
                      </div>
                    </div>
                  ))}
                  {ap?.responsibilities && (
                    <div className="md:col-span-2 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-0.5">Responsibilities</div>
                        <div className="font-medium text-slate-900">{ap.responsibilities}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Security Settings</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-slate-500" />
                        <div className="text-left">
                          <div className="font-medium text-slate-900">Change Password</div>
                          <div className="text-sm text-slate-500">Update your account password</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-slate-500" />
                        <div className="text-left">
                          <div className="font-medium text-slate-900">Two-Factor Authentication</div>
                          <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" />Enabled</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-slate-500" />
                        <div className="text-left">
                          <div className="font-medium text-slate-900">Notification Preferences</div>
                          <div className="text-sm text-slate-500">Manage email and push notifications</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            {activeSection === 'documents' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Uploaded Documents</h2>
                    <p className="text-sm text-slate-500">Your verification documents</p>
                  </div>
                </div>
                <div className="p-6">
                  {!ap?.documents || ap.documents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Documents Uploaded</h3>
                      <p className="text-slate-500 mb-4">You haven't uploaded any verification documents yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ap.documents.map((doc: any, index: number) => {
                        const fileSize = (doc.fileSize / 1024).toFixed(2);
                        const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        const verification = getVerificationDisplay(doc.verificationStatus);
                        const VerifIcon = verification.icon;
                        
                        return (
                          <div key={doc._id || index} className={`p-4 rounded-xl transition-all border ${
                            doc.verificationStatus === 'verified'
                              ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                              : doc.verificationStatus === 'rejected'
                              ? 'bg-red-50/50 border-red-200 hover:bg-red-50'
                              : doc.verificationStatus === 'resubmit'
                              ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border-2 ${
                                  doc.verificationStatus === 'verified'
                                    ? 'bg-emerald-50 border-emerald-300'
                                    : doc.verificationStatus === 'rejected'
                                    ? 'bg-red-50 border-red-300'
                                    : doc.verificationStatus === 'resubmit'
                                    ? 'bg-amber-50 border-amber-300'
                                    : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400'
                                }`}>
                                  {doc.verificationStatus === 'verified'
                                    ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                                    : doc.verificationStatus === 'rejected'
                                    ? <XCircle className="w-6 h-6 text-red-500" />
                                    : doc.verificationStatus === 'resubmit'
                                    ? <RotateCcw className="w-6 h-6 text-amber-500" />
                                    : <FileText className="w-6 h-6 text-white" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-slate-900 mb-0.5 truncate">
                                    {doc.name || doc.documentType.replace('_', ' ').toUpperCase()}
                                  </div>
                                  <div className="text-sm text-slate-600 truncate mb-1">{doc.fileName}</div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {uploadDate}
                                    </span>
                                    <span>•</span>
                                    <span>{fileSize} KB</span>
                                    <span>•</span>
                                    <span className="uppercase">{doc.mimeType.split('/')[1]}</span>
                                  </div>
                                  {/* Verification remarks */}
                                  {doc.verificationRemarks && (doc.verificationStatus === 'rejected' || doc.verificationStatus === 'resubmit') && (
                                    <div className={`mt-2 text-xs px-2 py-1 rounded ${
                                      doc.verificationStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      <strong>Remarks:</strong> {doc.verificationRemarks}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {/* Verification Status Badge */}
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${verification.bgClass}`}>
                                  <VerifIcon className="w-3.5 h-3.5" />
                                  {verification.label}
                                </span>
                                {/* View button */}
                                <button
                                  onClick={() => loadDocumentPreview(doc)}
                                  disabled={loadingPreview}
                                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                                  title="View document"
                                >
                                  {loadingPreview && previewDoc?._id === doc._id ? (
                                    <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-slate-600" />
                                  )}
                                </button>
                                {/* Reupload button — show for rejected, resubmit, or pending docs */}
                                {doc.verificationStatus !== 'verified' && (
                                  <label
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg text-xs cursor-pointer transition-all ${
                                      doc.verificationStatus === 'rejected'
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : doc.verificationStatus === 'resubmit'
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    } ${reuploadingDoc === doc._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={doc.verificationStatus === 'rejected' || doc.verificationStatus === 'resubmit' ? 'Reupload to address feedback' : 'Replace with a new file'}
                                  >
                                    {reuploadingDoc === doc._id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-3.5 h-3.5" />
                                        Reupload
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                      disabled={reuploadingDoc === doc._id}
                                      onChange={(e) => handleDocumentReupload(e, doc)}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 bg-primary-600 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-lg text-white">Edit Profile</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {saveError}
                </div>
              )}

              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-600" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={editFormData.firstName}
                        onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={editFormData.middleName}
                        onChange={(e) => setEditFormData({...editFormData, middleName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Work Information - UPLB Organizational Structure */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary-600" />
                    Organizational Assignment
                  </h4>
                  
                  {/* Access Level Description */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <strong>Access Level</strong> determines your administrative scope:
                        <ul className="mt-1 ml-4 list-disc text-blue-700">
                          <li><strong>University</strong> - Manage scholarships across UPLB</li>
                          <li><strong>College</strong> - Manage scholarships for a specific college</li>
                          <li><strong>Academic Unit</strong> - Manage scholarships for a specific department/institute</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Access Level Selection */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Access Level *</label>
                      <select
                        value={editFormData.accessLevel}
                        onChange={(e) => {
                          const newLevel = e.target.value;
                          setEditFormData({
                            ...editFormData, 
                            accessLevel: newLevel,
                            // Reset dependent fields when access level changes
                            collegeCode: '',
                            academicUnitCode: '',
                            universityUnitCode: newLevel === 'university' ? editFormData.universityUnitCode : ''
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        <option value="university">🏛️ University Level - UPLB-wide access</option>
                        <option value="college">🎓 College Level - Specific college access</option>
                        <option value="academic_unit">📚 Academic Unit Level - Specific department/institute access</option>
                      </select>
                    </div>

                    {/* University Unit - Only for University level */}
                    {editFormData.accessLevel === 'university' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          University Office/Unit <span className="text-slate-400">(optional)</span>
                        </label>
                        <select
                          value={editFormData.universityUnitCode}
                          onChange={(e) => setEditFormData({...editFormData, universityUnitCode: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="">-- No specific unit --</option>
                          {getUniversityUnitOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <p className="text-slate-400 text-xs mt-1">Select if you're assigned to a specific administrative office</p>
                      </div>
                    )}

                    {/* College Selection - For College and Academic Unit levels */}
                    {(editFormData.accessLevel === 'college' || editFormData.accessLevel === 'academic_unit') && (
                      <div className={editFormData.accessLevel === 'college' ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          College * 
                        </label>
                        <select
                          value={editFormData.collegeCode}
                          onChange={(e) => {
                            setEditFormData({
                              ...editFormData, 
                              collegeCode: e.target.value,
                              // Reset academic unit when college changes
                              academicUnitCode: ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          required
                        >
                          <option value="">-- Select College --</option>
                          {getCollegeOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {editFormData.accessLevel === 'college' && (
                          <p className="text-slate-400 text-xs mt-1">You'll have administrative access to all scholarships in this college</p>
                        )}
                      </div>
                    )}

                    {/* Academic Unit Selection - Only for Academic Unit level */}
                    {editFormData.accessLevel === 'academic_unit' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Department/Institute *
                        </label>
                        <select
                          value={editFormData.academicUnitCode}
                          onChange={(e) => setEditFormData({...editFormData, academicUnitCode: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                          required
                          disabled={!editFormData.collegeCode}
                        >
                          <option value="">
                            {editFormData.collegeCode ? '-- Select Department --' : '-- Select College First --'}
                          </option>
                          {editFormData.collegeCode && getDepartmentOptions(editFormData.collegeCode as UPLBCollegeCode).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <p className="text-slate-400 text-xs mt-1">You'll have administrative access to scholarships in this academic unit</p>
                      </div>
                    )}

                    {/* Current Assignment Display */}
                    {editFormData.accessLevel && (
                      <div className="md:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="w-4 h-4 text-primary-600" />
                          <span className="font-medium text-slate-700">Current Scope:</span>
                          <span className="text-slate-900">
                            {getAdminScopeDisplay(
                              editFormData.accessLevel as 'university' | 'college' | 'academic_unit',
                              editFormData.collegeCode || null,
                              editFormData.academicUnitCode || null
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Position & Location */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-primary-600" />
                    Position Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Position *</label>
                      <select
                        value={editFormData.position}
                        onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Position</option>
                        <option value="Chancellor">Chancellor</option>
                        <option value="Vice Chancellor">Vice Chancellor</option>
                        <option value="Dean">Dean</option>
                        <option value="Associate Dean">Associate Dean</option>
                        <option value="Assistant Dean">Assistant Dean</option>
                        <option value="Director">Director</option>
                        <option value="Assistant Director">Assistant Director</option>
                        <option value="Chief">Chief</option>
                        <option value="Head">Head</option>
                        <option value="Coordinator">Coordinator</option>
                        <option value="Scholarship Coordinator">Scholarship Coordinator</option>
                        <option value="Financial Aid Officer">Financial Aid Officer</option>
                        <option value="Student Affairs Officer">Student Affairs Officer</option>
                        <option value="Academic Advisor">Academic Advisor</option>
                        <option value="Program Manager">Program Manager</option>
                        <option value="Administrative Officer">Administrative Officer</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Office Location</label>
                      <input
                        type="text"
                        value={editFormData.officeLocation}
                        onChange={(e) => setEditFormData({...editFormData, officeLocation: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="e.g., Room 201, Admin Building"
                      />
                      <p className="text-slate-400 text-xs mt-1">Optional: Where students can find you</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Responsibilities</label>
                      <textarea
                        rows={3}
                        value={editFormData.responsibilities}
                        onChange={(e) => setEditFormData({...editFormData, responsibilities: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Describe your main responsibilities..."
                      />
                    </div>
                  </div>
                </div>


              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setSaving(true);
                    setSaveError(null);
                    
                    // Prepare update data
                    const updateData = {
                      adminProfile: {
                        firstName: editFormData.firstName,
                        middleName: editFormData.middleName,
                        lastName: editFormData.lastName,
                        // New UPLB organizational fields
                        accessLevel: editFormData.accessLevel,
                        collegeCode: editFormData.collegeCode || undefined,
                        academicUnitCode: editFormData.academicUnitCode || undefined,
                        universityUnitCode: editFormData.universityUnitCode || undefined,
                        // Legacy fields for backwards compatibility - auto-populated from codes
                        academicUnit: editFormData.academicUnitCode 
                          ? UPLBDepartments[editFormData.collegeCode as UPLBCollegeCode]?.find(d => d.code === editFormData.academicUnitCode)?.name 
                          : (editFormData.universityUnitCode 
                            ? UniversityUnits.find(u => u.code === editFormData.universityUnitCode)?.name 
                            : ''),
                        college: editFormData.collegeCode 
                          ? UPLBColleges[editFormData.collegeCode as UPLBCollegeCode]?.name 
                          : undefined,
                        position: editFormData.position,
                        officeLocation: editFormData.officeLocation,
                        responsibilities: editFormData.responsibilities,
                        address: editFormData.address
                      }
                    };

                    const response = await userApi.updateProfile(updateData);
                    
                    if (response.success) {
                      // Refresh profile data
                      const profileResponse = await userApi.getProfile();
                      if (profileResponse.success && profileResponse.data) {
                        setAdmin(profileResponse.data as unknown as AdminProfileData);
                      }
                      
                      setIsEditModalOpen(false);
                    } else {
                      setSaveError(response.message || 'Failed to update profile');
                    }
                  } catch (err: any) {
                    console.error('Error updating profile:', err);
                    setSaveError(err.response?.data?.message || err.message || 'Failed to update profile');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {previewDoc?.name || previewDoc?.documentType.replace('_', ' ').toUpperCase()}
                </h3>
                <p className="text-sm text-slate-600 mt-1">{previewDoc?.fileName}</p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              {previewDoc?.mimeType?.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt={previewDoc.fileName}
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                />
              ) : previewDoc?.mimeType === 'application/pdf' ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-full min-h-[600px] rounded-lg shadow-lg"
                  aria-label={previewDoc.fileName}
                >
                  <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
                    <FileText className="w-12 h-12" />
                    <p>PDF preview not available in this browser.</p>
                    <a href={previewUrl} download={previewDoc.fileName} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Download PDF</a>
                  </div>
                </object>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Preview not available for this file type</p>
                    <a
                      href={previewUrl}
                      download={previewDoc?.fileName}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Download File
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <a
                href={previewUrl}
                download={previewDoc?.fileName}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
