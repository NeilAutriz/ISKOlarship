// ============================================================================
// ISKOlarship - Student Profile Page
// Manage student profile and academic information
// ============================================================================

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  User,
  GraduationCap,
  Wallet,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  Building2,
  Edit3,
  Camera,
  CheckCircle,
  ChevronRight,
  Upload,
  Shield,
  Loader2,
  AlertCircle,
  X,
  Eye,
  Download,
  Clock,
  XCircle,
  RotateCcw,
  MessageSquare,
  Bell
} from 'lucide-react';
import { userApi, API_SERVER_URL } from '../../services/apiClient';

// API Response structure from backend
interface StudentProfileData {
  _id: string;
  email: string;
  role: string;
  studentProfile: {
    studentNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    homeAddress?: {
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
      zipCode?: string;
      fullAddress?: string;
    };
    provinceOfOrigin?: string;
    citizenship?: string;
    college: string;
    course: string;
    major?: string;
    classification: string;
    gwa: number;
    unitsEnrolled?: number;
    unitsPassed?: number;
    stBracket?: string;
    hasThesisGrant?: boolean;
    hasApprovedThesisOutline?: boolean;
    hasDisciplinaryAction?: boolean;
    hasExistingScholarship?: boolean;
    profileCompleted?: boolean;
    annualFamilyIncome?: number;
    householdSize?: number;
    contactNumber?: string;
    documents?: Document[];
  };
  createdAt?: string;
  updatedAt?: string;
}

// Format income as currency
const formatIncome = (income: number): string => {
  if (income >= 1000000) {
    return `₱${(income / 1000000).toFixed(1)}M`;
  } else if (income >= 1000) {
    return `₱${(income / 1000).toFixed(0)}K`;
  }
  return `₱${income.toLocaleString()}`;
};

// Format year level/classification for display
const formatYearLevel = (classification: string): string => {
  const yearMap: Record<string, string> = {
    'freshman': '1st Year',
    'sophomore': '2nd Year',
    'junior': '3rd Year',
    'senior': '4th Year'
  };
  return yearMap[classification.toLowerCase()] || classification;
};

// Get ST Bracket display name
const getSTBracketDisplay = (bracket?: string): string => {
  if (!bracket) return 'Not Set';
  const bracketMap: Record<string, string> = {
    'Full Discount with Stipend': 'Full Discount with Stipend',
    'Full Discount': 'Full Discount',
    'PD80': '80% Partial Discount',
    'PD60': '60% Partial Discount',
    'PD40': '40% Partial Discount',
    'PD20': '20% Partial Discount',
    'No Discount': 'No Discount'
  };
  return bracketMap[bracket] || bracket;
};

// Document type from API
interface Document {
  _id: string;
  name: string;
  documentType: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  url?: string; // Legacy field
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'resubmit';
  verifiedAt?: string;
  verificationRemarks?: string;
}

