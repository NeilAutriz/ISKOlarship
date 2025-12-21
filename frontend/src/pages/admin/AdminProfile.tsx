// ============================================================================
// ISKOlarship - Admin Profile Page
// View and manage administrator account and permissions
// ============================================================================

import React from 'react';
import { 
  Shield,
  Building2,
  Mail,
  Phone,
  Calendar,
  User,
  Award,
  Users,
  FileText,
  CheckCircle,
  Settings,
  Edit3
} from 'lucide-react';

// Mock admin data
const mockAdminData = {
  name: 'Admin User',
  role: 'System Administrator',
  email: 'admin@iskolarship.ph',
  phone: '+63 (2) 8123-4567',
  organization: 'ISKOlarship Foundation',
  department: 'Scholarship Management',
  joinDate: '2024-01-15',
  stats: {
    totalScholarships: 12,
    activeApplicants: 156,
    pendingReviews: 24,
    approvedThisMonth: 38,
  },
  permissions: [
    { name: 'Scholarship Management', access: 'Full Access' },
    { name: 'Applicant Review', access: 'Full Access' },
    { name: 'Analytics Dashboard', access: 'Full Access' },
    { name: 'User Management', access: 'Full Access' },
  ],
};

const AdminProfile: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Profile</h1>
            <p className="text-slate-600">Manage your administrator account and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all">
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Avatar Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{mockAdminData.name}</h2>
              <p className="text-slate-500 mb-4">{mockAdminData.role}</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                Administrator
              </span>

              <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{mockAdminData.organization}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{mockAdminData.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{mockAdminData.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Joined {mockAdminData.joinDate}</span>
                </div>
              </div>
            </div>

            {/* Quick Statistics Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-sm text-slate-600">Total Scholarships</span>
                  </div>
                  <span className="font-semibold text-slate-900">{mockAdminData.stats.totalScholarships}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-600">Active Applicants</span>
                  </div>
                  <span className="font-semibold text-slate-900">{mockAdminData.stats.activeApplicants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-sm text-slate-600">Pending Reviews</span>
                  </div>
                  <span className="font-semibold text-slate-900">{mockAdminData.stats.pendingReviews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm text-slate-600">Approved This Month</span>
                  </div>
                  <span className="font-semibold text-slate-900">{mockAdminData.stats.approvedThisMonth}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Account Information</h3>
                  <p className="text-sm text-slate-500">Your administrator details</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Full Name</p>
                  <p className="font-medium text-slate-900">{mockAdminData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Email Address</p>
                  <p className="font-medium text-slate-900">{mockAdminData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Role</p>
                  <p className="font-medium text-slate-900">{mockAdminData.role}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Department</p>
                  <p className="font-medium text-slate-900">{mockAdminData.department}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Organization</p>
                  <p className="font-medium text-slate-900">{mockAdminData.organization}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Phone Number</p>
                  <p className="font-medium text-slate-900">{mockAdminData.phone}</p>
                </div>
              </div>
            </div>

            {/* System Permissions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">System Permissions</h3>
                  <p className="text-sm text-slate-500">Your access levels</p>
                </div>
              </div>

              <div className="space-y-3">
                {mockAdminData.permissions.map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{permission.name}</p>
                        <p className="text-sm text-slate-500">{permission.access}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      Granted
                    </span>
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

export default AdminProfile;
