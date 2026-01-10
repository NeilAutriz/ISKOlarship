// ============================================================================
// ISKOlarship - Add Scholarship Form
// User-friendly scholarship creation with dropdown selections
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  GraduationCap,
  Building2,
  Calendar,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { scholarshipApi } from '../../services/apiClient';
import { UPLBCollege, UPLBCourses, AgricultureMajor } from '../../types';

// ============================================================================
// Constants & Data Sources
// ============================================================================

// Scholarship Types
const ScholarshipTypes = [
  'University Scholarship',
  'College Scholarship',
  'Government Scholarship',
  'Private Scholarship',
  'Thesis/Research Grant'
];

// Year Levels
const YearLevels = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

// ST Brackets
const STBrackets = ['Full Discount with Stipend', 'Full Discount', 'PD80', 'PD60', 'PD40', 'PD20', 'No Discount'];

// UPLB Colleges (human-readable names)
const CollegeNames: Record<UPLBCollege, string> = {
  [UPLBCollege.CAS]: 'College of Arts and Sciences',
  [UPLBCollege.CAFS]: 'College of Agriculture and Food Science',
  [UPLBCollege.CEM]: 'College of Economics and Management',
  [UPLBCollege.CEAT]: 'College of Engineering and Agro-Industrial Technology',
  [UPLBCollege.CFNR]: 'College of Forestry and Natural Resources',
  [UPLBCollege.CHE]: 'College of Human Ecology',
  [UPLBCollege.CVM]: 'College of Veterinary Medicine',
  [UPLBCollege.CDC]: 'College of Development Communication',
  [UPLBCollege.CPAF]: 'College of Public Affairs and Development',
  [UPLBCollege.GS]: 'Graduate School'
};

// Agriculture Majors (for BS Agriculture students)
const AgricultureMajors = [
  AgricultureMajor.ANIMAL_SCIENCE,
  AgricultureMajor.CROP_PROTECTION,
  AgricultureMajor.CROP_SCIENCE,
  AgricultureMajor.SOIL_SCIENCE,
  AgricultureMajor.HORTICULTURE,
  AgricultureMajor.ENTOMOLOGY,
  AgricultureMajor.PLANT_PATHOLOGY,
  AgricultureMajor.WEED_SCIENCE
];

// Philippine Provinces
const PhilippineProvinces = [
  'Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao',
  'Aurora', 'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol',
  'Bukidnon', 'Bulacan', 'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin',
  'Capiz', 'Catanduanes', 'Cavite', 'Cebu', 'Cotabato', 'Davao de Oro', 'Davao del Norte',
  'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands', 'Eastern Samar',
  'Guimaras', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Iloilo', 'Isabela', 'Kalinga',
  'La Union', 'Laguna', 'Lanao del Norte', 'Lanao del Sur', 'Leyte', 'Maguindanao',
  'Marinduque', 'Masbate', 'Metro Manila (NCR)', 'Misamis Occidental', 'Misamis Oriental',
  'Mountain Province', 'Negros Occidental', 'Negros Oriental', 'Northern Samar', 'Nueva Ecija',
  'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Pampanga', 'Pangasinan',
  'Quezon', 'Quirino', 'Rizal', 'Romblon', 'Samar', 'Sarangani', 'Siquijor', 'Sorsogon',
  'South Cotabato', 'Southern Leyte', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte',
  'Surigao del Sur', 'Tarlac', 'Tawi-Tawi', 'Zambales', 'Zamboanga del Norte',
  'Zamboanga del Sur', 'Zamboanga Sibugay'
];

// Standard Scholarship Documents with descriptions
const StandardDocuments = [
  { name: 'Transcript of Records (TOR)', description: 'Official transcript with registrar seal', isRequired: true },
  { name: 'Certificate of Registration', description: 'Current semester enrollment proof', isRequired: true },
  { name: 'Letter of Recommendation', description: 'From a faculty member or administrator', isRequired: false },
  { name: 'Personal Statement/Essay', description: 'Statement of purpose or motivation', isRequired: true },
  { name: 'Income Tax Return (ITR)', description: 'Family income proof (if applicable)', isRequired: false },
  { name: 'Certificate of Indigency', description: 'From barangay (for need-based scholarships)', isRequired: false },
  { name: 'Birth Certificate', description: 'PSA-authenticated copy', isRequired: false },
  { name: 'Valid ID', description: 'Government-issued identification', isRequired: true },
  { name: '2x2 Photo', description: 'Recent ID photo', isRequired: true },
  { name: 'Approved Thesis Outline', description: 'For thesis/research grant applicants', isRequired: false }
];