// Document status helper
const getDocumentStatus = (doc: Document | undefined): 'completed' | 'pending' => {
  return doc ? 'completed' : 'pending';
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

// Required documents list
const REQUIRED_DOCUMENTS = [
  { type: 'student_id', name: 'Student ID / Proof of Enrollment' },
  { type: 'latest_grades', name: 'Latest Grades / Transcript' },
  { type: 'certificate_of_registration', name: 'Certificate of Registration (Current Semester)' },
];

const StudentProfile: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'personal' | 'academic' | 'financial' | 'documents' | 'notifications'>('personal');
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [reuploadingDoc, setReuploadingDoc] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({ emailEnabled: true, applicationUpdates: true, documentUpdates: true });
  const [notifLoading, setNotifLoading] = useState(false);

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [profileResponse, completenessResponse] = await Promise.all([
          userApi.getProfile(),
          userApi.getProfileCompleteness()
        ]);
        
        if (profileResponse.success && profileResponse.data) {
          // Cast to our expected structure
          const profileData = profileResponse.data as unknown as StudentProfileData;
          setProfile(profileData);
          
          // Load documents from profile
          if (profileData.studentProfile?.documents) {
            setDocuments(profileData.studentProfile.documents as any);
          }
        } else {
          setError('Failed to load profile data');
        }
        
        if (completenessResponse.success && completenessResponse.data) {
          setProfileCompletion(completenessResponse.data.percentage);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Fetch notification preferences
  useEffect(() => {
    const fetchNotifPrefs = async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/api/users/notification-preferences`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const data = await res.json();
        if (data.success) {
          setNotifPrefs(data.data);
        }
      } catch {
        // Silently fail — defaults are fine
      }
    };
    fetchNotifPrefs();
  }, []);

  const updateNotifPref = async (key: string, value: boolean) => {
    const prev = { ...notifPrefs };
    const updated = { ...notifPrefs, [key]: value };
    // If master toggle is off, disable sub-toggles in the UI
    if (key === 'emailEnabled' && !value) {
      updated.applicationUpdates = false;
      updated.documentUpdates = false;
    }
    setNotifPrefs(updated);
    setNotifLoading(true);
    try {
      const res = await fetch(`${API_SERVER_URL}/api/users/notification-preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(key === 'emailEnabled' && !value
          ? { emailEnabled: false, applicationUpdates: false, documentUpdates: false }
          : { [key]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifPrefs(data.data);
        toast.success('Notification preferences updated');
      } else {
        setNotifPrefs(prev);
        toast.error('Failed to update preferences');
      }
    } catch {
      setNotifPrefs(prev);
      toast.error('Failed to update preferences');
    } finally {
      setNotifLoading(false);
    }
  };

  // Load document preview with authentication (backend streams file from Cloudinary)
  const loadDocumentPreview = async (document: Document) => {
    try {
      setLoadingPreview(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.warning('Authentication required. Please log in again.');
        return;
      }

      // Fetch the file content streamed through the backend
      const response = await fetch(`${API_SERVER_URL}/api/users/documents/${document._id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${response.status}`);
      }

      const responseBlob = await response.blob();
      // Explicitly type the blob so the PDF viewer recognises the format
      const fetchedType = response.headers.get('content-type');
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

  // Handle document download
  const handleDownloadDocument = async (doc: Document) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.warning('Authentication required');
        return;
      }

      // Get the file from the backend (streams from Cloudinary)
      const response = await fetch(`${API_SERVER_URL}/api/users/documents/${doc._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download document');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string, docName: string) => {
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
      setUploadingDoc(docType);
      
      // Import upload function
      const { uploadDocuments } = await import('../../services/documentUpload');
      
      // Upload document
      const result = await uploadDocuments([{
        file,
        name: docName,
        type: docType
      }]);

      if (result.success) {
        // Refresh profile to get updated documents
        const profileResponse = await userApi.getProfile();
        if (profileResponse.success && profileResponse.data) {
          const profileData = profileResponse.data as unknown as StudentProfileData;
          setProfile(profileData);
          if (profileData.studentProfile?.documents) {
            setDocuments(profileData.studentProfile.documents as any);
          }
        }
        toast.success('Document uploaded successfully!');
      } else {
        toast.error(result.message || 'Failed to upload document');
      }
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
      // Clear the input
      e.target.value = '';
    }
  };

  // Handle document reupload (replace existing file)
  const handleDocumentReupload = async (e: React.ChangeEvent<HTMLInputElement>, doc: Document) => {
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
          const profileData = profileResponse.data as unknown as StudentProfileData;
          setProfile(profileData);
          if (profileData.studentProfile?.documents) {
            setDocuments(profileData.studentProfile.documents as any);
          }
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
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Profile</h2>
          <p className="text-slate-600 mb-4">{error || 'Profile data not found'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Format address for display
  const formatAddress = () => {
    const addr = profile.studentProfile?.homeAddress;
    if (addr) {
      if (addr.fullAddress) return addr.fullAddress;
      const parts = [
        addr.street,
        addr.barangay,
        addr.city,
        addr.province
      ].filter(Boolean);
      return parts.join(', ') || 'Not provided';
    }
    return 'Not provided';
  };

  // Helper to access student profile data
  const sp = profile.studentProfile;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(30, 58, 138, 0.88), rgba(29, 78, 216, 0.92)), url('https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/UPLB_Academic_Heritage_Monument%2C_June_2023.jpg/2560px-UPLB_Academic_Heritage_Monument%2C_June_2023.jpg')`
        }}
      >
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-white to-slate-100 flex items-center justify-center text-primary-600 font-bold text-3xl shadow-lg shadow-primary-900/30 border-2 border-white/20">
                {sp?.firstName?.[0] || 'S'}{sp?.lastName?.[0] || 'T'}
              </div>
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <GraduationCap className="w-4 h-4 text-primary-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wide">Student Profile</span>
                {sp?.profileCompleted && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-100 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />Verified
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{sp?.firstName} {sp?.lastName}</h1>
              <p className="text-primary-100 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                {sp?.course} • {formatYearLevel(sp?.classification || '')}
              </p>
            </div>

            <button 
              onClick={() => {
                setEditFormData({
                  firstName: sp?.firstName || '',
                  lastName: sp?.lastName || '',
                  middleName: sp?.middleName || '',
                  studentNumber: sp?.studentNumber || '',
                  college: sp?.college || '',
                  course: sp?.course || '',
                  major: sp?.major || '',
                  classification: sp?.classification || '',
                  gwa: sp?.gwa || '',
                  unitsEnrolled: sp?.unitsEnrolled || '',
                  unitsPassed: sp?.unitsPassed || '',
                  annualFamilyIncome: sp?.annualFamilyIncome || '',
                  householdSize: sp?.householdSize || '',
                  stBracket: sp?.stBracket || '',
                  provinceOfOrigin: sp?.provinceOfOrigin || '',
                  contactNumber: sp?.contactNumber || '',
                  citizenship: sp?.citizenship || '',
                  hasExistingScholarship: sp?.hasExistingScholarship ?? false,
                  hasThesisGrant: sp?.hasThesisGrant ?? false,
                  hasDisciplinaryAction: sp?.hasDisciplinaryAction ?? false,
                  homeAddress: {
                    street: sp?.homeAddress?.street || '',
                    barangay: sp?.homeAddress?.barangay || '',
                    city: sp?.homeAddress?.city || '',
                    province: sp?.homeAddress?.province || '',
                    zipCode: sp?.homeAddress?.zipCode || '',
                    fullAddress: sp?.homeAddress?.fullAddress || ''
                  }
                });
                setIsEditModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg"
            >
              <Edit3 className="w-4 h-4" />Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Completion */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Profile Completion</h3>
                <p className="text-sm text-slate-500">Complete your profile to increase scholarship matches</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
              <span className="font-bold text-primary-600">{profileCompletion}%</span>
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
                  { id: 'personal', label: 'Personal Info', icon: User },
                  { id: 'academic', label: 'Academic Info', icon: GraduationCap },
                  { id: 'financial', label: 'Financial Info', icon: Wallet },
                  { id: 'documents', label: 'Documents', icon: FileText },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeSection === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
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
            {/* Personal Information */}
            {activeSection === 'personal' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Personal Information</h2>
                  </div>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {[
                    { label: 'Full Name', value: `${sp?.firstName || ''} ${sp?.middleName ? sp.middleName + ' ' : ''}${sp?.lastName || ''}`.trim(), icon: User },
                    { label: 'Email Address', value: profile.email, icon: Mail },
                    { label: 'Phone Number', value: sp?.contactNumber || 'Not provided', icon: Phone },
                    { label: 'Address', value: formatAddress(), icon: MapPin },
                    { label: 'Province of Origin', value: sp?.provinceOfOrigin || 'Not provided', icon: MapPin },
                    { label: 'Student Number', value: sp?.studentNumber || 'N/A', icon: Award },
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
                </div>
              </div>
            )}

            {/* Academic Information */}
            {activeSection === 'academic' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Academic Information</h2>
                  </div>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {[
                    { label: 'University', value: 'University of the Philippines Los Baños', icon: Building2 },
                    { label: 'College', value: sp?.college || 'N/A', icon: Building2 },
                    { label: 'Course', value: sp?.course || 'N/A', icon: BookOpen },
                    { label: 'Major', value: sp?.major || 'N/A', icon: BookOpen },
                    { label: 'Year Level', value: formatYearLevel(sp?.classification || ''), icon: GraduationCap },
                    { label: 'GWA', value: sp?.gwa?.toFixed(2) || 'Not provided', icon: Award },
                    { label: 'Units Enrolled', value: sp?.unitsEnrolled?.toString() || 'N/A', icon: BookOpen },
                    { label: 'Units Passed', value: sp?.unitsPassed?.toString() || 'N/A', icon: BookOpen },
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
                </div>
              </div>
            )}

            {/* Financial Information */}
            {activeSection === 'financial' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Financial Information</h2>
                  </div>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {[
                    { label: 'Annual Family Income', value: sp?.annualFamilyIncome ? formatIncome(sp.annualFamilyIncome) : 'Not provided', icon: Wallet },
                    { label: 'Household Size', value: sp?.householdSize ? `${sp.householdSize} members` : 'Not provided', icon: User },
                    { label: 'ST Bracket', value: getSTBracketDisplay(sp?.stBracket), icon: Award },
                    { label: 'Has Existing Scholarship', value: sp?.hasExistingScholarship ? 'Yes' : 'No', icon: Award },
                    { label: 'Has Thesis Grant', value: sp?.hasThesisGrant ? 'Yes' : 'No', icon: FileText },
                    { label: 'Approved Thesis Outline', value: sp?.hasApprovedThesisOutline ? 'Yes' : 'No', icon: FileText },
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
                </div>
              </div>
            )}

            {/* Documents */}
            {activeSection === 'documents' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Documents</h2>
                      <p className="text-sm text-slate-600">{documents.length} of {REQUIRED_DOCUMENTS.length} required documents uploaded</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {REQUIRED_DOCUMENTS.map((reqDoc) => {
                      const uploadedDoc = documents.find(d => d.documentType === reqDoc.type);
                      const status = getDocumentStatus(uploadedDoc);
                      const verification = uploadedDoc ? getVerificationDisplay(uploadedDoc.verificationStatus) : null;
                      const VerifIcon = verification?.icon;
                      
                      return (
                        <div key={reqDoc.type} className={`p-4 rounded-xl transition-all border ${
                          uploadedDoc
                            ? uploadedDoc.verificationStatus === 'verified'
                              ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                              : uploadedDoc.verificationStatus === 'rejected'
                              ? 'bg-red-50/50 border-red-200 hover:bg-red-50'
                              : uploadedDoc.verificationStatus === 'resubmit'
                              ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                                uploadedDoc
                                  ? uploadedDoc.verificationStatus === 'verified'
                                    ? 'bg-emerald-50 border-emerald-300'
                                    : uploadedDoc.verificationStatus === 'rejected'
                                    ? 'bg-red-50 border-red-300'
                                    : uploadedDoc.verificationStatus === 'resubmit'
                                    ? 'bg-amber-50 border-amber-300'
                                    : 'bg-green-50 border-green-200'
                                  : 'bg-white border-slate-200'
                              }`}>
                                {uploadedDoc ? (
                                  uploadedDoc.verificationStatus === 'verified'
                                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    : uploadedDoc.verificationStatus === 'rejected'
                                    ? <XCircle className="w-5 h-5 text-red-500" />
                                    : uploadedDoc.verificationStatus === 'resubmit'
                                    ? <RotateCcw className="w-5 h-5 text-amber-500" />
                                    : <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-slate-900">{reqDoc.name}</div>
                                {uploadedDoc ? (
                                  <div className="text-sm text-slate-500">
                                    {uploadedDoc.fileName} • {(uploadedDoc.fileSize / 1024).toFixed(1)} KB • 
                                    Uploaded {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <div className="text-sm text-amber-600">Not uploaded</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-0 sm:ml-2">
                              {uploadedDoc ? (
                                <>
                                  {/* Verification Status Badge */}
                                  {verification && VerifIcon && (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${verification.bgClass}`}>
                                      <VerifIcon className="w-3.5 h-3.5" />
                                      {verification.label}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => loadDocumentPreview(uploadedDoc)}
                                    disabled={loadingPreview}
                                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                                    title="View document"
                                  >
                                    {loadingPreview && previewDoc?._id === uploadedDoc._id ? (
                                      <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-slate-600" />
                                    )}
                                  </button>
                                  {/* Reupload button — show for rejected, resubmit, or pending docs */}
                                  {uploadedDoc.verificationStatus !== 'verified' && (
                                    <label
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg text-xs cursor-pointer transition-all ${
                                        uploadedDoc.verificationStatus === 'rejected'
                                          ? 'bg-red-600 text-white hover:bg-red-700'
                                          : uploadedDoc.verificationStatus === 'resubmit'
                                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                      } ${reuploadingDoc === uploadedDoc._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title={uploadedDoc.verificationStatus === 'rejected' || uploadedDoc.verificationStatus === 'resubmit' ? 'Reupload to address feedback' : 'Replace with a new file'}
                                    >
                                      {reuploadingDoc === uploadedDoc._id ? (
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
                                        disabled={reuploadingDoc === uploadedDoc._id}
                                        onChange={(e) => handleDocumentReupload(e, uploadedDoc)}
                                      />
                                    </label>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Pending
                                  </span>
                                  <label className={`inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white font-medium rounded-lg text-sm hover:bg-primary-700 transition-all cursor-pointer ${uploadingDoc === reqDoc.type ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {uploadingDoc === reqDoc.type ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4" />
                                        Upload
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                      disabled={uploadingDoc === reqDoc.type}
                                      onChange={(e) => handleDocumentUpload(e, reqDoc.type, reqDoc.name)}
                                    />
                                  </label>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Rejection/Resubmit remarks */}
                          {uploadedDoc && uploadedDoc.verificationRemarks && (uploadedDoc.verificationStatus === 'rejected' || uploadedDoc.verificationStatus === 'resubmit') && (
                            <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${
                              uploadedDoc.verificationStatus === 'rejected'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-amber-50 border-amber-200'
                            }`}>
                              <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                uploadedDoc.verificationStatus === 'rejected' ? 'text-red-400' : 'text-amber-400'
                              }`} />
                              <div>
                                <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${
                                  uploadedDoc.verificationStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'
                                }`}>
                                  {uploadedDoc.verificationStatus === 'rejected' ? 'Reason for Rejection' : 'Resubmission Required'}
                                </div>
                                <p className={`text-sm ${
                                  uploadedDoc.verificationStatus === 'rejected' ? 'text-red-700' : 'text-amber-700'
                                }`}>
                                  {uploadedDoc.verificationRemarks}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Document Upload Info */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Document Requirements</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>Accepted formats: PDF, JPG, PNG</li>
                          <li>Maximum file size: 5MB per document</li>
                          <li>Documents must be clear and readable</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ====== Notifications Section ====== */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Email Notifications</h2>
                    <p className="text-sm text-slate-500">Choose which email notifications you'd like to receive</p>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Master toggle */}
                  <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-semibold text-slate-900">Email Notifications</p>
                        <p className="text-sm text-slate-500">Receive email updates about your account activity</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateNotifPref('emailEnabled', !notifPrefs.emailEnabled)}
                      disabled={notifLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${notifPrefs.emailEnabled ? 'bg-primary-600' : 'bg-slate-300'} ${notifLoading ? 'opacity-50' : ''}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${notifPrefs.emailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Sub-toggles */}
                  <div className={`space-y-4 transition-opacity ${notifPrefs.emailEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    {/* Application updates */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Award className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-slate-900">Application Updates</p>
                          <p className="text-sm text-slate-500">When your scholarship application is approved, rejected, or under review</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotifPref('applicationUpdates', !notifPrefs.applicationUpdates)}
                        disabled={notifLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${notifPrefs.applicationUpdates ? 'bg-primary-600' : 'bg-slate-300'} ${notifLoading ? 'opacity-50' : ''}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${notifPrefs.applicationUpdates ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Document updates */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="font-medium text-slate-900">Document Updates</p>
                          <p className="text-sm text-slate-500">When your profile documents are verified, rejected, or need resubmission</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotifPref('documentUpdates', !notifPrefs.documentUpdates)}
                        disabled={notifLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${notifPrefs.documentUpdates ? 'bg-primary-600' : 'bg-slate-300'} ${notifLoading ? 'opacity-50' : ''}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${notifPrefs.documentUpdates ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">About Notifications</p>
                        <p className="text-blue-700">
                          Important security emails (password reset, email verification) will always be sent regardless of these settings.
                        </p>
                      </div>
                    </div>
                  </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={editFormData.contactNumber}
                        onChange={(e) => setEditFormData({...editFormData, contactNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary-600" />
                    Academic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Student Number *</label>
                      <input
                        type="text"
                        value={editFormData.studentNumber}
                        onChange={(e) => setEditFormData({...editFormData, studentNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">College *</label>
                      <input
                        type="text"
                        value={editFormData.college}
                        onChange={(e) => setEditFormData({...editFormData, college: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
                      <input
                        type="text"
                        value={editFormData.course}
                        onChange={(e) => setEditFormData({...editFormData, course: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Major</label>
                      <input
                        type="text"
                        value={editFormData.major}
                        onChange={(e) => setEditFormData({...editFormData, major: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Year Level *</label>
                      <select
                        value={editFormData.classification}
                        onChange={(e) => setEditFormData({...editFormData, classification: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Year Level</option>
                        <option value="Freshman">Freshman</option>
                        <option value="Sophomore">Sophomore</option>
                        <option value="Junior">Junior</option>
                        <option value="Senior">Senior</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GWA *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="5"
                        value={editFormData.gwa}
                        onChange={(e) => setEditFormData({...editFormData, gwa: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Units Enrolled</label>
                      <input
                        type="number"
                        value={editFormData.unitsEnrolled}
                        onChange={(e) => setEditFormData({...editFormData, unitsEnrolled: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Units Passed</label>
                      <input
                        type="number"
                        value={editFormData.unitsPassed}
                        onChange={(e) => setEditFormData({...editFormData, unitsPassed: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary-600" />
                    Financial Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Annual Family Income</label>
                      <input
                        type="number"
                        value={editFormData.annualFamilyIncome}
                        onChange={(e) => setEditFormData({...editFormData, annualFamilyIncome: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Household Size</label>
                      <input
                        type="number"
                        value={editFormData.householdSize}
                        onChange={(e) => setEditFormData({...editFormData, householdSize: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ST Bracket</label>
                      <select
                        value={editFormData.stBracket}
                        onChange={(e) => setEditFormData({...editFormData, stBracket: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select ST Bracket</option>
                        <option value="FDS">FDS - Full Discount with Stipend</option>
                        <option value="FD">FD - Full Discount</option>
                        <option value="PD80">PD80 - 80% Partial Discount</option>
                        <option value="PD60">PD60 - 60% Partial Discount</option>
                        <option value="PD40">PD40 - 40% Partial Discount</option>
                        <option value="PD20">PD20 - 20% Partial Discount</option>
                        <option value="ND">ND - No Discount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Province of Origin</label>
                      <input
                        type="text"
                        value={editFormData.provinceOfOrigin}
                        onChange={(e) => setEditFormData({...editFormData, provinceOfOrigin: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Citizenship</label>
                      <input
                        type="text"
                        value={editFormData.citizenship}
                        onChange={(e) => setEditFormData({...editFormData, citizenship: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Home Address */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    Home Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Street</label>
                      <input
                        type="text"
                        value={editFormData.homeAddress?.street || ''}
                        onChange={(e) => setEditFormData({...editFormData, homeAddress: {...editFormData.homeAddress, street: e.target.value}})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Barangay</label>
                      <input
                        type="text"
                        value={editFormData.homeAddress?.barangay || ''}
                        onChange={(e) => setEditFormData({...editFormData, homeAddress: {...editFormData.homeAddress, barangay: e.target.value}})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={editFormData.homeAddress?.city || ''}
                        onChange={(e) => setEditFormData({...editFormData, homeAddress: {...editFormData.homeAddress, city: e.target.value}})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
                      <input
                        type="text"
                        value={editFormData.homeAddress?.province || ''}
                        onChange={(e) => setEditFormData({...editFormData, homeAddress: {...editFormData.homeAddress, province: e.target.value}})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Zip Code</label>
                      <input
                        type="text"
                        value={editFormData.homeAddress?.zipCode || ''}
                        onChange={(e) => setEditFormData({...editFormData, homeAddress: {...editFormData.homeAddress, zipCode: e.target.value}})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                      <textarea
                        rows={2}
                        value={editFormData.homeAddress?.fullAddress || ''}
                        onChange={(e) => setEditFormData({...editFormData, homeAddress: {...editFormData.homeAddress, fullAddress: e.target.value}})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Scholarship Status */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary-600" />
                    Scholarship & Academic Status
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="hasExistingScholarship"
                          checked={editFormData.hasExistingScholarship}
                          onChange={(e) => setEditFormData({...editFormData, hasExistingScholarship: e.target.checked})}
                          className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                        />
                        <div className="flex-1">
                          <label htmlFor="hasExistingScholarship" className="text-sm font-semibold text-slate-900 block mb-1 cursor-pointer">
                            Has Existing Scholarship
                          </label>
                          <p className="text-xs text-slate-600">Check this if you currently have an active scholarship</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="hasThesisGrant"
                          checked={editFormData.hasThesisGrant}
                          onChange={(e) => setEditFormData({...editFormData, hasThesisGrant: e.target.checked})}
                          className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                        />
                        <div className="flex-1">
                          <label htmlFor="hasThesisGrant" className="text-sm font-semibold text-slate-900 block mb-1 cursor-pointer">
                            Has Thesis Grant
                          </label>
                          <p className="text-xs text-slate-600">Check this if you have been awarded a thesis grant</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="hasDisciplinaryAction"
                          checked={editFormData.hasDisciplinaryAction}
                          onChange={(e) => setEditFormData({...editFormData, hasDisciplinaryAction: e.target.checked})}
                          className="mt-0.5 w-5 h-5 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                        />
                        <div className="flex-1">
                          <label htmlFor="hasDisciplinaryAction" className="text-sm font-semibold text-slate-900 block mb-1 cursor-pointer">
                            Has Disciplinary Action
                          </label>
                          <p className="text-xs text-slate-600">Check this if you have any disciplinary action on record</p>
                        </div>
                      </div>
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
                      studentProfile: {
                        firstName: editFormData.firstName,
                        lastName: editFormData.lastName,
                        middleName: editFormData.middleName,
                        studentNumber: editFormData.studentNumber,
                        college: editFormData.college,
                        course: editFormData.course,
                        major: editFormData.major,
                        classification: editFormData.classification,
                        gwa: parseFloat(editFormData.gwa),
                        unitsEnrolled: editFormData.unitsEnrolled ? parseInt(editFormData.unitsEnrolled) : undefined,
                        unitsPassed: editFormData.unitsPassed ? parseInt(editFormData.unitsPassed) : undefined,
                        annualFamilyIncome: editFormData.annualFamilyIncome ? parseInt(editFormData.annualFamilyIncome) : undefined,
                        householdSize: editFormData.householdSize ? parseInt(editFormData.householdSize) : undefined,
                        stBracket: editFormData.stBracket,
                        provinceOfOrigin: editFormData.provinceOfOrigin,
                        contactNumber: editFormData.contactNumber,
                        citizenship: editFormData.citizenship,
                        hasExistingScholarship: editFormData.hasExistingScholarship,
                        hasThesisGrant: editFormData.hasThesisGrant,
                        hasDisciplinaryAction: editFormData.hasDisciplinaryAction,
                        homeAddress: editFormData.homeAddress
                      }
                    };

                    const response = await userApi.updateProfile(updateData);
                    
                    if (response.success) {
                      // Refresh profile data
                      const profileResponse = await userApi.getProfile();
                      if (profileResponse.success && profileResponse.data) {
                        setProfile(profileResponse.data as unknown as StudentProfileData);
                      }
                      
                      // Refresh completeness
                      const completenessResponse = await userApi.getProfileCompleteness();
                      if (completenessResponse.success && completenessResponse.data) {
                        setProfileCompletion(completenessResponse.data.percentage);
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
      {isPreviewOpen && previewDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => {
          setIsPreviewOpen(false);
          setPreviewDoc(null);
        }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 bg-primary-600 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-lg">{previewDoc.name}</h3>
                  <p className="text-sm text-primary-100">{previewDoc.fileName}</p>
                </div>
              </div>
              <button onClick={() => {
                setIsPreviewOpen(false);
                setPreviewDoc(null);
              }} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-[600px]">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : previewUrl ? (
                previewDoc.mimeType === 'application/pdf' ? (
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className="w-full h-[600px] border-0 rounded-lg"
                    aria-label={previewDoc.fileName}
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                      <FileText className="w-12 h-12" />
                      <p>PDF preview not available in this browser.</p>
                      <button onClick={() => handleDownloadDocument(previewDoc)} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Download PDF</button>
                    </div>
                  </object>
                ) : (
                  <img
                    src={previewUrl}
                    alt={previewDoc.fileName}
                    className="w-full h-auto rounded-lg"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-[600px] text-slate-500">
                  Failed to load preview
                </div>
              )}
              
              {/* Document Details */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600 mb-1">File Size</p>
                  <p className="text-sm font-medium text-slate-900">{(previewDoc.fileSize / 1024).toFixed(1)} KB</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Upload Date</p>
                  <p className="text-sm font-medium text-slate-900">{new Date(previewDoc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">File Type</p>
                  <p className="text-sm font-medium text-slate-900">{previewDoc.mimeType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Document Type</p>
                  <p className="text-sm font-medium text-slate-900">{previewDoc.documentType}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => handleDownloadDocument(previewDoc)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewDoc(null);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
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

export default StudentProfile;
