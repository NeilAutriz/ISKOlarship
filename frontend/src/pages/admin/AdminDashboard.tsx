// ============================================================================
// ISKOlarship - Admin Dashboard
// Overview of scholarship platform management
// ============================================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users,
  Award,
  FileText,
  Clock,
  TrendingUp,
  DollarSign,
  Plus,
  ClipboardList,
  User,
  Calendar,
  ChevronRight
} from 'lucide-react';

// Mock data for dashboard
const mockStats = {
  totalStudents: 487,
  activeScholarships: 50,
  totalApplications: 142,
  pendingReview: 24,
  approvalRate: 68,
  totalAwarded: 3300000,
};

const mockRecentApplications = [
  {
    id: 'app-1',
    studentName: 'Maria Santos',
    email: 'maria.santos@university.edu',
    course: 'BS Biology',
    yearLevel: 'Junior',
    scholarship: 'Sterix HOPE Scholarship',
    submittedDate: '2025-11-08',
    status: 'pending',
    matchScore: 95,
  },
  {
    id: 'app-2',
    studentName: 'Juan Dela Cruz',
    email: 'juan.delacruz@university.edu',
    course: 'BS Chemistry',
    yearLevel: 'Sophomore',
    scholarship: 'Dr. Ernesto Tuazon Memorial',
    submittedDate: '2025-11-07',
    status: 'pending',
    matchScore: 88,
  },
  {
    id: 'app-3',
    studentName: 'Ana Reyes',
    email: 'ana.reyes@university.edu',
    course: 'BS Mathematics',
    yearLevel: 'Senior',
    scholarship: 'Academic Excellence Award',
    submittedDate: '2025-11-06',
    status: 'under_review',
    matchScore: 92,
  },
];

const mockTopScholarships = [
  {
    id: 'sch-1',
    name: 'Sterix HOPE Scholarship',
    sponsor: 'Sterix Incorporated',
    applications: 45,
    awardAmount: 30000,
  },
  {
    id: 'sch-2',
    name: 'DOST Merit Scholarship',
    sponsor: 'Department of Science and Technology',
    applications: 38,
    awardAmount: 40000,
  },
  {
    id: 'sch-3',
    name: 'Academic Excellence Award',
    sponsor: 'UPLB Foundation',
    applications: 32,
    awardAmount: 25000,
  },
];

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'scholarships'>('applications');

  const statCards = [
    {
      label: 'TOTAL STUDENTS',
      value: mockStats.totalStudents,
      description: 'Registered users',
      icon: Users,
      color: 'blue',
      borderColor: 'border-t-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'ACTIVE SCHOLARSHIPS',
      value: mockStats.activeScholarships,
      description: 'Available programs',
      icon: Award,
      color: 'green',
      borderColor: 'border-t-green-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'TOTAL APPLICATIONS',
      value: mockStats.totalApplications,
      description: 'All submissions',
      icon: FileText,
      color: 'purple',
      borderColor: 'border-t-purple-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'PENDING REVIEW',
      value: mockStats.pendingReview,
      description: 'Needs attention',
      icon: Clock,
      color: 'orange',
      borderColor: 'border-t-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'APPROVAL RATE',
      value: `${mockStats.approvalRate}%`,
      description: 'Success metric',
      icon: TrendingUp,
      color: 'red',
      borderColor: 'border-t-red-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'TOTAL AWARDED',
      value: `₱${(mockStats.totalAwarded / 1000000).toFixed(1)}M`,
      description: 'Scholarships granted',
      icon: DollarSign,
      color: 'cyan',
      borderColor: 'border-t-cyan-500',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
      case 'under_review':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Under Review</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-8">
        {/* Header Banner */}
        <div className="bg-primary-600 rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full mb-3">
                Admin Dashboard
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
              <p className="text-primary-100">Manage scholarships, applications, and student data</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/scholarships"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 font-medium rounded-lg hover:bg-slate-50 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Scholarship
              </Link>
              <Link
                to="/admin/applicants"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-primary-600 font-medium rounded-lg hover:bg-slate-50 transition-all"
              >
                <ClipboardList className="w-4 h-4" />
                Review Applications
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`bg-white rounded-xl border border-slate-200 p-6 ${stat.borderColor} border-t-4`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${stat.iconColor}`}>{stat.value}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-4">{stat.description}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'applications'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Recent Applications
          </button>
          <button
            onClick={() => setActiveTab('scholarships')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'scholarships'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Top Scholarships
          </button>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {activeTab === 'applications' ? 'Recent Applications' : 'Top Scholarships'}
              </h2>
              <p className="text-sm text-slate-500">
                {activeTab === 'applications' 
                  ? 'Latest scholarship applications awaiting review' 
                  : 'Most popular scholarship programs'}
              </p>
            </div>
            <Link
              to={activeTab === 'applications' ? '/admin/applicants' : '/admin/scholarships'}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all"
            >
              View All
            </Link>
          </div>

          {activeTab === 'applications' ? (
            <div className="space-y-4">
              {mockRecentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{app.studentName}</p>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-slate-500">{app.scholarship}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-slate-600">{app.course}</p>
                      <p className="text-xs text-slate-400">{app.submittedDate}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {mockTopScholarships.map((sch) => (
                <div key={sch.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{sch.name}</p>
                      <p className="text-sm text-slate-500">{sch.sponsor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-slate-900">{sch.applications} applications</p>
                      <p className="text-xs text-slate-400">₱{sch.awardAmount.toLocaleString()}/semester</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
