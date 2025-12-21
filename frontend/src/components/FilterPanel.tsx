// ============================================================================
// ISKOlarship - FilterPanel Component
// Advanced filtering interface for scholarship search
// ============================================================================

import React, { useState } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  GraduationCap,
  Users,
  Award,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';
import { FilterCriteria, ScholarshipType, YearLevel, UPLBCollege } from '../types';

interface FilterPanelProps {
  filters: FilterCriteria;
  onFilterChange: (filters: Partial<FilterCriteria>) => void;
  onClearFilters: () => void;
  showEligibleToggle?: boolean;
  isCollapsible?: boolean;
  className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  showEligibleToggle = true,
  isCollapsible = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['type', 'amount', 'college', 'yearLevel'])
  );

  // Scholarship types using enum values
  const scholarshipTypes: ScholarshipType[] = [
    ScholarshipType.UNIVERSITY,
    ScholarshipType.COLLEGE,
    ScholarshipType.GOVERNMENT,
    ScholarshipType.PRIVATE,
    ScholarshipType.THESIS_GRANT
  ];

  // Year levels using enum values
  const yearLevels: YearLevel[] = [
    YearLevel.FRESHMAN,
    YearLevel.SOPHOMORE,
    YearLevel.JUNIOR,
    YearLevel.SENIOR
  ];

  // Colleges using enum values
  const colleges: UPLBCollege[] = [
    UPLBCollege.CAFS,
    UPLBCollege.CAS,
    UPLBCollege.CDC,
    UPLBCollege.CEM,
    UPLBCollege.CEAT,
    UPLBCollege.CFNR,
    UPLBCollege.CHE,
    UPLBCollege.CVM,
    UPLBCollege.CPAF,
    UPLBCollege.GS
  ];

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  // Toggle array filter value
  const toggleArrayValue = <T,>(array: T[] | undefined, value: T): T[] => {
    const current = array || [];
    if (current.includes(value)) {
      return current.filter(v => v !== value);
    }
    return [...current, value];
  };

  // Check if any filters are active
  const hasActiveFilters = 
    (filters.scholarshipTypes && filters.scholarshipTypes.length > 0) ||
    (filters.colleges && filters.colleges.length > 0) ||
    (filters.yearLevels && filters.yearLevels.length > 0) ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.showEligibleOnly;

  // Count active filters
  const activeFilterCount = 
    (filters.scholarshipTypes?.length || 0) +
    (filters.colleges?.length || 0) +
    (filters.yearLevels?.length || 0) +
    (filters.minAmount !== undefined ? 1 : 0) +
    (filters.maxAmount !== undefined ? 1 : 0) +
    (filters.showEligibleOnly ? 1 : 0);

  // Section header component
  const SectionHeader: React.FC<{ 
    title: string; 
    section: string; 
    icon: React.ReactNode;
    count?: number;
  }> = ({ title, section, icon, count }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-left"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {icon}
        {title}
        {count && count > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-semibold bg-uplb-100 text-uplb-700 rounded-full">
            {count}
          </span>
        )}
      </div>
      {expandedSections.has(section) ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  // Checkbox item component
  const CheckboxItem: React.FC<{
    label: string;
    checked: boolean;
    onChange: () => void;
  }> = ({ label, checked, onChange }) => (
    <button
      onClick={onChange}
      className="flex items-center gap-2 w-full py-1.5 text-left text-sm text-slate-600 hover:text-slate-900"
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-uplb-600 flex-shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-uplb-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            {isCollapsible && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Sections */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Eligible Only Toggle */}
          {showEligibleToggle && (
            <div className="pb-4 border-b border-slate-100">
              <button
                onClick={() => onFilterChange({ showEligibleOnly: !filters.showEligibleOnly })}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  filters.showEligibleOnly
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <span className={`text-sm font-medium ${
                  filters.showEligibleOnly ? 'text-green-700' : 'text-slate-700'
                }`}>
                  Show Eligible Only
                </span>
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  filters.showEligibleOnly ? 'bg-green-500' : 'bg-slate-300'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    filters.showEligibleOnly ? 'translate-x-4.5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </button>
            </div>
          )}

          {/* Scholarship Type */}
          <div className="border-b border-slate-100 pb-4">
            <SectionHeader
              title="Scholarship Type"
              section="type"
              icon={<Award className="w-4 h-4" />}
              count={filters.scholarshipTypes?.length}
            />
            {expandedSections.has('type') && (
              <div className="mt-2 space-y-1">
                {scholarshipTypes.map(type => (
                  <CheckboxItem
                    key={type}
                    label={type}
                    checked={filters.scholarshipTypes?.includes(type) ?? false}
                    onChange={() => onFilterChange({
                      scholarshipTypes: toggleArrayValue(filters.scholarshipTypes, type)
                    })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Amount Range */}
          <div className="border-b border-slate-100 pb-4">
            <SectionHeader
              title="Grant Amount"
              section="amount"
              icon={<DollarSign className="w-4 h-4" />}
              count={
                (filters.minAmount !== undefined ? 1 : 0) +
                (filters.maxAmount !== undefined ? 1 : 0)
              }
            />
            {expandedSections.has('amount') && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Minimum (₱)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minAmount ?? ''}
                    onChange={(e) => onFilterChange({
                      minAmount: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Maximum (₱)</label>
                  <input
                    type="number"
                    placeholder="Any"
                    value={filters.maxAmount ?? ''}
                    onChange={(e) => onFilterChange({
                      maxAmount: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="input text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Year Level */}
          <div className="border-b border-slate-100 pb-4">
            <SectionHeader
              title="Year Level"
              section="yearLevel"
              icon={<GraduationCap className="w-4 h-4" />}
              count={filters.yearLevels?.length}
            />
            {expandedSections.has('yearLevel') && (
              <div className="mt-2 space-y-1">
                {yearLevels.map(level => (
                  <CheckboxItem
                    key={level}
                    label={level}
                    checked={filters.yearLevels?.includes(level) ?? false}
                    onChange={() => onFilterChange({
                      yearLevels: toggleArrayValue(filters.yearLevels, level)
                    })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* College */}
          <div>
            <SectionHeader
              title="College"
              section="college"
              icon={<Users className="w-4 h-4" />}
              count={filters.colleges?.length}
            />
            {expandedSections.has('college') && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {colleges.map(college => {
                  // Get abbreviated form for display
                  const abbr = college.match(/\(([^)]+)\)/)?.[1] || college;
                  return (
                    <CheckboxItem
                      key={college}
                      label={abbr}
                      checked={filters.colleges?.includes(college) ?? false}
                      onChange={() => onFilterChange({
                        colleges: toggleArrayValue(filters.colleges, college)
                      })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;