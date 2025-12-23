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
  AlertCircle
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

            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg">
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
    </div>
  );
};

export default StudentProfile;
