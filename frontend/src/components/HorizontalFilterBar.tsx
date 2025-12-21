// ============================================================================
// ISKOlarship - HorizontalFilterBar Component
// Horizontal filter interface for scholarship search (space-efficient)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  DollarSign,
  GraduationCap,
  Users,
  Award,
  RotateCcw,
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { FilterCriteria, ScholarshipType, YearLevel, UPLBCollege } from '../types';

interface HorizontalFilterBarProps {
  filters: FilterCriteria;
  onFilterChange: (filters: Partial<FilterCriteria>) => void;
  onClearFilters: () => void;
  showEligibleToggle?: boolean;
  resultCount?: number;
  className?: string;
}

const HorizontalFilterBar: React.FC<HorizontalFilterBarProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  showEligibleToggle = true,
  resultCount,
  className = ''
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scholarship types
  const scholarshipTypes: { value: ScholarshipType; label: string; color: string }[] = [
    { value: ScholarshipType.UNIVERSITY, label: 'University', color: 'bg-emerald-100 text-emerald-700' },
    { value: ScholarshipType.COLLEGE, label: 'College', color: 'bg-blue-100 text-blue-700' },
    { value: ScholarshipType.GOVERNMENT, label: 'Government', color: 'bg-amber-100 text-amber-700' },
    { value: ScholarshipType.PRIVATE, label: 'Private', color: 'bg-purple-100 text-purple-700' },
    { value: ScholarshipType.THESIS_GRANT, label: 'Thesis Grant', color: 'bg-rose-100 text-rose-700' }
  ];

  // Year levels
  const yearLevels: { value: YearLevel; label: string }[] = [
    { value: YearLevel.FRESHMAN, label: 'Freshman' },
    { value: YearLevel.SOPHOMORE, label: 'Sophomore' },
    { value: YearLevel.JUNIOR, label: 'Junior' },
    { value: YearLevel.SENIOR, label: 'Senior' }
  ];

  // Colleges with abbreviations
  const colleges: { value: UPLBCollege; label: string; abbr: string }[] = [
    { value: UPLBCollege.CAFS, label: 'College of Agriculture and Food Science', abbr: 'CAFS' },
    { value: UPLBCollege.CAS, label: 'College of Arts and Sciences', abbr: 'CAS' },
    { value: UPLBCollege.CDC, label: 'College of Development Communication', abbr: 'CDC' },
    { value: UPLBCollege.CEM, label: 'College of Economics and Management', abbr: 'CEM' },
    { value: UPLBCollege.CEAT, label: 'College of Engineering and Agro-Industrial Technology', abbr: 'CEAT' },
    { value: UPLBCollege.CFNR, label: 'College of Forestry and Natural Resources', abbr: 'CFNR' },
    { value: UPLBCollege.CHE, label: 'College of Human Ecology', abbr: 'CHE' },
    { value: UPLBCollege.CVM, label: 'College of Veterinary Medicine', abbr: 'CVM' },
    { value: UPLBCollege.CPAF, label: 'College of Public Affairs and Development', abbr: 'CPAF' },
    { value: UPLBCollege.GS, label: 'Graduate School', abbr: 'GS' }
  ];

  // Toggle array filter value
  const toggleArrayValue = <T,>(array: T[] | undefined, value: T): T[] => {
    const current = array || [];
    if (current.includes(value)) {
      return current.filter(v => v !== value);
    }
    return [...current, value];
  };

  // Count active filters
  const activeFilterCount = 
    (filters.scholarshipTypes?.length || 0) +
    (filters.colleges?.length || 0) +
    (filters.yearLevels?.length || 0) +
    (filters.minAmount !== undefined ? 1 : 0) +
    (filters.maxAmount !== undefined ? 1 : 0) +
    (filters.showEligibleOnly ? 1 : 0);

  // Filter button component
  const FilterButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    count?: number;
    onClick: () => void;
  }> = ({ label, icon, isActive, count, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        isActive || (count && count > 0)
          ? 'bg-uplb-50 border-uplb-300 text-uplb-700 shadow-sm'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count && count > 0 && (
        <span className="w-5 h-5 rounded-full bg-uplb-600 text-white text-xs flex items-center justify-center">
          {count}
        </span>
      )}
      <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === label.toLowerCase() ? 'rotate-180' : ''}`} />
    </button>
  );

  // Dropdown component
  const Dropdown: React.FC<{
    id: string;
    children: React.ReactNode;
  }> = ({ id, children }) => {
    if (activeDropdown !== id) return null;
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 min-w-[240px] max-h-[320px] overflow-y-auto">
        {children}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 ${className}`} ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-slate-500 pr-3 border-r border-slate-200">
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Filters</span>
        </div>

        {/* Eligible Only Toggle */}
        {showEligibleToggle && (
          <button
            onClick={() => onFilterChange({ showEligibleOnly: !filters.showEligibleOnly })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              filters.showEligibleOnly
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {filters.showEligibleOnly && <Check className="w-4 h-4" />}
            <span>Eligible Only</span>
          </button>
        )}

        {/* Scholarship Type Filter */}
        <div className="relative">
          <FilterButton
            label="Type"
            icon={<Award className="w-4 h-4" />}
            isActive={activeDropdown === 'type'}
            count={filters.scholarshipTypes?.length}
            onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')}
          />
          <Dropdown id="type">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Scholarship Type
              </div>
              {scholarshipTypes.map(type => (
                <label
                  key={type.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.scholarshipTypes?.includes(type.value) ?? false}
                    onChange={() => onFilterChange({
                      scholarshipTypes: toggleArrayValue(filters.scholarshipTypes, type.value)
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-uplb-600 focus:ring-uplb-500"
                  />
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${type.color}`}>
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </Dropdown>
        </div>

        {/* Year Level Filter */}
        <div className="relative">
          <FilterButton
            label="Year Level"
            icon={<GraduationCap className="w-4 h-4" />}
            isActive={activeDropdown === 'year level'}
            count={filters.yearLevels?.length}
            onClick={() => setActiveDropdown(activeDropdown === 'year level' ? null : 'year level')}
          />
          <Dropdown id="year level">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Year Level
              </div>
              {yearLevels.map(level => (
                <label
                  key={level.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.yearLevels?.includes(level.value) ?? false}
                    onChange={() => onFilterChange({
                      yearLevels: toggleArrayValue(filters.yearLevels, level.value)
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-uplb-600 focus:ring-uplb-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">{level.label}</span>
                </label>
              ))}
            </div>
          </Dropdown>
        </div>

        {/* College Filter */}
        <div className="relative">
          <FilterButton
            label="College"
            icon={<Users className="w-4 h-4" />}
            isActive={activeDropdown === 'college'}
            count={filters.colleges?.length}
            onClick={() => setActiveDropdown(activeDropdown === 'college' ? null : 'college')}
          />
          <Dropdown id="college">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                College
              </div>
              {colleges.map(college => (
                <label
                  key={college.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.colleges?.includes(college.value) ?? false}
                    onChange={() => onFilterChange({
                      colleges: toggleArrayValue(filters.colleges, college.value)
                    })}
                    className="w-4 h-4 rounded border-slate-300 text-uplb-600 focus:ring-uplb-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-uplb-700">{college.abbr}</span>
                  </div>
                </label>
              ))}
            </div>
          </Dropdown>
        </div>

        {/* Amount Filter */}
        <div className="relative">
          <FilterButton
            label="Amount"
            icon={<DollarSign className="w-4 h-4" />}
            isActive={activeDropdown === 'amount'}
            count={(filters.minAmount !== undefined ? 1 : 0) + (filters.maxAmount !== undefined ? 1 : 0)}
            onClick={() => setActiveDropdown(activeDropdown === 'amount' ? null : 'amount')}
          />
          <Dropdown id="amount">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Grant Amount Range
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Minimum (₱)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount ?? ''}
                  onChange={(e) => onFilterChange({
                    minAmount: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-uplb-500 focus:border-uplb-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Maximum (₱)</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={filters.maxAmount ?? ''}
                  onChange={(e) => onFilterChange({
                    maxAmount: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-uplb-500 focus:border-uplb-500"
                />
              </div>
            </div>
          </Dropdown>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 border-l border-slate-200">
            <span className="text-xs text-slate-500">{activeFilterCount} active</span>
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear All
            </button>
          </div>
        )}

        {/* Results Count */}
        {resultCount !== undefined && (
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{resultCount}</span> scholarships
          </div>
        )}
      </div>

      {/* Selected Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          {filters.showEligibleOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              Eligible Only
              <button
                onClick={() => onFilterChange({ showEligibleOnly: false })}
                className="hover:bg-green-100 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filters.scholarshipTypes?.map(type => {
            const typeInfo = scholarshipTypes.find(t => t.value === type);
            return (
              <span
                key={type}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${typeInfo?.color || 'bg-slate-100 text-slate-700'}`}
              >
                {typeInfo?.label || type}
                <button
                  onClick={() => onFilterChange({
                    scholarshipTypes: filters.scholarshipTypes?.filter(t => t !== type)
                  })}
                  className="hover:opacity-70 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {filters.yearLevels?.map(level => (
            <span
              key={level}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium capitalize"
            >
              {level}
              <button
                onClick={() => onFilterChange({
                  yearLevels: filters.yearLevels?.filter(l => l !== level)
                })}
                className="hover:bg-slate-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {filters.colleges?.map(college => {
            const collegeInfo = colleges.find(c => c.value === college);
            return (
              <span
                key={college}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-uplb-50 text-uplb-700 rounded-full text-xs font-medium"
              >
                {collegeInfo?.abbr || college}
                <button
                  onClick={() => onFilterChange({
                    colleges: filters.colleges?.filter(c => c !== college)
                  })}
                  className="hover:bg-uplb-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {filters.minAmount !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-50 text-gold-700 rounded-full text-xs font-medium">
              Min: ₱{filters.minAmount.toLocaleString()}
              <button
                onClick={() => onFilterChange({ minAmount: undefined })}
                className="hover:bg-gold-100 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.maxAmount !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-50 text-gold-700 rounded-full text-xs font-medium">
              Max: ₱{filters.maxAmount.toLocaleString()}
              <button
                onClick={() => onFilterChange({ maxAmount: undefined })}
                className="hover:bg-gold-100 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default HorizontalFilterBar;
