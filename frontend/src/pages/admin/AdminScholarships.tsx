// ============================================================================
// ISKOlarship - Admin Scholarships Page
// Manage and create scholarship programs
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader2,
  Award
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
  scholarshipType?: string; // Added for color scheme (university, government, private, etc.)
}

const AdminScholarships: React.FC = () => {
  const navigate = useNavigate();
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
          setScholarships(response.data.scholarships.map((s: any) => {
            const amount = s.awardAmount ?? s.totalGrant ?? 0;
            return {
              id: s._id || s.id,
              name: s.name,
              sponsor: s.sponsor,
              amount: amount > 0 ? `₱${amount.toLocaleString()}` : s.awardDescription || 'Varies',
              slots: s.slots || s.maxSlots || s.totalSlots || 0,
              applicants: s.filledSlots || s.currentApplicants || 0,
              deadline: s.applicationDeadline ? new Date(s.applicationDeadline).toLocaleDateString() : 'N/A',
              status: s.status === 'open' || s.isActive ? 'active' : s.status === 'closed' ? 'closed' : 'draft',
              type: s.type?.includes('grant') || s.type === 'thesis_grant' ? 'grant' : s.coverageType === 'full' ? 'full' : 'partial',
              scholarshipType: s.type // Store original type for color scheme
            };
          }));
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

  // Color schemes for different scholarship types - improved readability
  const getScholarshipColorScheme = (scholarshipType?: string) => {
    const normalizedType = scholarshipType?.toLowerCase().replace(/[\s/]+/g, '_') || 'default';
    
    const schemes: Record<string, { 
      iconBg: string; 
      iconColor: string;
      headerBg: string;
      badge: string;
      border: string;
    }> = {
      'university': { 
        iconBg: 'bg-blue-50', 
        iconColor: 'text-blue-700',
        headerBg: 'bg-white',
        badge: 'bg-blue-600 text-white shadow-sm',
        border: 'border-l-blue-600'
      },
      'government': { 
        iconBg: 'bg-amber-50', 
        iconColor: 'text-amber-700',
        headerBg: 'bg-white',
        badge: 'bg-amber-600 text-white shadow-sm',
        border: 'border-l-amber-600'
      },
      'thesis_grant': { 
        iconBg: 'bg-emerald-50', 
        iconColor: 'text-emerald-700',
        headerBg: 'bg-white',
        badge: 'bg-emerald-600 text-white shadow-sm',
        border: 'border-l-emerald-600'
      },
      'private': { 
        iconBg: 'bg-purple-50', 
        iconColor: 'text-purple-700',
        headerBg: 'bg-white',
        badge: 'bg-purple-600 text-white shadow-sm',
        border: 'border-l-purple-600'
      },
      'private_scholarship': { 
        iconBg: 'bg-purple-50', 
        iconColor: 'text-purple-700',
        headerBg: 'bg-white',
        badge: 'bg-purple-600 text-white shadow-sm',
        border: 'border-l-purple-600'
      },
      'college': { 
        iconBg: 'bg-teal-50', 
        iconColor: 'text-teal-700',
        headerBg: 'bg-white',
        badge: 'bg-teal-600 text-white shadow-sm',
        border: 'border-l-teal-600'
      },
      'default': { 
        iconBg: 'bg-slate-50', 
        iconColor: 'text-slate-700',
        headerBg: 'bg-white',
        badge: 'bg-slate-600 text-white shadow-sm',
        border: 'border-l-slate-600'
      },
    };

    return schemes[normalizedType] || schemes['default'];
  };

  // Format scholarship type for display
  const formatType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .replace(/\//g, ' / ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/6/66/Freedom_Park%2C_UPLB%2C_June_2023.jpg" 
            alt="UPLB Freedom Park" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800/95 via-primary-700/90 to-primary-900/95" />
        </div>
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-green-300 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-white/10">
                  <GraduationCap className="w-3.5 h-3.5" />Scholarship Management
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Manage Scholarships</h1>
              <p className="text-primary-100">Create, edit, and manage scholarship programs</p>
            </div>
            <button 
              onClick={() => navigate('/admin/scholarships/add')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-400 transition-all shadow-lg shadow-green-500/25"
            >
              <Plus className="w-5 h-5" />New Scholarship
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Scholarships Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded-full">Total</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-500">Scholarships</div>
          </div>
          
          {/* Active Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Active</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.active}</div>
            <div className="text-sm text-slate-500">Open for Applications</div>
          </div>
          
          {/* Closed Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-500 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full">Closed</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.closed}</div>
            <div className="text-sm text-slate-500">Application Ended</div>
          </div>
          
          {/* Drafts Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Drafts</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.drafts}</div>
            <div className="text-sm text-slate-500">Not Published</div>
          </div>
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
              const colorScheme = getScholarshipColorScheme(scholarship.scholarshipType);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={scholarship.id} className={`bg-white rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 ${colorScheme.border}`}>
                  {/* Header with subtle color accent */}
                  <div className={`${colorScheme.headerBg} px-6 py-5 border-b-2 border-slate-100`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Type & Status Badges */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-3">
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide ${colorScheme.badge}`}>
                            <Award className="w-4 h-4" />
                            {formatType(scholarship.scholarshipType || 'Scholarship')}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border border-current/20`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${typeConfig.bg} ${typeConfig.text} border border-current/20`}>
                            {typeConfig.label}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">{scholarship.name}</h3>
                        
                        {/* Sponsor */}
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-slate-600" />
                          </span>
                          <span className="font-semibold">{scholarship.sponsor}</span>
                        </div>
                      </div>
                      
                      {/* Actions Dropdown */}
                      <div className="relative flex-shrink-0">
                        <button 
                          onClick={() => setShowDropdown(showDropdown === scholarship.id ? null : scholarship.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-all"
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

                  {/* Main Content */}
                  <div className="px-6 py-5 bg-slate-50/30">
                    {/* Grant Amount - Prominent Display */}
                    <div className="flex items-center gap-4 mb-4 p-5 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 rounded-xl border-2 border-amber-200/50 shadow-sm">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-md">
                        <Wallet className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Grant Amount</div>
                        <div className="text-2xl font-extrabold text-slate-900">{scholarship.amount}</div>
                      </div>
                      <div className="text-right px-4 py-2 bg-white/80 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Slots</div>
                        <div className="text-xl font-extrabold text-primary-700">
                          {scholarship.applicants}<span className="text-slate-400 font-semibold">/{scholarship.slots}</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center gap-3 text-sm bg-white px-4 py-3 rounded-lg border border-slate-200">
                      <Calendar className="w-5 h-5 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline:</span>
                      <span className="font-bold text-slate-900">{scholarship.deadline}</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="px-6 py-4 bg-white border-t-2 border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-700 font-bold">Application Progress</span>
                      <span className="text-base font-extrabold text-slate-900">{Math.round((scholarship.applicants / scholarship.slots) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all shadow-sm ${scholarship.applicants >= scholarship.slots ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}
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
