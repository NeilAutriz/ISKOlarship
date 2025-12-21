// ============================================================================
// ISKOlarship - Admin Scholarship Management
// Create, edit, and manage scholarship programs
// ============================================================================

import React, { useState } from 'react';
import { 
  Search,
  Plus,
  DollarSign,
  Calendar,
  Users,
  Edit3,
  Trash2,
  ChevronDown
} from 'lucide-react';

// Mock scholarships data
const mockScholarships = [
  {
    id: 'sch-1',
    name: 'Sterix HOPE Scholarship',
    sponsor: 'Sterix Incorporated',
    type: 'Regular',
    description: 'The Sterix HOPE (Honoring Outstanding Pioneers in Entomology) Scholarship is a prestigious program dedicated to nurturing the next generation of entomologists and agricultural biologists. This comprehensive scholarship supports students who demonstrate exceptional academic excellence and a passion for insect science, pest management, and sustainable agriculture. Recipients gain access to exclusive research facilities, mentorship from industry experts, and internship opportunities at Sterix\'s state-of-the-art laboratories.',
    awardAmount: 30000,
    awardPeriod: 'semester',
    deadline: '2025-12-15',
    yearLevels: ['Junior'],
    applicants: 45,
  },
  {
    id: 'sch-2',
    name: 'Dr. Ernesto Tuazon Memorial Scholarship',
    sponsor: 'Dr. Ernesto Tuazon Foundation',
    type: 'Regular',
    description: 'Established in honor of the late Dr. Ernesto Tuazon, a pioneer in Philippine chemistry education, this scholarship celebrates students who embody excellence in chemical sciences. Dr. Tuazon dedicated his life to advancing chemistry education in the Philippines, particularly supporting students from his home provinces. This scholarship not only provides financial assistance but also offers networking opportunities with leading chemists, access to advanced laboratory equipment, and priority enrollment in specialized chemistry workshops and seminars.',
    awardAmount: 25000,
    awardPeriod: 'semester',
    deadline: '2025-12-20',
    yearLevels: ['Sophomore', 'Junior', 'Senior'],
    applicants: 32,
  },
  {
    id: 'sch-3',
    name: 'DOST Merit Scholarship',
    sponsor: 'Department of Science and Technology',
    type: 'Government',
    description: 'A government-funded scholarship program for students pursuing degrees in science and technology. This program aims to develop a pool of qualified scientists and engineers who will contribute to the country\'s development.',
    awardAmount: 40000,
    awardPeriod: 'semester',
    deadline: '2025-11-30',
    yearLevels: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    applicants: 78,
  },
  {
    id: 'sch-4',
    name: 'Academic Excellence Award',
    sponsor: 'UPLB Foundation',
    type: 'Merit',
    description: 'Recognizes students who have demonstrated outstanding academic performance throughout their university career. Recipients must maintain a GWA of 1.75 or better.',
    awardAmount: 25000,
    awardPeriod: 'semester',
    deadline: '2025-12-01',
    yearLevels: ['Junior', 'Senior'],
    applicants: 28,
  },
];

type ScholarshipType = 'all' | 'Regular' | 'Government' | 'Merit' | 'Grant';

const AdminScholarships: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ScholarshipType>('all');

  // Calculate stats
  const stats = {
    total: mockScholarships.length,
    regular: mockScholarships.filter(s => s.type === 'Regular').length,
    grants: mockScholarships.filter(s => s.type === 'Grant' || s.type === 'Government' || s.type === 'Merit').length,
  };

  // Filter scholarships
  const filteredScholarships = mockScholarships.filter(sch => {
    const matchesSearch = 
      sch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.sponsor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || sch.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Regular':
        return 'bg-primary-100 text-primary-700';
      case 'Government':
        return 'bg-green-100 text-green-700';
      case 'Merit':
        return 'bg-purple-100 text-purple-700';
      case 'Grant':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scholarship Management</h1>
            <p className="text-slate-600">Create, edit, and manage scholarship programs</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all">
            <Plus className="w-4 h-4" />
            Add New Scholarship
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="relative w-full md:w-48">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ScholarshipType)}
                className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white pr-10"
              >
                <option value="all">All Types</option>
                <option value="Regular">Regular</option>
                <option value="Government">Government</option>
                <option value="Merit">Merit</option>
                <option value="Grant">Grant</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-primary-500">
            <p className="text-sm text-slate-500">Total Scholarships</p>
            <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Regular Programs</p>
            <p className="text-2xl font-bold text-blue-600">{stats.regular}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">Grants</p>
            <p className="text-2xl font-bold text-green-600">{stats.grants}</p>
          </div>
        </div>

        {/* Scholarships List */}
        <div className="space-y-4">
          {filteredScholarships.map((sch) => (
            <div key={sch.id} className="bg-white rounded-xl border border-slate-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{sch.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadgeColor(sch.type)}`}>
                        {sch.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{sch.sponsor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all">
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-500 font-medium rounded-lg hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-6 line-clamp-3">{sch.description}</p>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Award Amount</p>
                    <p className="font-medium text-slate-900">₱{sch.awardAmount.toLocaleString()}/{sch.awardPeriod}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Deadline</p>
                    <p className="font-medium text-slate-900">{sch.deadline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Year Levels</p>
                    <p className="font-medium text-slate-900">{sch.yearLevels.join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredScholarships.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">No scholarships found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScholarships;
