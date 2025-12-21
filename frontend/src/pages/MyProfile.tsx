// ============================================================================
// ISKOlarship - My Profile Page
// View and manage student profile information
// ============================================================================

import React from 'react';
import { useAuth } from '../App';
import { isStudentProfile } from '../types';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Building2,
  DollarSign,
  FileText,
  Upload,
  Download,
  Edit3
} from 'lucide-react';

// Mock uploaded documents
const mockDocuments = [
  { id: 'doc-1', name: 'Transcript of Records.pdf', type: 'Academic', size: '2.4 MB', uploadDate: '2024-10-15' },
  { id: 'doc-2', name: 'Birth Certificate.pdf', type: 'Personal', size: '1.2 MB', uploadDate: '2024-10-15' },
  { id: 'doc-3', name: 'Income Tax Return.pdf', type: 'Financial', size: '3.1 MB', uploadDate: '2024-10-16' },
  { id: 'doc-4', name: 'Recommendation Letter.pdf', type: 'Academic', size: '856 KB', uploadDate: '2024-10-18' },
];

const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const studentUser = isStudentProfile(user) ? user : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-600">View and manage your account information</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Profile Summary */}
          <div className="space-y-6">
            {/* Avatar Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-slate-500 mb-4">Student</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Profile Complete
              </span>

              <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{studentUser?.contactNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{studentUser?.address?.province || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">N/A</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">GPA</span>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm font-medium">
                    {studentUser?.gwa || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Year Level</span>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm font-medium">
                    {studentUser?.yearLevel || 'Freshman'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Documents</span>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm font-medium">
                    {mockDocuments.length} Files
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Information Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Personal Information</h3>
                  <p className="text-sm text-slate-500">Your basic details</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Full Name</p>
                  <p className="font-medium text-slate-900">
                    {user?.firstName} {studentUser?.middleName} {user?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Email Address</p>
                  <p className="font-medium text-slate-900">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Date of Birth</p>
                  <p className="font-medium text-slate-900">N/A</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Contact Number</p>
                  <p className="font-medium text-slate-900">{studentUser?.contactNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Address</p>
                  <p className="font-medium text-slate-900">
                    {studentUser?.address?.street ? `${studentUser.address.street}, ${studentUser.address.city}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Gender</p>
                  <p className="font-medium text-slate-900">N/A</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Citizenship</p>
                  <p className="font-medium text-slate-900">Filipino</p>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Academic Information</h3>
                  <p className="text-sm text-slate-500">Your educational background</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Institution</p>
                  <p className="font-medium text-slate-900">
                    {studentUser?.college || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Course/Program</p>
                  <p className="font-medium text-slate-900">{studentUser?.course || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Year Level</p>
                  <p className="font-medium text-slate-900">{studentUser?.yearLevel || 'Freshman'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">GPA</p>
                  <p className="font-medium text-slate-900">{studentUser?.gwa || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Field of Study</p>
                  <p className="font-medium text-slate-900">No fields specified</p>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Financial Information</h3>
                  <p className="text-sm text-slate-500">Your economic status</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Family Income</p>
                  <p className="font-medium text-slate-900">
                    {studentUser?.annualFamilyIncome 
                      ? `₱${studentUser.annualFamilyIncome.toLocaleString()}/year` 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Financial Need Level</p>
                  <p className="font-medium text-slate-900">{studentUser?.stBracket || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Uploaded Documents */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Uploaded Documents</h3>
                    <p className="text-sm text-slate-500">Your supporting files</p>
                  </div>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-all">
                  <Upload className="w-4 h-4" />
                  Upload New
                </button>
              </div>

              <div className="space-y-3">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.name}</p>
                        <p className="text-sm text-slate-500">
                          {doc.type} • {doc.size} • Uploaded {doc.uploadDate}
                        </p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
