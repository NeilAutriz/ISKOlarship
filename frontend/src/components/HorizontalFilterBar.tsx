// ============================================================================
// ISKOlarship - HorizontalFilterBar Component
// Horizontal filter interface for scholarship search (space-efficient)
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  totalCount?: number;
  className?: string;
}

const HorizontalFilterBar: React.FC<HorizontalFilterBarProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  showEligibleToggle = true,
  resultCount,
  totalCount,
  className = ''
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local state for amount inputs — keeps typing smooth, syncs to parent on blur/debounce
  const [localMinAmount, setLocalMinAmount] = useState<string>(filters.minAmount !== undefined ? String(filters.minAmount) : '');
  const [localMaxAmount, setLocalMaxAmount] = useState<string>(filters.maxAmount !== undefined ? String(filters.maxAmount) : '');

  // Keep local amount state in sync when parent filters change externally (e.g. clear all)
  useEffect(() => {
    setLocalMinAmount(filters.minAmount !== undefined ? String(filters.minAmount) : '');
  }, [filters.minAmount]);
  useEffect(() => {
    setLocalMaxAmount(filters.maxAmount !== undefined ? String(filters.maxAmount) : '');
  }, [filters.maxAmount]);

  // Commit amount values to parent
  const commitMinAmount = useCallback(() => {
    const val = localMinAmount.trim();
    onFilterChange({ minAmount: val ? parseInt(val) : undefined });
  }, [localMinAmount, onFilterChange]);

  const commitMaxAmount = useCallback(() => {
    const val = localMaxAmount.trim();
    onFilterChange({ maxAmount: val ? parseInt(val) : undefined });
  }, [localMaxAmount, onFilterChange]);

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

  // Scholarship types - Clean color scheme with good contrast
  const scholarshipTypes: { value: ScholarshipType; label: string; color: string; activeColor: string }[] = [
    { value: ScholarshipType.UNIVERSITY, label: 'University', color: 'bg-blue-50 text-blue-700 border-blue-200', activeColor: 'bg-blue-600 text-white border-blue-600' },
    { value: ScholarshipType.COLLEGE, label: 'College', color: 'bg-teal-50 text-teal-700 border-teal-200', activeColor: 'bg-teal-600 text-white border-teal-600' },
    { value: ScholarshipType.GOVERNMENT, label: 'Government', color: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-600 text-white border-amber-600' },
    { value: ScholarshipType.PRIVATE, label: 'Private', color: 'bg-purple-50 text-purple-700 border-purple-200', activeColor: 'bg-purple-600 text-white border-purple-600' },
    { value: ScholarshipType.THESIS_GRANT, label: 'Thesis Grant', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeColor: 'bg-emerald-600 text-white border-emerald-600' }
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

  // Render a filter button (plain function returning JSX, NOT a component — avoids remount on re-render)
  const renderFilterButton = (label: string, icon: React.ReactNode, isActive: boolean, count: number | undefined, onClick: () => void) => (
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

  // Render a dropdown panel (plain function returning JSX, NOT a component — prevents input focus loss)
  const renderDropdown = (id: string, children: React.ReactNode) => {
    if (activeDropdown !== id) return null;
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 min-w-[240px] max-h-[320px] overflow-y-auto">
        {children}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 ${className}`} ref={dropdownRef}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Icon */}
          <div className="flex items-center gap-2 text-slate-600 pr-3 border-r border-slate-200">
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
          {renderFilterButton("Type", <Award className="w-4 h-4" />, activeDropdown === 'type', filters.scholarshipTypes?.length, () => setActiveDropdown(activeDropdown === 'type' ? null : 'type'))}
          {renderDropdown("type",
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Scholarship Type
              </div>
              {scholarshipTypes.map(type => {
                const isSelected = filters.scholarshipTypes?.includes(type.value) ?? false;
                return (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onFilterChange({
                        scholarshipTypes: toggleArrayValue(filters.scholarshipTypes, type.value)
                      })}
                      className="w-4 h-4 rounded border-slate-300 text-uplb-600 focus:ring-uplb-500"
                    />
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${isSelected ? type.activeColor : type.color} border`}>
                      {type.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Year Level Filter */}
        <div className="relative">
          {renderFilterButton("Year Level", <GraduationCap className="w-4 h-4" />, activeDropdown === 'year level', filters.yearLevels?.length, () => setActiveDropdown(activeDropdown === 'year level' ? null : 'year level'))}
          {renderDropdown("year level",
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
          )}
        </div>

        {/* College Filter */}
        <div className="relative">
          {renderFilterButton("College", <Users className="w-4 h-4" />, activeDropdown === 'college', filters.colleges?.length, () => setActiveDropdown(activeDropdown === 'college' ? null : 'college'))}
          {renderDropdown("college",
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
          )}
        </div>

        {/* Amount Filter */}
        <div className="relative">
          {renderFilterButton("Amount", <DollarSign className="w-4 h-4" />, activeDropdown === 'amount', (filters.minAmount !== undefined ? 1 : 0) + (filters.maxAmount !== undefined ? 1 : 0), () => setActiveDropdown(activeDropdown === 'amount' ? null : 'amount'))}
          {renderDropdown("amount",
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Grant Amount Range
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Minimum (₱)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={localMinAmount}
                  onChange={(e) => setLocalMinAmount(e.target.value)}
                  onBlur={commitMinAmount}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitMinAmount(); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-uplb-500 focus:border-uplb-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Maximum (₱)</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={localMaxAmount}
                  onChange={(e) => setLocalMaxAmount(e.target.value)}
                  onBlur={commitMaxAmount}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitMaxAmount(); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-uplb-500 focus:border-uplb-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 border-l border-slate-200">
            <span className="text-xs text-slate-500">{activeFilterCount} active</span>
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        )}
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
          {totalCount !== undefined && (
            <div className="text-center px-3">
              <div className="text-lg font-bold text-slate-900">{totalCount}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
          )}
          {resultCount !== undefined && (
            <div className="text-center px-3 py-1 bg-primary-50 rounded-lg">
              <div className="text-lg font-bold text-primary-700">{resultCount}</div>
              <div className="text-xs text-primary-600">Showing</div>
            </div>
          )}
        </div>
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
