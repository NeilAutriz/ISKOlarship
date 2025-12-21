 // ============================================================================
// ISKOlarship - Student Profile Page
// Manage student profile and academic information
// ============================================================================

import React, { useState } from 'react';
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
  Shield
} from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  studentId: string;
  university: string;
  college: string;
  program: string;
  yearLevel: string;
  gpa: number;
  expectedGraduation: string;
  familyIncome: string;
  householdSize: number;
  financialAidStatus: string;
}

const mockProfile: ProfileData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  email: 'juan.delacruz@iskolar.edu.ph',
  phone: '+63 917 123 4567',
  address: 'Quezon City, Metro Manila',
  dateOfBirth: '2002-05-15',
  studentId: '2021-12345',
  university: 'Polytechnic University of the Philippines',
  college: 'College of Engineering',
  program: 'Bachelor of Science in Computer Engineering',
  yearLevel: '3rd Year',
  gpa: 1.45,
  expectedGraduation: 'June 2025',
  familyIncome: '₱150,000 - ₱250,000',
  householdSize: 5,
  financialAidStatus: 'Partial Scholarship'
};

const documents = [
  { name: 'Certificate of Registration', status: 'verified', date: '10/15/2024' },
  { name: 'Grade Report (Latest Sem)', status: 'verified', date: '10/10/2024' },
  { name: 'Income Tax Return', status: 'pending', date: '11/01/2024' },
  { name: 'Barangay Certificate', status: 'verified', date: '10/12/2024' },
];

const StudentProfile: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'personal' | 'academic' | 'financial' | 'documents'>('personal');

  const profileCompletion = 85;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-primary-900 font-bold text-3xl shadow-lg shadow-gold-400/30">
                {mockProfile.firstName[0]}{mockProfile.lastName[0]}
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-all">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wide">Student Profile</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-100 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" />Verified
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{mockProfile.firstName} {mockProfile.lastName}</h1>
              <p className="text-primary-100 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                {mockProfile.program} • {mockProfile.yearLevel}
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
                    { label: 'Full Name', value: `${mockProfile.firstName} ${mockProfile.lastName}`, icon: User },
                    { label: 'Email Address', value: mockProfile.email, icon: Mail },
                    { label: 'Phone Number', value: mockProfile.phone, icon: Phone },
                    { label: 'Address', value: mockProfile.address, icon: MapPin },
                    { label: 'Date of Birth', value: new Date(mockProfile.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), icon: Calendar },
                    { label: 'Student ID', value: mockProfile.studentId, icon: Award },
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
                    { label: 'University', value: mockProfile.university, icon: Building2 },
                    { label: 'College', value: mockProfile.college, icon: Building2 },
                    { label: 'Program', value: mockProfile.program, icon: BookOpen },
                    { label: 'Year Level', value: mockProfile.yearLevel, icon: GraduationCap },
                    { label: 'GPA', value: mockProfile.gpa.toFixed(2), icon: Award },
                    { label: 'Expected Graduation', value: mockProfile.expectedGraduation, icon: Calendar },
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
                    { label: 'Annual Family Income', value: mockProfile.familyIncome, icon: Wallet },
                    { label: 'Household Size', value: `${mockProfile.householdSize} members`, icon: User },
                    { label: 'Financial Aid Status', value: mockProfile.financialAidStatus, icon: Award },
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
