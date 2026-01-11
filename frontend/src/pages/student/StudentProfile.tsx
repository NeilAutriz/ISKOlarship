// ============================================================================
// ISKOlarship - Student Profile Page
// Manage student profile and academic information
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { userApi } from '../../services/apiClient';

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
    'senior': '4th Year',
    'graduate': 'Graduate'
  };
  return yearMap[classification.toLowerCase()] || classification;
};

// Get ST Bracket display name
const getSTBracketDisplay = (bracket?: string): string => {
  if (!bracket) return 'Not Set';
  const bracketMap: Record<string, string> = {
    'FDS': 'Full Discount with Stipend',
    'FD': 'Full Discount',
    'PD80': '80% Partial Discount',
    'PD60': '60% Partial Discount',
    'PD40': '40% Partial Discount',
    'PD20': '20% Partial Discount',
    'ND': 'No Discount'
  };
  return bracketMap[bracket] || bracket;
};

// Document type (would come from API in a real implementation)
interface Document {
  name: string;
  status: 'verified' | 'pending';
  date: string;
}

// Mock documents - in a real implementation, these would come from the API
const getDefaultDocuments = (): Document[] => [
  { name: 'Certificate of Registration', status: 'pending', date: 'Not uploaded' },
  { name: 'Grade Report (Latest Sem)', status: 'pending', date: 'Not uploaded' },
  { name: 'Income Tax Return', status: 'pending', date: 'Not uploaded' },
  { name: 'Barangay Certificate', status: 'pending', date: 'Not uploaded' },
];

const StudentProfile: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'personal' | 'academic' | 'financial' | 'documents'>('personal');
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [documents, setDocuments] = useState<Document[]>(getDefaultDocuments());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
          setProfile(profileResponse.data as unknown as StudentProfileData);
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
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-primary-900 font-bold text-3xl shadow-lg shadow-gold-400/30">
                {sp?.firstName?.[0] || 'S'}{sp?.lastName?.[0] || 'T'}
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-all">
                <Camera className="w-5 h-5" />
              </button>
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
                  hasExistingScholarship: sp?.hasExistingScholarship || false,
                  hasThesisGrant: sp?.hasThesisGrant || false,
                  hasDisciplinaryAction: sp?.hasDisciplinaryAction || false,
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
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Personal Information</h2>
                  </div>
                  <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" />Edit
                  </button>
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
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Academic Information</h2>
                  </div>
                  <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" />Edit
                  </button>
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
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Financial Information</h2>
                  </div>
                  <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" />Edit
                  </button>
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
                    <h2 className="font-semibold text-slate-900">Documents</h2>
                  </div>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg text-sm hover:bg-primary-700 transition-all">
                    <Upload className="w-4 h-4" />Upload Document
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{doc.name}</div>
                            <div className="text-sm text-slate-500">Uploaded: {doc.date}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${doc.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {doc.status === 'verified' ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                          {doc.status === 'verified' ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    ))}
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
                        <option value="freshman">1st Year</option>
                        <option value="sophomore">2nd Year</option>
                        <option value="junior">3rd Year</option>
                        <option value="senior">4th Year</option>
                        <option value="graduate">Graduate</option>
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

                    console.log('Updating profile with:', updateData);
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
    </div>
  );
};

export default StudentProfile;
