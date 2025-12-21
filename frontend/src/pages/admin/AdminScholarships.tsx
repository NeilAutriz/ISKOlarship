// ============================================================================
// ISKOlarship - Admin Scholarships Page
// Manage and create scholarship programs
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  Users,
  Wallet,
  Edit3,
  Trash2,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { scholarshipApi } from '../../services/apiClient';

interface Scholarship {
  id: string;
  name: string;
  sponsor: string;
  amount: string;
  slots: number;
  applicants: number;
  deadline: string;
  status: 'active' | 'closed' | 'draft';
  type: 'full' | 'partial' | 'grant';
}

const AdminScholarships: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch scholarships from API
  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setLoading(true);
        const response = await scholarshipApi.getAll({ limit: 100 });
        if (response.success && response.data?.scholarships) {
          setScholarships(response.data.scholarships.map((s: any) => ({
            id: s._id || s.id,
            name: s.name,
            sponsor: s.sponsor,
            amount: s.awardAmount ? `₱${s.awardAmount.toLocaleString()}` : s.awardDescription || 'Varies',
            slots: s.maxSlots || s.totalSlots || 0,
            applicants: s.currentApplicants || 0,
            deadline: s.applicationDeadline ? new Date(s.applicationDeadline).toLocaleDateString() : 'N/A',
            status: s.status === 'active' ? 'active' : s.status === 'closed' ? 'closed' : 'draft',
            type: s.type?.includes('grant') ? 'grant' : s.coverageType === 'full' ? 'full' : 'partial'
          })));
        }
      } catch (error) {
        console.error('Failed to fetch scholarships:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScholarships();
  }, []);

  const filteredScholarships = scholarships.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.sponsor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: scholarships.length,
    active: scholarships.filter(s => s.status === 'active').length,
    closed: scholarships.filter(s => s.status === 'closed').length,
    drafts: scholarships.filter(s => s.status === 'draft').length,
  };

  const getStatusConfig = (status: Scholarship['status']) => {
    const configs = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Active' },
      closed: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock, label: 'Closed' },
      draft: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle, label: 'Draft' },
    };
    return configs[status];
  };

  const getTypeConfig = (type: Scholarship['type']) => {
    const configs = {
      full: { bg: 'bg-primary-100', text: 'text-primary-700', label: 'Full Scholarship' },
      partial: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Partial Scholarship' },
      grant: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Grant' },
    };
    return configs[type];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-400 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-green-400/20 text-green-400 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" />Scholarship Management
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Manage Scholarships</h1>
              <p className="text-slate-400">Create, edit, and manage scholarship programs</p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-400 transition-all shadow-lg shadow-green-500/25">
              <Plus className="w-5 h-5" />New Scholarship
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', sublabel: 'Scholarships', value: stats.total, color: 'primary', icon: GraduationCap },
            { label: 'Active', sublabel: 'Open for Applications', value: stats.active, color: 'green', icon: CheckCircle },
            { label: 'Closed', sublabel: 'Application Ended', value: stats.closed, color: 'slate', icon: Clock },
            { label: 'Drafts', sublabel: 'Not Published', value: stats.drafts, color: 'amber', icon: AlertTriangle },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${stat.color}-400 to-${stat.color}-600 flex items-center justify-center shadow-lg shadow-${stat.color}-500/30`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-xs font-medium text-${stat.color}-600 bg-${stat.color}-50 px-2 py-1 rounded-full`}>{stat.label}</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-app pb-12">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'closed', label: 'Closed' },
                { id: 'draft', label: 'Drafts' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === filter.id 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scholarships List */}
        <div className="space-y-4">
          {filteredScholarships.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No scholarships found</h3>
              <p className="text-slate-500 mb-4">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            filteredScholarships.map((scholarship) => {
              const statusConfig = getStatusConfig(scholarship.status);
              const typeConfig = getTypeConfig(scholarship.type);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={scholarship.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-14 h-14 rounded-xl ${scholarship.status === 'active' ? 'bg-green-100' : 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
                          <GraduationCap className={`w-7 h-7 ${scholarship.status === 'active' ? 'text-green-600' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-semibold text-lg text-slate-900 truncate">{scholarship.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon className="w-3 h-3" />{statusConfig.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>{typeConfig.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{scholarship.sponsor}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <Wallet className="w-4 h-4 text-slate-400" />{scholarship.amount}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-slate-400" />{scholarship.applicants} / {scholarship.slots} slots
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-slate-400" />Deadline: {scholarship.deadline}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="relative flex-shrink-0">
                        <button 
                          onClick={() => setShowDropdown(showDropdown === scholarship.id ? null : scholarship.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {showDropdown === scholarship.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-10">
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-all">
                              <Eye className="w-4 h-4" />View Details
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-all">
                              <Edit3 className="w-4 h-4" />Edit Scholarship
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-all">
                              <Users className="w-4 h-4" />View Applicants
                            </button>
                            <hr className="my-2 border-slate-100" />
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all">
                              <Trash2 className="w-4 h-4" />Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Application Progress</span>
                      <span className="text-sm font-medium text-slate-900">{Math.round((scholarship.applicants / scholarship.slots) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${scholarship.applicants >= scholarship.slots ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((scholarship.applicants / scholarship.slots) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScholarships;
