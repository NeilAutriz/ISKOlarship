// ============================================================================
// ISKOlarship - Admin Profile Completion Wizard
// 3-step wizard for admin account setup
// ============================================================================

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Building2, 
  ChevronDown,
  Briefcase,
  Shield,
  Users,
  X,
  Upload,
  FileText,
  CheckCircle,
  Eye,
  File,
  Loader2
} from 'lucide-react';
import { UPLBCollege, AdminAccessLevel } from '../types';
import { 
  UPLBCollegeCode, 
  UPLBDepartments, 
  getDepartmentOptions,
  getCollegeCodeFromLegacy 
} from '../utils/uplbStructure';

interface EmployeeIdDocument {
  file: File | null;
  uploaded: boolean;
  error?: string;
  previewUrl?: string;
}

export interface AdminProfileData {
  // Step 1: Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  officeLocation: string;
  employeeIdDocument: EmployeeIdDocument;
  
  // Step 2: Administrative Details
  department: string;
  college: string;
  collegeCode: string;        // Code like 'CAS', 'CAFS' for linking
  academicUnit: string;       // Academic unit name (department/institute)
  academicUnitCode: string;   // Code like 'ICS', 'IMSP' for linking
  position: string;
  accessLevel: string;
  
  // Step 3: Responsibilities
  responsibilities: string;
  permissions: string[]; // Changed to permissions array matching database
}

interface AdminProfileCompletionProps {
  email: string;
  onComplete: (profileData: AdminProfileData) => void;
  onCancel: () => void;
}