// Generate academic years (current year and next 3 years)
const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 4; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    years.push(`${startYear}-${endYear}`);
  }
  return years;
};

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface ScholarshipFormData {
  name: string;
  description: string;
  sponsor: string;
  type: string;
  totalGrant: number;
  awardDescription: string;
  applicationDeadline: string;
  applicationStartDate: string;
  academicYear: string;
  semester: string;
  slots: number;
  eligibilityCriteria: {
    minGWA: number;
    maxGWA: number;
    eligibleClassifications: string[];
    minUnitsEnrolled: number;
    minUnitsPassed: number;
    eligibleColleges: string[];
    eligibleCourses: string[];
    eligibleMajors: string[];
    maxAnnualFamilyIncome: number;
    minAnnualFamilyIncome: number;
    eligibleSTBrackets: string[];
    eligibleProvinces: string[];
    eligibleCitizenship: string[];
    requiresApprovedThesisOutline: boolean;
    mustNotHaveOtherScholarship: boolean;
    mustNotHaveThesisGrant: boolean;
    mustNotHaveDisciplinaryAction: boolean;
    mustNotHaveFailingGrade: boolean;
    mustNotHaveGradeOf4: boolean;
    mustNotHaveIncompleteGrade: boolean;
    mustBeGraduating: boolean;
    additionalRequirements: Array<{ description: string; isRequired: boolean }>;
  };
  requiredDocuments: Array<{ name: string; description: string; isRequired: boolean }>;
  status: string;
}

const initialFormData: ScholarshipFormData = {
  name: '',
  description: '',
  sponsor: '',
  type: ScholarshipTypes[0],
  totalGrant: 0,
  awardDescription: '',
  applicationDeadline: '',
  applicationStartDate: '',
  academicYear: generateAcademicYears()[0],
  semester: 'First',
  slots: 1,
  eligibilityCriteria: {
    minGWA: 0,
    maxGWA: 5.0,
    eligibleClassifications: [],
    minUnitsEnrolled: 0,
    minUnitsPassed: 0,
    eligibleColleges: [],
    eligibleCourses: [],
    eligibleMajors: [],
    maxAnnualFamilyIncome: 0,
    minAnnualFamilyIncome: 0,
    eligibleSTBrackets: [],
    eligibleProvinces: [],
    eligibleCitizenship: ['Filipino'],
    requiresApprovedThesisOutline: false,
    mustNotHaveOtherScholarship: false,
    mustNotHaveThesisGrant: false,
    mustNotHaveDisciplinaryAction: false,
    mustNotHaveFailingGrade: false,
    mustNotHaveGradeOf4: false,
    mustNotHaveIncompleteGrade: false,
    mustBeGraduating: false,
    additionalRequirements: []
  },
  requiredDocuments: [],
  status: 'draft'
};

// ============================================================================
// Main Component
// ============================================================================

const AddScholarship: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ScholarshipFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Available courses based on selected colleges
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  
  // Custom inputs
  const [customRequirement, setCustomRequirement] = useState({ description: '', isRequired: true });
  const [customDocument, setCustomDocument] = useState({ name: '', description: '', isRequired: true });

  const totalSteps = 5;
  const academicYears = generateAcademicYears();

  // ============================================================================
  // Update available courses when colleges change
  // ============================================================================
  useEffect(() => {
    if (formData.eligibilityCriteria.eligibleColleges.length === 0) {
      // If no colleges selected, show all courses
      const allCourses = Object.values(UPLBCourses).flat();
      setAvailableCourses([...new Set(allCourses)]);
    } else {
      // Show only courses from selected colleges
      const courses: string[] = [];
      formData.eligibilityCriteria.eligibleColleges.forEach(college => {
        const collegeCourses = UPLBCourses[college as UPLBCollege] || [];
        courses.push(...collegeCourses);
      });
      setAvailableCourses([...new Set(courses)]);
      
      // Remove courses that are no longer valid
      const validCourses = formData.eligibilityCriteria.eligibleCourses.filter(
        course => courses.includes(course)
      );
      if (validCourses.length !== formData.eligibilityCriteria.eligibleCourses.length) {
        setFormData(prev => ({
          ...prev,
          eligibilityCriteria: {
            ...prev.eligibilityCriteria,
            eligibleCourses: validCourses
          }
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.eligibilityCriteria.eligibleColleges]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleEligibilityChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      eligibilityCriteria: {
        ...prev.eligibilityCriteria,
        [field]: value
      }
    }));
  };

  const handleBooleanToggle = (field: string) => {
    setFormData(prev => ({
      ...prev,
      eligibilityCriteria: {
        ...prev.eligibilityCriteria,
        [field]: !prev.eligibilityCriteria[field as keyof typeof prev.eligibilityCriteria]
      }
    }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    const currentArray = formData.eligibilityCriteria[field as keyof typeof formData.eligibilityCriteria] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    handleEligibilityChange(field, newArray);
  };

  const toggleDocumentSelection = (doc: typeof StandardDocuments[0]) => {
    const exists = formData.requiredDocuments.find(d => d.name === doc.name);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        requiredDocuments: prev.requiredDocuments.filter(d => d.name !== doc.name)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, doc]
      }));
    }
  };

  const addCustomDocument = () => {
    if (customDocument.name.trim()) {
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, customDocument]
      }));
      setCustomDocument({ name: '', description: '', isRequired: true });
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter((_, i) => i !== index)
    }));
  };

  const addCustomRequirement = () => {
    if (customRequirement.description.trim()) {
      handleEligibilityChange('additionalRequirements', [
        ...formData.eligibilityCriteria.additionalRequirements,
        customRequirement
      ]);
      setCustomRequirement({ description: '', isRequired: true });
    }
  };

  const removeRequirement = (index: number) => {
    handleEligibilityChange('additionalRequirements',
      formData.eligibilityCriteria.additionalRequirements.filter((_, i) => i !== index)
    );
  };

  // ============================================================================
  // Validation & Navigation
  // ============================================================================

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.name?.trim()) errors.name = 'Scholarship name is required';
        if (formData.name && formData.name.length > 200) errors.name = 'Name must not exceed 200 characters';
        if (!formData.sponsor?.trim()) errors.sponsor = 'Sponsor name is required';
        if (!formData.description?.trim()) errors.description = 'Description is required';
        if (formData.description && formData.description.length > 3000) errors.description = 'Description must not exceed 3000 characters';
        if (!formData.type) errors.type = 'Scholarship type is required';
        if (formData.totalGrant < 0) errors.totalGrant = 'Grant amount must be 0 or greater';
        if (formData.slots < 1) errors.slots = 'At least 1 slot is required';
        break;
        
      case 2:
        if (!formData.applicationDeadline) errors.applicationDeadline = 'Application deadline is required';
        if (formData.applicationDeadline && new Date(formData.applicationDeadline) < new Date()) {
          errors.applicationDeadline = 'Deadline must be in the future';
        }
        if (formData.applicationStartDate && formData.applicationDeadline) {
          if (new Date(formData.applicationStartDate) >= new Date(formData.applicationDeadline)) {
            errors.applicationStartDate = 'Start date must be before deadline';
          }
        }
        if (!formData.academicYear) errors.academicYear = 'Academic year is required';
        if (!formData.semester) errors.semester = 'Semester is required';
        break;
        
      case 3:
        if (formData.eligibilityCriteria.eligibleClassifications.length === 0) {
          errors.eligibleClassifications = 'Select at least one eligible year level';
        }
        if (formData.eligibilityCriteria.minGWA > 0 && formData.eligibilityCriteria.maxGWA > 0) {
          if (formData.eligibilityCriteria.minGWA > formData.eligibilityCriteria.maxGWA) {
            errors.minGWA = 'Min GWA must be less than or equal to Max GWA';
          }
        }
        if (formData.eligibilityCriteria.minAnnualFamilyIncome > 0 && formData.eligibilityCriteria.maxAnnualFamilyIncome > 0) {
          if (formData.eligibilityCriteria.minAnnualFamilyIncome > formData.eligibilityCriteria.maxAnnualFamilyIncome) {
            errors.minAnnualFamilyIncome = 'Min income must be less than or equal to Max income';
          }
        }
        break;
        
      case 4:
        if (formData.requiredDocuments.length === 0) {
          errors.requiredDocuments = 'Select at least one required document';
        }
        break;
        
      case 5:
        return true;
        
      default:
        return true;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      const firstError = Object.values(fieldErrors)[0];
      setError(firstError || 'Please fill in all required fields before proceeding.');
      toast.warning(firstError || 'Please complete all required fields', {
        position: 'top-right',
        autoClose: 4000
      });
      return;
    }
    setError('');
    setFieldErrors({});
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setError('');
    setFieldErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Helper function to get field error class
  const getFieldErrorClass = (fieldName: string) => {
    return fieldErrors[fieldName] 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500';
  };
  
  // Helper function to show field error message
  const showFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      return (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {fieldErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  // ============================================================================
  // Form Submission
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all steps before submission
    const allErrors: Record<string, string> = {};
    
    // Step 1 validation
    if (!formData.name?.trim()) {
      allErrors.name = 'Scholarship name is required';
      setCurrentStep(1);
    } else if (formData.name.length > 200) {
      allErrors.name = 'Name must not exceed 200 characters';
      setCurrentStep(1);
    }
    
    if (!formData.sponsor?.trim()) {
      allErrors.sponsor = 'Sponsor name is required';
      if (!allErrors.name) setCurrentStep(1);
    }
    
    if (!formData.description?.trim()) {
      allErrors.description = 'Description is required';
      if (!allErrors.name && !allErrors.sponsor) setCurrentStep(1);
    } else if (formData.description.length > 3000) {
      allErrors.description = 'Description must not exceed 3000 characters';
      if (!allErrors.name && !allErrors.sponsor) setCurrentStep(1);
    }
    
    if (!formData.type) {
      allErrors.type = 'Scholarship type is required';
      if (!allErrors.name && !allErrors.sponsor && !allErrors.description) setCurrentStep(1);
    }
    
    // Step 2 validation
    if (!formData.applicationDeadline) {
      allErrors.applicationDeadline = 'Application deadline is required';
      if (Object.keys(allErrors).length === 1) setCurrentStep(2);
    } else if (new Date(formData.applicationDeadline) < new Date()) {
      allErrors.applicationDeadline = 'Deadline must be in the future';
      if (Object.keys(allErrors).length === 1) setCurrentStep(2);
    }
    
    if (!formData.academicYear || !formData.semester) {
      allErrors.timeline = 'Academic year and semester are required';
      if (Object.keys(allErrors).length <= 2) setCurrentStep(2);
    }
    
    // Step 3 validation
    if (formData.eligibilityCriteria.eligibleClassifications.length === 0) {
      allErrors.eligibleClassifications = 'At least one eligible year level is required';
      if (Object.keys(allErrors).length <= 3) setCurrentStep(3);
    }
    
    // Step 4 validation
    if (formData.requiredDocuments.length === 0) {
      allErrors.requiredDocuments = 'At least one required document is required';
      if (Object.keys(allErrors).length <= 4) setCurrentStep(4);
    }
    
    // If there are any errors, show them and stop
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      const errorMessage = Object.values(allErrors)[0];
      setError(errorMessage);
      toast.error(`Please fix the following: ${errorMessage}`, {
        position: 'top-right',
        autoClose: 5000
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare scholarship data - CORE SCHEMA FIELDS ONLY
      const scholarshipData: any = {
        // Basic information
        name: formData.name.trim(),
        description: formData.description.trim(),
        sponsor: formData.sponsor.trim(),
        type: formData.type,
        totalGrant: formData.totalGrant,
        awardDescription: formData.awardDescription?.trim() || '',
        
        // Timeline - Convert date strings to ISO format
        applicationDeadline: formData.applicationDeadline ? new Date(formData.applicationDeadline).toISOString() : undefined,
        applicationStartDate: formData.applicationStartDate ? new Date(formData.applicationStartDate).toISOString() : undefined,
        academicYear: formData.academicYear,
        semester: formData.semester,
        
        // Capacity
        slots: formData.slots,
        filledSlots: 0,
        
        // Status
        status: formData.status,
        isActive: formData.status === 'active',
        
        // Eligibility criteria - Complete structure matching database schema
        eligibilityCriteria: {
          // Academic requirements
          ...(formData.eligibilityCriteria.minGWA > 0 && { minGWA: formData.eligibilityCriteria.minGWA }),
          ...(formData.eligibilityCriteria.maxGWA > 0 && formData.eligibilityCriteria.maxGWA < 5.0 && { maxGWA: formData.eligibilityCriteria.maxGWA }),
          eligibleClassifications: formData.eligibilityCriteria.eligibleClassifications,
          ...(formData.eligibilityCriteria.minUnitsEnrolled > 0 && { minUnitsEnrolled: formData.eligibilityCriteria.minUnitsEnrolled }),
          ...(formData.eligibilityCriteria.minUnitsPassed > 0 && { minUnitsPassed: formData.eligibilityCriteria.minUnitsPassed }),
          
          // College/course/major restrictions
          eligibleColleges: formData.eligibilityCriteria.eligibleColleges,
          eligibleCourses: formData.eligibilityCriteria.eligibleCourses,
          eligibleMajors: formData.eligibilityCriteria.eligibleMajors,
          
          // Financial requirements
          ...(formData.eligibilityCriteria.maxAnnualFamilyIncome > 0 && { maxAnnualFamilyIncome: formData.eligibilityCriteria.maxAnnualFamilyIncome }),
          ...(formData.eligibilityCriteria.minAnnualFamilyIncome > 0 && { minAnnualFamilyIncome: formData.eligibilityCriteria.minAnnualFamilyIncome }),
          
          // Location and demographic requirements
          eligibleSTBrackets: formData.eligibilityCriteria.eligibleSTBrackets,
          eligibleProvinces: formData.eligibilityCriteria.eligibleProvinces,
          eligibleCitizenship: formData.eligibilityCriteria.eligibleCitizenship,
          
          // Boolean restrictions
          requiresApprovedThesisOutline: formData.eligibilityCriteria.requiresApprovedThesisOutline,
          mustNotHaveOtherScholarship: formData.eligibilityCriteria.mustNotHaveOtherScholarship,
          mustNotHaveThesisGrant: formData.eligibilityCriteria.mustNotHaveThesisGrant,
          mustNotHaveDisciplinaryAction: formData.eligibilityCriteria.mustNotHaveDisciplinaryAction,
          mustNotHaveFailingGrade: formData.eligibilityCriteria.mustNotHaveFailingGrade,
          mustNotHaveGradeOf4: formData.eligibilityCriteria.mustNotHaveGradeOf4,
          mustNotHaveIncompleteGrade: formData.eligibilityCriteria.mustNotHaveIncompleteGrade,
          mustBeGraduating: formData.eligibilityCriteria.mustBeGraduating,
          
          // Additional custom requirements
          additionalRequirements: formData.eligibilityCriteria.additionalRequirements
        },
        
        // Required documents
        requiredDocuments: formData.requiredDocuments
      };

      console.log('📤 Sending scholarship data:', JSON.stringify(scholarshipData, null, 2));

      const response = await scholarshipApi.create(scholarshipData);
      
      console.log('📥 Received response:', response);
      
      if (response.success) {
        toast.success('🎓 Scholarship created successfully!', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
        
        // Navigate after a short delay to show the toast
        setTimeout(() => {
          navigate('/admin/scholarships');
        }, 500);
      } else {
        throw new Error(response.message || 'Failed to create scholarship');
      }
    } catch (err: any) {
      console.error('❌ Error creating scholarship:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      // Provide specific error messages based on response
      let errorMessage = '';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to create scholarships.';
      } else if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Invalid data provided';
        errorMessage = `Validation Error: ${errorMsg}`;
        // Log validation errors if available
        if (err.response?.data?.errors) {
          console.error('Validation errors:', err.response.data.errors);
        }
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/scholarships')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <GraduationCap className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Create New Scholarship</h1>
              <p className="text-sm text-slate-500">Step {currentStep} of {totalSteps}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Basic Info', icon: FileText },
              { num: 2, label: 'Timeline', icon: Calendar },
              { num: 3, label: 'Eligibility', icon: Users },
              { num: 4, label: 'Requirements', icon: CheckCircle },
              { num: 5, label: 'Review', icon: Eye }
            ].map(({ num, label, icon: Icon }) => (
              <React.Fragment key={num}>
                <div className={`flex flex-col items-center ${num <= currentStep ? 'text-primary-600' : 'text-slate-400'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold mb-2 transition-all
                    ${num < currentStep ? 'bg-primary-600 text-white shadow-lg' : 
                      num === currentStep ? 'bg-primary-600 text-white ring-4 ring-primary-100 shadow-lg' : 
                      'bg-slate-200'}`}>
                    {num < currentStep ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className="text-xs font-medium text-center">{label}</span>
                </div>
                {num < totalSteps && (
                  <div className={`flex-1 h-1 mx-2 mb-6 rounded transition-all ${num < currentStep ? 'bg-primary-600' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <form onSubmit={handleSubmit}>
            
            {/* ================================================================ */}
            {/* STEP 1: Basic Information */}
            {/* ================================================================ */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Basic Information</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter the core details of the scholarship program</p>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Scholarship Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${getFieldErrorClass('name')}`}
                      placeholder="e.g., Academic Excellence Scholarship 2024-2025"
                      maxLength={200}
                      required
                    />
                    {showFieldError('name')}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={6}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all resize-none ${getFieldErrorClass('description')}`}
                      placeholder="Provide a detailed description of the scholarship, its purpose, and benefits..."
                      maxLength={3000}
                      required
                    />
                    {showFieldError('description')}
                    <p className="mt-1 text-xs text-slate-500">{formData.description.length}/3000 characters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Sponsor/Provider <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="sponsor"
                        value={formData.sponsor}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${getFieldErrorClass('sponsor')}`}
                        placeholder="Organization or institution name"
                        required
                      />
                      {showFieldError('sponsor')}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Scholarship Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                        required
                      >
                        {ScholarshipTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Grant Amount (PHP)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
                        <input
                          type="number"
                          name="totalGrant"
                          value={formData.totalGrant}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          placeholder="50000"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Leave as 0 if amount varies</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Number of Slots
                      </label>
                      <input
                        type="number"
                        name="slots"
                        value={formData.slots}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Award Description
                    </label>
                    <input
                      type="text"
                      name="awardDescription"
                      value={formData.awardDescription}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="e.g., Full tuition coverage + ₱5,000 monthly stipend"
                    />
                    <p className="text-xs text-slate-500 mt-1">Brief description of what the scholarship covers</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Publication Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                    >
                      <option value="draft">Draft (Not visible to students)</option>
                      <option value="active">Active (Open for applications)</option>
                      <option value="closed">Closed (No longer accepting)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* STEP 2: Timeline & Contact */}
            {/* ================================================================ */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Timeline & Contact Information</h2>
                  <p className="text-sm text-slate-500 mt-1">Set application period and contact details</p>
                </div>
                
                <div className="space-y-6">
                  {/* Timeline Section */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-600" />
                      Application Period
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="academicYear"
                          value={formData.academicYear}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                          required
                        >
                          {academicYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Semester <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="semester"
                          value={formData.semester}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                          required
                        >
                          <option value="First">First Semester</option>
                          <option value="Second">Second Semester</option>
                          <option value="Midyear">Midyear</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Application Start Date
                        </label>
                        <input
                          type="date"
                          name="applicationStartDate"
                          value={formData.applicationStartDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Application Deadline <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="applicationDeadline"
                          value={formData.applicationDeadline}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* STEP 3: Eligibility Criteria */}
            {/* ================================================================ */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Eligibility Criteria</h2>
                  <p className="text-sm text-slate-500 mt-1">Define who is eligible for this scholarship</p>
                </div>

                <div className="space-y-6">
                  {/* Academic Requirements */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary-600" />
                      Academic Requirements
                    </h3>

                    <div className="space-y-4">
                      {/* GWA Range */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Minimum GWA
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.minGWA}
                            onChange={(e) => handleEligibilityChange('minGWA', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="1.0"
                            max="5.0"
                            step="0.01"
                            placeholder="1.00"
                          />
                          <p className="text-xs text-slate-500 mt-1">Leave as 0 if no requirement</p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Maximum GWA (Optional)
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.maxGWA}
                            onChange={(e) => handleEligibilityChange('maxGWA', parseFloat(e.target.value) || 5.0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="1.0"
                            max="5.0"
                            step="0.01"
                            placeholder="5.00"
                          />
                        </div>
                      </div>

                      {/* Unit Requirements */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Minimum Units Enrolled
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.minUnitsEnrolled}
                            onChange={(e) => handleEligibilityChange('minUnitsEnrolled', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="0"
                            placeholder="15"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Minimum Units Passed
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.minUnitsPassed}
                            onChange={(e) => handleEligibilityChange('minUnitsPassed', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="0"
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Year Level */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-3">
                      Eligible Year Levels <span className="text-red-500">*</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {YearLevels.map(level => (
                        <label
                          key={level}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.eligibilityCriteria.eligibleClassifications.includes(level)
                              ? 'border-primary-600 bg-primary-50 text-primary-700'
                              : 'border-slate-300 bg-white hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.eligibilityCriteria.eligibleClassifications.includes(level)}
                            onChange={() => toggleArrayItem('eligibleClassifications', level)}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Colleges & Courses */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary-600" />
                      Eligible Colleges & Programs
                    </h3>

                    {/* Colleges */}
                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Select Colleges (Optional - leave blank for all colleges)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(CollegeNames).map(([key, name]) => (
                          <label
                            key={key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                              formData.eligibilityCriteria.eligibleColleges.includes(key)
                                ? 'border-primary-600 bg-primary-50'
                                : 'border-slate-300 bg-white hover:border-primary-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.eligibilityCriteria.eligibleColleges.includes(key)}
                              onChange={() => toggleArrayItem('eligibleColleges', key)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm">{name}</span>
                          </label>
                        ))}
                      </div>
                      {formData.eligibilityCriteria.eligibleColleges.length > 0 && (
                        <p className="text-xs text-primary-600 mt-2">
                          {formData.eligibilityCriteria.eligibleColleges.length} college(s) selected
                        </p>
                      )}
                    </div>

                    {/* Courses */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Select Specific Courses/Programs (Optional)
                      </label>
                      {availableCourses.length > 0 ? (
                        <>
                          <div className="max-h-64 overflow-y-auto border border-slate-300 rounded-lg p-3 bg-white">
                            <div className="grid grid-cols-1 gap-2">
                              {availableCourses.map(course => (
                                <label
                                  key={course}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                    formData.eligibilityCriteria.eligibleCourses.includes(course)
                                      ? 'border-primary-600 bg-primary-50'
                                      : 'border-slate-200 hover:border-primary-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.eligibilityCriteria.eligibleCourses.includes(course)}
                                    onChange={() => toggleArrayItem('eligibleCourses', course)}
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                  />
                                  <span className="text-sm">{course}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          {formData.eligibilityCriteria.eligibleCourses.length > 0 && (
                            <p className="text-xs text-primary-600 mt-2">
                              {formData.eligibilityCriteria.eligibleCourses.length} course(s) selected
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500 italic">
                          {formData.eligibilityCriteria.eligibleColleges.length === 0
                            ? 'Select colleges first to filter available courses'
                            : 'No courses available for selected colleges'}
                        </p>
                      )}
                    </div>

                    {/* Agriculture Majors (conditional) */}
                    {formData.eligibilityCriteria.eligibleCourses.includes('BS Agriculture') && (
                      <div className="mt-5 pt-5 border-t border-slate-300">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          BS Agriculture Majors (Optional)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {AgricultureMajors.map(major => (
                            <label
                              key={major}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                formData.eligibilityCriteria.eligibleMajors.includes(major)
                                  ? 'border-primary-600 bg-primary-50'
                                  : 'border-slate-300 bg-white hover:border-primary-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.eligibilityCriteria.eligibleMajors.includes(major)}
                                onChange={() => toggleArrayItem('eligibleMajors', major)}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm">{major}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial & Demographics */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary-600" />
                      Financial & Demographics
                    </h3>

                    <div className="space-y-4">
                      {/* Income Range */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Minimum Annual Family Income (PHP)
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.minAnnualFamilyIncome}
                            onChange={(e) => handleEligibilityChange('minAnnualFamilyIncome', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="0"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Maximum Annual Family Income (PHP)
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.maxAnnualFamilyIncome}
                            onChange={(e) => handleEligibilityChange('maxAnnualFamilyIncome', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="0"
                            placeholder="500000"
                          />
                          <p className="text-xs text-slate-500 mt-1">Leave as 0 if no requirement</p>
                        </div>
                      </div>

                      {/* ST Brackets */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Eligible Socialized Tuition (ST) Brackets
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                          {STBrackets.map(bracket => (
                            <label
                              key={bracket}
                              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                                formData.eligibilityCriteria.eligibleSTBrackets.includes(bracket)
                                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                                  : 'border-slate-300 bg-white hover:border-primary-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.eligibilityCriteria.eligibleSTBrackets.includes(bracket)}
                                onChange={() => toggleArrayItem('eligibleSTBrackets', bracket)}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm font-medium">{bracket}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Provinces */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Eligible Provinces (Optional - leave blank for all provinces)
                        </label>
                        <div className="max-h-64 overflow-y-auto border border-slate-300 rounded-lg p-3 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {PhilippineProvinces.map(province => (
                              <label
                                key={province}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                  formData.eligibilityCriteria.eligibleProvinces.includes(province)
                                    ? 'border-primary-600 bg-primary-50'
                                    : 'border-slate-200 hover:border-primary-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.eligibilityCriteria.eligibleProvinces.includes(province)}
                                  onChange={() => toggleArrayItem('eligibleProvinces', province)}
                                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <span className="text-sm">{province}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {formData.eligibilityCriteria.eligibleProvinces.length > 0 && (
                          <p className="text-xs text-primary-600 mt-2">
                            {formData.eligibilityCriteria.eligibleProvinces.length} province(s) selected
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Restrictions & Special Requirements */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">Restrictions & Special Requirements</h3>
                    
                    <div className="space-y-3">
                      {[
                        { field: 'requiresApprovedThesisOutline', label: 'Requires Approved Thesis Outline' },
                        { field: 'mustNotHaveOtherScholarship', label: 'Must NOT have other scholarships' },
                        { field: 'mustNotHaveThesisGrant', label: 'Must NOT have thesis grant' },
                        { field: 'mustNotHaveDisciplinaryAction', label: 'Must NOT have disciplinary action' },
                        { field: 'mustNotHaveFailingGrade', label: 'Must NOT have failing grades' },
                        { field: 'mustNotHaveGradeOf4', label: 'Must NOT have grade of 4.0' },
                        { field: 'mustNotHaveIncompleteGrade', label: 'Must NOT have incomplete grades' },
                        { field: 'mustBeGraduating', label: 'Must be graduating student' }
                      ].map(({ field, label }) => (
                        <label
                          key={field}
                          className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg cursor-pointer hover:border-primary-500 transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={formData.eligibilityCriteria[field as keyof typeof formData.eligibilityCriteria] as boolean}
                            onChange={() => handleBooleanToggle(field)}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Additional Requirements */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">Additional Requirements</h3>
                    
                    {formData.eligibilityCriteria.additionalRequirements.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formData.eligibilityCriteria.additionalRequirements.map((req, index) => (
                          <div key={index} className="flex items-start gap-2 px-4 py-3 bg-white rounded-lg border border-slate-300">
                            <div className="flex-1">
                              <p className="text-sm text-slate-700">{req.description}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {req.isRequired ? 'Required' : 'Optional'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRequirement(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={customRequirement.description}
                        onChange={(e) => setCustomRequirement({ ...customRequirement, description: e.target.value })}
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Enter additional requirement..."
                      />
                      <select
                        value={customRequirement.isRequired.toString()}
                        onChange={(e) => setCustomRequirement({ ...customRequirement, isRequired: e.target.value === 'true' })}
                        className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        <option value="true">Required</option>
                        <option value="false">Optional</option>
                      </select>
                      <button
                        type="button"
                        onClick={addCustomRequirement}
                        className="px-5 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* STEP 4: Required Documents */}
            {/* ================================================================ */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Required Documents</h2>
                  <p className="text-sm text-slate-500 mt-1">Select standard documents and add custom requirements</p>
                </div>

                <div className="space-y-5">
                  {/* Standard Documents Checklist */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      Standard Scholarship Documents
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {StandardDocuments.map((doc, index) => (
                        <label
                          key={index}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.requiredDocuments.find(d => d.name === doc.name)
                              ? 'border-primary-600 bg-primary-50'
                              : 'border-slate-300 bg-white hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!formData.requiredDocuments.find(d => d.name === doc.name)}
                            onChange={() => toggleDocumentSelection(doc)}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                              {doc.isRequired && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                  Usually Required
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{doc.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {formData.requiredDocuments.filter(d => StandardDocuments.find(sd => sd.name === d.name)).length > 0 && (
                      <p className="text-sm text-primary-600 mt-4 font-medium">
                        {formData.requiredDocuments.filter(d => StandardDocuments.find(sd => sd.name === d.name)).length} standard document(s) selected
                      </p>
                    )}
                  </div>

                  {/* Selected Documents */}
                  {formData.requiredDocuments.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                      <h3 className="text-base font-semibold text-green-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Selected Documents ({formData.requiredDocuments.length})
                      </h3>
                      <div className="space-y-2">
                        {formData.requiredDocuments.map((doc, index) => (
                          <div key={index} className="flex items-start gap-2 px-4 py-3 bg-white rounded-lg border border-green-300">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{doc.description || 'No description'}</p>
                              <p className="text-xs text-green-600 mt-1 font-medium">
                                {doc.isRequired ? 'Required' : 'Optional'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Documents */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">Add Custom Document</h3>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={customDocument.name}
                        onChange={(e) => setCustomDocument({ ...customDocument, name: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="Document name (e.g., Portfolio, Awards Certificate)"
                      />
                      
                      <textarea
                        value={customDocument.description}
                        onChange={(e) => setCustomDocument({ ...customDocument, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                        placeholder="Brief description of the document"
                      />

                      <div className="flex gap-3">
                        <select
                          value={customDocument.isRequired.toString()}
                          onChange={(e) => setCustomDocument({ ...customDocument, isRequired: e.target.value === 'true' })}
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="true">Required Document</option>
                          <option value="false">Optional Document</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={addCustomDocument}
                          disabled={!customDocument.name.trim()}
                          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                            customDocument.name.trim()
                              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-5 h-5" />
                          Add Document
                        </button>
                      </div>
                    </div>
                  </div>

                  {formData.requiredDocuments.length === 0 && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
                      <p className="text-amber-800 text-sm flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Please select at least one document requirement before proceeding
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* STEP 5: Review & Submit */}
            {/* ================================================================ */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Review & Submit</h2>
                  <p className="text-sm text-slate-500 mt-1">Review all details before creating the scholarship</p>
                </div>

                <div className="space-y-4">
                  {/* Basic Information Review */}
                  <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-5 border border-primary-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white rounded-lg p-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Name</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">{formData.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Sponsor</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">{formData.sponsor || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Type</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">{formData.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Grant Amount</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">
                          {formData.totalGrant > 0 ? `₱${formData.totalGrant.toLocaleString()}` : 'Varies'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Slots</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">{formData.slots}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Status</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                          formData.status === 'active' ? 'bg-green-100 text-green-700' :
                          formData.status === 'closed' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Description</p>
                        <p className="text-sm text-slate-700 mt-1 leading-relaxed">{formData.description}</p>
                      </div>
                      {formData.awardDescription && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Award Details</p>
                          <p className="text-sm text-slate-700 mt-1">{formData.awardDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Review */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-600" />
                      Timeline & Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white rounded-lg p-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Academic Year</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">{formData.academicYear}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Semester</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">{formData.semester} Semester</p>
                      </div>
                      {formData.applicationStartDate && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Start Date</p>
                          <p className="text-sm text-slate-800 font-medium mt-1">
                            {new Date(formData.applicationStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Deadline</p>
                        <p className="text-sm text-slate-800 font-medium mt-1">
                          {formData.applicationDeadline ? new Date(formData.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Review */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-600" />
                      Eligibility Criteria
                    </h3>
                    <div className="space-y-3 bg-white rounded-lg p-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Year Levels</p>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.eligibilityCriteria.eligibleClassifications.length > 0 ? (
                            formData.eligibilityCriteria.eligibleClassifications.map(level => (
                              <span key={level} className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold">
                                {level}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500 italic">All year levels eligible</span>
                          )}
                        </div>
                      </div>
                      
                      {(formData.eligibilityCriteria.minGWA > 0 || formData.eligibilityCriteria.minUnitsEnrolled > 0) && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                          {formData.eligibilityCriteria.minGWA > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Min GWA</p>
                              <p className="text-sm text-slate-800 font-medium mt-1">{formData.eligibilityCriteria.minGWA.toFixed(2)}</p>
                            </div>
                          )}
                          {formData.eligibilityCriteria.minUnitsEnrolled > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Min Units</p>
                              <p className="text-sm text-slate-800 font-medium mt-1">{formData.eligibilityCriteria.minUnitsEnrolled}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {formData.eligibilityCriteria.eligibleColleges.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Colleges</p>
                          <div className="flex flex-wrap gap-1.5">
                            {formData.eligibilityCriteria.eligibleColleges.slice(0, 3).map(college => (
                              <span key={college} className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                                {college}
                              </span>
                            ))}
                            {formData.eligibilityCriteria.eligibleColleges.length > 3 && (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                                +{formData.eligibilityCriteria.eligibleColleges.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {formData.eligibilityCriteria.eligibleCourses.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Courses</p>
                          <p className="text-sm text-slate-700">{formData.eligibilityCriteria.eligibleCourses.length} program(s) selected</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {formData.eligibilityCriteria.eligibleCourses.slice(0, 3).map(course => (
                              <span key={course} className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                                {course}
                              </span>
                            ))}
                            {formData.eligibilityCriteria.eligibleCourses.length > 3 && (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                                +{formData.eligibilityCriteria.eligibleCourses.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {formData.eligibilityCriteria.eligibleSTBrackets.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">ST Brackets</p>
                          <div className="flex flex-wrap gap-1.5">
                            {formData.eligibilityCriteria.eligibleSTBrackets.map(bracket => (
                              <span key={bracket} className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                                {bracket}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.eligibilityCriteria.eligibleProvinces.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Provinces</p>
                          <p className="text-sm text-slate-700 mt-1">{formData.eligibilityCriteria.eligibleProvinces.length} province(s) selected</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Required Documents Review */}
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary-600" />
                      Required Documents ({formData.requiredDocuments.length})
                    </h3>
                    {formData.requiredDocuments.length > 0 ? (
                      <div className="bg-white rounded-lg p-4">
                        <ul className="space-y-2">
                          {formData.requiredDocuments.map((doc, index) => (
                            <li key={index} className="flex items-start gap-2 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                  doc.isRequired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {doc.isRequired ? 'Required' : 'Optional'}
                                </span>
                                {doc.description && (
                                  <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-slate-500 italic">No documents specified</p>
                      </div>
                    )}
                  </div>

                  {/* Final Note */}
                  <div className="bg-primary-600 text-white rounded-xl p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold mb-1">Ready to Submit?</p>
                        <p className="text-sm opacity-90 leading-relaxed">
                          Please review all information carefully. Once created, you can edit this scholarship from the Admin Scholarships page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevStep();
                }}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  currentStep === 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-sm'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/scholarships')}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                >
                  Cancel
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      nextStep();
                    }}
                    className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Create Scholarship
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddScholarship;