const AdminProfileCompletion: React.FC<AdminProfileCompletionProps> = ({
  email,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const [formData, setFormData] = useState<AdminProfileData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: email,
    contactNumber: '',
    officeLocation: '',
    employeeIdDocument: {
      file: null,
      uploaded: false
    },
    department: '',
    college: '',
    collegeCode: '',
    academicUnit: '',
    academicUnitCode: '',
    position: '',
    accessLevel: '',
    responsibilities: '',
    permissions: [], // Changed to empty array
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateField = (field: keyof AdminProfileData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // When college changes, update collegeCode and clear academicUnit
      if (field === 'college') {
        updated.academicUnit = '';
        updated.academicUnitCode = '';
        if (typeof value === 'string' && value) {
          const collegeCode = getCollegeCodeFromLegacy(value);
          console.log('🏛️ Admin college selected:', value);
          console.log('🔍 College code lookup result:', collegeCode);
          if (collegeCode) {
            updated.collegeCode = collegeCode;
          } else {
            updated.collegeCode = '';
          }
        } else {
          updated.collegeCode = '';
        }
      }
      
      // When access level changes to university, clear college and academicUnit
      if (field === 'accessLevel' && value === AdminAccessLevel.UNIVERSITY) {
        updated.college = '';
        updated.collegeCode = '';
        updated.academicUnit = '';
        updated.academicUnitCode = '';
      }
      
      return updated;
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
        break;
      case 2:
        if (!formData.accessLevel) newErrors.accessLevel = 'Access level is required';
        if (!formData.position.trim()) newErrors.position = 'Position/title is required';
        
        // Department/Unit is required ONLY for university-wide access
        if (formData.accessLevel === AdminAccessLevel.UNIVERSITY && !formData.department.trim()) {
          newErrors.department = 'Department/Unit is required for university-wide access';
        }
        
        // College is required for college and academic unit level admins
        if ((formData.accessLevel === AdminAccessLevel.COLLEGE || formData.accessLevel === AdminAccessLevel.ACADEMIC_UNIT) && !formData.college) {
          newErrors.college = 'College is required for your access level';
        }
        // Academic unit is required for academic unit level admins
        if (formData.accessLevel === AdminAccessLevel.ACADEMIC_UNIT && !formData.academicUnitCode) {
          newErrors.academicUnit = 'Academic unit is required for your access level';
        }
        break;
      case 3:
        if (!formData.responsibilities.trim()) newErrors.responsibilities = 'Please describe your responsibilities';
        break;
      case 4:
        if (!formData.employeeIdDocument.uploaded) newErrors.employeeIdDocument = 'Employee ID document is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - submit form
        setSubmitting(true);
        setSubmitError('');
        try {
          await onComplete(formData);
        } catch (error: any) {
          console.error('Profile completion error:', error);
          const errorMsg = error.message || 'An error occurred while completing your profile. Please try again.';
          setSubmitError(errorMsg);
          setSubmitting(false);
          // Scroll to top to show error
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle employee ID document upload
  const handleEmployeeIdUpload = async (file: File | null) => {
    if (!file) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFormData(prev => ({
        ...prev,
        employeeIdDocument: {
          ...prev.employeeIdDocument,
          error: 'File size must be less than 5MB'
        }
      }));
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFormData(prev => ({
        ...prev,
        employeeIdDocument: {
          ...prev.employeeIdDocument,
          error: 'Only PDF, JPG, and PNG files are allowed'
        }
      }));
      return;
    }

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      setFormData(prev => ({
        ...prev,
        employeeIdDocument: {
          file,
          uploaded: true,
          previewUrl,
          error: undefined
        }
      }));
      
      // Clear error if exists
      if (errors.employeeIdDocument) {
        setErrors(prev => ({ ...prev, employeeIdDocument: '' }));
      }
    } catch (error) {
      setFormData(prev => ({
        ...prev,
        employeeIdDocument: {
          ...prev.employeeIdDocument,
          error: 'Failed to process file'
        }
      }));
    }
  };

  // Remove employee ID document
  const handleRemoveEmployeeId = () => {
    if (formData.employeeIdDocument.previewUrl) {
      URL.revokeObjectURL(formData.employeeIdDocument.previewUrl);
    }
    
    setFormData(prev => ({
      ...prev,
      employeeIdDocument: {
        file: null,
        uploaded: false,
        error: undefined,
        previewUrl: undefined
      }
    }));
  };

  // College options
  const colleges = [
    { value: '', label: 'University-wide / No specific college' },
    { value: UPLBCollege.CAFS, label: 'College of Agriculture and Food Science (CAFS)' },
    { value: UPLBCollege.CAS, label: 'College of Arts and Sciences (CAS)' },
    { value: UPLBCollege.CDC, label: 'College of Development Communication (CDC)' },
    { value: UPLBCollege.CEM, label: 'College of Economics and Management (CEM)' },
    { value: UPLBCollege.CEAT, label: 'College of Engineering and Agro-industrial Technology (CEAT)' },
    { value: UPLBCollege.CFNR, label: 'College of Forestry and Natural Resources (CFNR)' },
    { value: UPLBCollege.CHE, label: 'College of Human Ecology (CHE)' },
    { value: UPLBCollege.CVM, label: 'College of Veterinary Medicine (CVM)' },
    { value: UPLBCollege.GS, label: 'Graduate School (GS)' },
  ];

  // UPLB Administrative Departments & Units
  const departments = [
    'Office of the Chancellor',
    'Office of the Vice Chancellor for Academic Affairs (OVCAA)',
    'Office of the Vice Chancellor for Administration (OVCA)',
    'Office of the Vice Chancellor for Community Affairs (OVCCA)',
    'Office of the Vice Chancellor for Planning and Development (OVCPD)',
    'Office of the Vice Chancellor for Research and Extension (OVCRE)',
    'Office of Student Affairs (OSA)',
    'Scholarship and Financial Assistance Office',
    'Student Financial Assistance Division',
    'Office of Admissions',
    'University Registrar',
    'Human Resources Development Office',
    'Budget Office',
    'Accounting Office',
    'Other Department/Unit'
  ];

  // Admin positions
  const positions = [
    'Chancellor',
    'Vice Chancellor',
    'Dean',
    'Associate Dean',
    'Assistant Dean',
    'Department Chair',
    'Program Coordinator',
    'Scholarship Officer',
    'Financial Assistance Officer',
    'Student Affairs Officer',
    'Administrative Officer',
    'University Extension Specialist',
    'Faculty Member',
    'Staff',
    'Other Position'
  ];

  // Access levels
  const accessLevels = [
    { value: AdminAccessLevel.UNIVERSITY, label: 'University-wide Access', description: 'Manage all scholarships across UPLB' },
    { value: AdminAccessLevel.COLLEGE, label: 'College-level Access', description: 'Oversee scholarships within your college' },
    { value: AdminAccessLevel.ACADEMIC_UNIT, label: 'Academic Unit Access', description: 'Handle department/institute-specific scholarships' },
  ];

  const stepInfo = [
    { icon: User, label: 'Personal' },
    { icon: Building2, label: 'Administrative' },
    { icon: Shield, label: 'Permissions' },
    { icon: FileText, label: 'Upload' }
  ];

  const renderProgressBar = () => (
    <div className="mb-8">
      {/* Error Banner */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5">
              <X className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Registration Error</h4>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError('')}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Step indicators with icons */}
      <div className="flex justify-between mb-4">
        {stepInfo.map((step, index) => {
          const StepIcon = step.icon;
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          
          return (
            <div key={stepNum} className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                isCompleted ? 'bg-green-500 text-white' :
                isActive ? 'bg-primary-600 text-white shadow-lg scale-110' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-medium transition-all ${
                isActive ? 'text-primary-600' :
                isCompleted ? 'text-green-600' :
                'text-slate-400'
              }`}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="flex gap-1">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all ${
              i + 1 < currentStep ? 'bg-green-500' :
              i + 1 === currentStep ? 'bg-primary-600' :
              'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <User className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
          <p className="text-slate-500 text-sm">Basic contact details</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="Juan"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                  errors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              />
            </div>
            {errors.firstName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Dela Cruz"
                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                  errors.lastName ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              />
            </div>
            {errors.lastName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Middle Name (Optional)</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={formData.middleName}
              onChange={(e) => updateField('middleName', e.target.value)}
              placeholder="Santos"
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="admin@uplb.edu.ph"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Phone className="w-5 h-5" />
            </div>
            <input
              type="tel"
              value={formData.contactNumber}
              onChange={(e) => updateField('contactNumber', e.target.value)}
              placeholder="09171234567"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.contactNumber ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          {errors.contactNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.contactNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Office Location</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={formData.officeLocation}
              onChange={(e) => updateField('officeLocation', e.target.value)}
              placeholder="e.g., Room 201, Admin Building"
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
            />
          </div>
          <p className="text-slate-400 text-xs mt-1">Optional: Where students can find you</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Administrative Details</h3>
          <p className="text-slate-500 text-sm">Your role and organizational unit</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Access Level Selection - FIRST */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            Access Level
          </label>
          <p className="text-sm text-slate-600 mb-3">Select the appropriate level for your administrative role</p>
          <div className="space-y-3">
            {accessLevels.map((level) => (
              <div
                key={level.value}
                onClick={() => updateField('accessLevel', level.value)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.accessLevel === level.value
                    ? 'border-primary-600 bg-primary-50 shadow-sm'
                    : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    formData.accessLevel === level.value
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-slate-300'
                  }`}>
                    {formData.accessLevel === level.value && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 text-base">{level.label}</h4>
                    <p className="text-sm text-slate-600 mt-1">{level.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {errors.accessLevel && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.accessLevel}</p>}
        </div>

        {/* Department/Unit - Shows ONLY for University-wide Access */}
        {formData.accessLevel === AdminAccessLevel.UNIVERSITY && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              Department/Unit
            </label>
            <div className="relative">
              <select
                value={formData.department}
                onChange={(e) => updateField('department', e.target.value)}
                className={`w-full pl-4 pr-10 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer font-medium ${
                  errors.department 
                    ? 'border-red-300 bg-red-50 text-red-900' 
                    : formData.department 
                      ? 'border-primary-300 bg-primary-50 text-slate-900' 
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-primary-300 hover:bg-white'
                }`}
              >
                <option value="">Select your department/unit</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors ${
                formData.department ? 'text-primary-600' : 'text-slate-400'
              }`} />
            </div>
            {errors.department && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.department}</p>}
            <p className="text-slate-500 text-xs mt-1.5">
              Select the administrative office/unit you belong to
            </p>
          </div>
        )}

        {/* College Affiliation - Shows ONLY for College or Academic Unit Access */}
        {(formData.accessLevel === AdminAccessLevel.COLLEGE || formData.accessLevel === AdminAccessLevel.ACADEMIC_UNIT) && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              College Affiliation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.college}
                onChange={(e) => updateField('college', e.target.value)}
                className={`w-full pl-4 pr-10 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer font-medium ${
                  errors.college
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : formData.college 
                      ? 'border-primary-300 bg-primary-50 text-slate-900' 
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-primary-300 hover:bg-white'
                }`}
              >
                <option value="">Select your college</option>
                {colleges.filter(c => c.value !== '').map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors ${
                formData.college ? 'text-primary-600' : 'text-slate-400'
              }`} />
            </div>
            {errors.college && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.college}</p>}
            <p className="text-slate-500 text-xs mt-1.5">
              Required: This determines which scholarships you can manage
            </p>
          </div>
        )}

        {/* Academic Unit Selection - Shows only for college/academic_unit level admins with a college selected */}
        {formData.collegeCode && (formData.accessLevel === AdminAccessLevel.COLLEGE || formData.accessLevel === AdminAccessLevel.ACADEMIC_UNIT) && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              Academic Unit (Department/Institute)
              {formData.accessLevel === AdminAccessLevel.ACADEMIC_UNIT 
                ? <span className="text-red-500">*</span>
                : <span className="text-slate-400 font-normal">(Optional for College-level)</span>
              }
            </label>
            <div className="relative">
              <select
                value={formData.academicUnitCode}
                onChange={(e) => {
                  const unitCode = e.target.value;
                  console.log('🎯 Admin Academic Unit selected:', unitCode);
                  setFormData(prev => {
                    const depts = getDepartmentOptions(prev.collegeCode as UPLBCollegeCode);
                    const selectedUnit = depts.find(d => d.value === unitCode);
                    const unitName = selectedUnit ? selectedUnit.label.split(' - ')[1] || selectedUnit.label : '';
                    console.log('📝 Setting academicUnitCode:', unitCode);
                    console.log('📝 Setting academicUnit:', unitName);
                    return {
                      ...prev,
                      academicUnitCode: unitCode,
                      academicUnit: unitName
                    };
                  });
                  // Clear error
                  if (errors.academicUnit) {
                    setErrors(prev => ({ ...prev, academicUnit: '' }));
                  }
                }}
                className={`w-full pl-4 pr-10 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer font-medium ${
                  errors.academicUnit
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : formData.academicUnitCode 
                      ? 'border-primary-300 bg-primary-50 text-slate-900' 
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-primary-300 hover:bg-white'
                }`}
              >
                <option value="">Select your academic unit</option>
                {getDepartmentOptions(formData.collegeCode as UPLBCollegeCode).map((dept) => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors ${
                formData.academicUnitCode ? 'text-primary-600' : 'text-slate-400'
              }`} />
            </div>
            {errors.academicUnit && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.academicUnit}</p>}
            <p className="text-slate-500 text-xs mt-1.5">
              {formData.accessLevel === AdminAccessLevel.ACADEMIC_UNIT
                ? 'Required: This determines which scholarships you can manage'
                : 'Optional: Leave blank for college-wide access'
              }
            </p>
          </div>
        )}

        {/* Position/Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary-600" />
            Position/Title
          </label>
          <div className="relative">
            <select
              value={formData.position}
              onChange={(e) => updateField('position', e.target.value)}
              className={`w-full pl-4 pr-10 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer font-medium ${
                errors.position 
                  ? 'border-red-300 bg-red-50 text-red-900' 
                  : formData.position 
                    ? 'border-primary-300 bg-primary-50 text-slate-900' 
                    : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-primary-300 hover:bg-white'
              }`}
            >
              <option value="">Select your position</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors ${
              formData.position ? 'text-primary-600' : 'text-slate-400'
            }`} />
          </div>
          {errors.position && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.position}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Responsibilities & Permissions</h3>
          <p className="text-slate-500 text-sm">Define your role and capabilities</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Primary Responsibilities
          </label>
          <textarea
            value={formData.responsibilities}
            onChange={(e) => updateField('responsibilities', e.target.value)}
            placeholder="Describe your main duties (e.g., Managing scholarship programs, reviewing applications, coordinating with college units...)"
            rows={4}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none ${
              errors.responsibilities ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          />
          {errors.responsibilities && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.responsibilities}</p>}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            System Permissions
          </label>
          <p className="text-sm text-slate-600 mb-3">Select the permissions you need for your role</p>
          <div className="space-y-3">
            {[
              { value: 'manage_scholarships', label: 'Create & Manage Scholarships', description: 'Post new scholarship opportunities and edit existing ones' },
              { value: 'review_applications', label: 'Review Applications', description: 'View and review student applications' },
              { value: 'approve_applications', label: 'Approve Applications', description: 'Evaluate student applications and make decisions' },
              { value: 'manage_users', label: 'Manage Users & Admins', description: 'Add, edit, or remove user accounts (requires elevated privileges)' },
              { value: 'view_analytics', label: 'View Analytics', description: 'Access platform analytics and reports' },
              { value: 'system_settings', label: 'System Settings', description: 'Configure platform settings' },
            ].map((permission) => {
              const isChecked = formData.permissions.includes(permission.value);
              return (
                <div
                  key={permission.value}
                  onClick={() => {
                    if (isChecked) {
                      setFormData(prev => ({ ...prev, permissions: prev.permissions.filter(p => p !== permission.value) }));
                    } else {
                      setFormData(prev => ({ ...prev, permissions: [...prev.permissions, permission.value] }));
                    }
                  }}
                  className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    isChecked
                      ? 'border-primary-600 bg-primary-50 shadow-sm'
                      : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isChecked
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-slate-300'
                  }`}>
                    {isChecked && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 text-base">{permission.label}</h4>
                    <p className="text-sm text-slate-600 mt-1">{permission.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prominent Access Review Notice */}
        <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 mb-1">Access Review Required</h4>
              <p className="text-sm text-amber-800">
                Your administrative access and permissions will be reviewed and approved by the system administrator before activation. You will be notified once your account is verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Document Verification</h3>
          <p className="text-slate-500 text-sm">Upload your UPLB Employee ID for verification</p>
        </div>
      </div>

      {/* Important Verification Notice */}
      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Document Verification Required</h4>
            <p className="text-sm text-blue-800">
              Your employee ID will be verified by the system administrator to confirm your identity and authorization to manage scholarships. 
              This process typically takes 1-2 business days. You will receive an email notification once your account is approved.
            </p>
          </div>
        </div>
      </div>

      {/* Employee ID Document Upload */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          UPLB Employee ID <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-slate-600 mb-4">Upload a clear photo or scan of your official UPLB Employee ID card (front side)</p>
        
        {!formData.employeeIdDocument.uploaded ? (
          <label className="block">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleEmployeeIdUpload(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div className={`border-2 border-dashed rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer ${
              errors.employeeIdDocument ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}>
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-base text-slate-700 font-semibold mb-1">Click to upload Employee ID</p>
              <p className="text-sm text-slate-500">PDF, JPG, PNG (max 5MB)</p>
            </div>
          </label>
        ) : (
          <div className="space-y-3">
            {formData.employeeIdDocument.file && formData.employeeIdDocument.previewUrl && (
              <div 
                className="border-2 border-green-300 rounded-xl overflow-hidden cursor-pointer hover:border-green-500 transition-colors relative group"
                onClick={() => setPreviewModalOpen(true)}
              >
                {formData.employeeIdDocument.file.type === 'application/pdf' ? (
                  <div className="bg-slate-50 p-8 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-base text-slate-700 font-medium">PDF Document</p>
                      <p className="text-sm text-slate-500 mt-1">{formData.employeeIdDocument.file.name}</p>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={formData.employeeIdDocument.previewUrl} 
                    alt="Employee ID"
                    className="w-full h-64 object-contain bg-slate-50"
                  />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white rounded-full p-4">
                    <Eye className="w-8 h-8 text-slate-700" />
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formData.employeeIdDocument.file?.name}</p>
                  <p className="text-xs text-slate-600">
                    {formData.employeeIdDocument.file && (formData.employeeIdDocument.file.size / 1024 / 1024).toFixed(2)} MB • Ready for verification
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewModalOpen(true);
                  }}
                  className="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                  title="Preview document"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveEmployeeId();
                  }}
                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove document"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {errors.employeeIdDocument && (
          <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
            ⚠ {errors.employeeIdDocument}
          </p>
        )}
        {formData.employeeIdDocument.error && (
          <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
            ⚠ {formData.employeeIdDocument.error}
          </p>
        )}
      </div>

      {/* Guidelines */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Upload Guidelines:</h4>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-0.5">•</span>
            <span>Ensure the photo is clear and all text is readable</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-0.5">•</span>
            <span>ID card should be fully visible within the frame</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-0.5">•</span>
            <span>Accepted formats: PDF, JPG, PNG (maximum 5MB)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-0.5">•</span>
            <span>Your information will be kept confidential and secure</span>
          </li>
        </ul>
      </div>

      {/* Final Verification Notice */}
      <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-900 mb-1">What happens next?</h4>
            <p className="text-sm text-amber-800">
              After submission, a system administrator will review your employee ID and verify your credentials. 
              Once approved, you'll gain access to the scholarship management dashboard and all assigned permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary-600 mb-2">Complete Admin Profile</h1>
          <p className="text-slate-600">Set up your administrative account for scholarship management</p>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-6">
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={submitting}
            className={`flex-1 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              submitting 
                ? 'bg-slate-400 text-white cursor-not-allowed' 
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processing...
              </>
            ) : currentStep === totalSteps ? (
              <>
                <Check className="w-4 h-4" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Employee ID Preview Modal */}
      {previewModalOpen && formData.employeeIdDocument.previewUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-primary-600 text-white rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-lg">Employee ID Document</h3>
                  <p className="text-sm text-primary-100">Preview</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewModalOpen(false)} 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {formData.employeeIdDocument.file?.type === 'application/pdf' ? (
                <embed
                  src={formData.employeeIdDocument.previewUrl}
                  type="application/pdf"
                  className="w-full h-[600px] border-0 rounded-lg"
                />
              ) : (
                <img
                  src={formData.employeeIdDocument.previewUrl}
                  alt="Employee ID"
                  className="w-full h-auto rounded-lg"
                />
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfileCompletion;
