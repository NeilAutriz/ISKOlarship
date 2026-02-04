// ============================================================================
// ISKOlarship - Add Scholarship Form
// User-friendly scholarship creation with dropdown selections
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { scholarshipApi, userApi } from '../../services/apiClient';
import { 
  UPLBCollege, 
  UPLBCourses, 
  AgricultureMajor,
  CustomCondition,
  ConditionType,
  RangeOperator,
  BooleanOperator,
  ListOperator,
  ConditionCategory,
  ConditionImportance,
  STUDENT_PROFILE_FIELDS
} from '../../types';
import { 
  UPLBCollegeCode, 
  getCollegeOptions, 
  getDepartmentOptions,
  UPLBColleges,
  UPLBDepartments
} from '../../utils/uplbStructure';

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

// Helper function to normalize scholarship type from old format to new format
const normalizeScholarshipType = (type: string | undefined): string => {
  if (!type) return ScholarshipTypes[0];
  
  // If it's already a valid full format, return it
  if (ScholarshipTypes.includes(type)) return type;
  
  // Map old lowercase/short formats to new full formats
  const typeMapping: Record<string, string> = {
    'university': 'University Scholarship',
    'college': 'College Scholarship',
    'government': 'Government Scholarship',
    'private': 'Private Scholarship',
    'thesis_grant': 'Thesis/Research Grant',
    'thesis': 'Thesis/Research Grant',
    'research': 'Thesis/Research Grant',
  };
  
  const normalizedType = type.toLowerCase().trim();
  return typeMapping[normalizedType] || ScholarshipTypes[0];
};

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
  // Admin Scope fields
  scholarshipLevel: 'university' | 'college' | 'academic_unit' | 'external';
  managingCollegeCode: string;
  managingAcademicUnitCode: string;
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
  // Custom conditions for dynamic eligibility
  customConditions: CustomCondition[];
  requiredDocuments: Array<{ name: string; description: string; isRequired: boolean; fileType?: 'any' | 'pdf' | 'image' | 'text' }>;
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
  // Admin Scope - default to university level
  scholarshipLevel: 'university',
  managingCollegeCode: '',
  managingAcademicUnitCode: '',
  eligibilityCriteria: {
    minGWA: 1.0,  // 1.0 = no minimum restriction (best possible)
    maxGWA: 5.0,  // 5.0 = no maximum restriction (any grade allowed)
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
  customConditions: [],
  requiredDocuments: [],
  status: 'draft'
};

// ============================================================================
// Main Component
// ============================================================================

const AddScholarship: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  const [formData, setFormData] = useState<ScholarshipFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Admin scope state
  const [adminScope, setAdminScope] = useState<{
    level: string;
    collegeCode: string | null;
    academicUnitCode: string | null;
  } | null>(null);
  
  // Available courses based on selected colleges
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  
  // Custom inputs
  const [customRequirement, setCustomRequirement] = useState({ description: '', isRequired: true });
  const [customDocument, setCustomDocument] = useState({ name: '', description: '', isRequired: true, fileType: 'any' as 'any' | 'pdf' | 'image' | 'text' });
  
  // Custom condition builder state
  const [customConditionInput, setCustomConditionInput] = useState<Partial<CustomCondition>>({
    name: '',
    description: '',
    conditionType: ConditionType.RANGE,
    studentField: 'gwa',
    operator: RangeOperator.LESS_THAN_OR_EQUAL,
    value: 0,
    category: ConditionCategory.ACADEMIC,
    importance: ConditionImportance.REQUIRED,
    isActive: true
  });
  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [isCustomFieldMode, setIsCustomFieldMode] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');

  const totalSteps = 5;
  const academicYears = generateAcademicYears();

  // ============================================================================
  // Fetch admin scope on mount to auto-set default values
  // ============================================================================
  useEffect(() => {
    const fetchAdminScope = async () => {
      try {
        const response = await scholarshipApi.getAdminScope();
        if (response.success && response.data) {
          setAdminScope({
            level: response.data.level,
            collegeCode: response.data.collegeCode || null,
            academicUnitCode: response.data.academicUnitCode || null
          });
          
          // Auto-set scholarship level and codes based on admin's scope
          if (response.data.level === 'academic_unit') {
            setFormData(prev => ({
              ...prev,
              scholarshipLevel: 'academic_unit',
              managingCollegeCode: response.data.collegeCode || '',
              managingAcademicUnitCode: response.data.academicUnitCode || ''
            }));
          } else if (response.data.level === 'college') {
            setFormData(prev => ({
              ...prev,
              scholarshipLevel: 'college',
              managingCollegeCode: response.data.collegeCode || ''
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch admin scope:', err);
      }
    };
    
    fetchAdminScope();
  }, []);

  // ============================================================================
  // Fetch scholarship data when in edit mode
  // ============================================================================
  useEffect(() => {
    if (!isEditMode || !id) return;
    
    const fetchScholarshipData = async () => {
      setInitialLoading(true);
      try {
        const response = await scholarshipApi.getById(id);
        if (response.success && response.data) {
          const scholarship = response.data as any; // Use any for flexible mapping
          
          // Format dates for input fields
          const formatDateForInput = (dateValue: string | Date | undefined): string => {
            if (!dateValue) return '';
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
            return date.toISOString().split('T')[0];
          };
          
          // Map additional requirements to proper format
          const mapAdditionalRequirements = (requirements: any): Array<{ description: string; isRequired: boolean }> => {
            if (!requirements || !Array.isArray(requirements)) return [];
            return requirements.map((req: any) => {
              if (typeof req === 'string') {
                return { description: req, isRequired: true };
              }
              return { 
                description: req.description || '', 
                isRequired: req.isRequired !== undefined ? req.isRequired : true 
              };
            });
          };
          
          // Map required documents with proper defaults
          const mapRequiredDocuments = (docs: any): Array<{ name: string; description: string; isRequired: boolean; fileType?: 'any' | 'pdf' | 'image' | 'text' }> => {
            if (!docs || !Array.isArray(docs)) return [];
            return docs.map((doc: any) => ({
              name: doc.name || '',
              description: doc.description || '',
              isRequired: doc.isRequired !== undefined ? doc.isRequired : true,
              fileType: doc.fileType || 'any'
            }));
          };
          
          setFormData({
            name: scholarship.name || '',
            description: scholarship.description || '',
            sponsor: scholarship.sponsor || '',
            type: normalizeScholarshipType(scholarship.type),
            totalGrant: scholarship.totalGrant || 0,
            awardDescription: scholarship.awardDescription || '',
            applicationDeadline: formatDateForInput(scholarship.applicationDeadline),
            applicationStartDate: formatDateForInput(scholarship.applicationStartDate),
            academicYear: scholarship.academicYear || generateAcademicYears()[0],
            semester: scholarship.semester || 'First',
            slots: scholarship.slots || 1,
            scholarshipLevel: scholarship.scholarshipLevel || 'university',
            managingCollegeCode: scholarship.managingCollegeCode || scholarship.managingCollege || '',
            managingAcademicUnitCode: scholarship.managingAcademicUnitCode || scholarship.managingAcademicUnit || '',
            eligibilityCriteria: {
              minGWA: scholarship.eligibilityCriteria?.minGWA || 1.0,  // 1.0 = no min restriction
              maxGWA: scholarship.eligibilityCriteria?.maxGWA || 5.0,  // 5.0 = no max restriction
              eligibleClassifications: scholarship.eligibilityCriteria?.eligibleClassifications || [],
              minUnitsEnrolled: scholarship.eligibilityCriteria?.minUnitsEnrolled || 0,
              minUnitsPassed: scholarship.eligibilityCriteria?.minUnitsPassed || scholarship.eligibilityCriteria?.minimumUnitsPassed || 0,
              eligibleColleges: scholarship.eligibilityCriteria?.eligibleColleges || [],
              eligibleCourses: scholarship.eligibilityCriteria?.eligibleCourses || [],
              eligibleMajors: scholarship.eligibilityCriteria?.eligibleMajors || [],
              maxAnnualFamilyIncome: scholarship.eligibilityCriteria?.maxAnnualFamilyIncome || scholarship.eligibilityCriteria?.maxFamilyIncome || 0,
              minAnnualFamilyIncome: scholarship.eligibilityCriteria?.minAnnualFamilyIncome || scholarship.eligibilityCriteria?.minFamilyIncome || 0,
              eligibleSTBrackets: scholarship.eligibilityCriteria?.eligibleSTBrackets || [],
              eligibleProvinces: scholarship.eligibilityCriteria?.eligibleProvinces || [],
              eligibleCitizenship: scholarship.eligibilityCriteria?.eligibleCitizenship || 
                (scholarship.eligibilityCriteria?.filipinoOnly ? ['Filipino'] : ['Filipino']),
              requiresApprovedThesisOutline: scholarship.eligibilityCriteria?.requiresApprovedThesisOutline || 
                scholarship.eligibilityCriteria?.requiresApprovedThesis || 
                scholarship.eligibilityCriteria?.requireThesisApproval || false,
              mustNotHaveOtherScholarship: scholarship.eligibilityCriteria?.mustNotHaveOtherScholarship || 
                scholarship.eligibilityCriteria?.noOtherScholarship || false,
              mustNotHaveThesisGrant: scholarship.eligibilityCriteria?.mustNotHaveThesisGrant || 
                scholarship.eligibilityCriteria?.noExistingGrant || false,
              mustNotHaveDisciplinaryAction: scholarship.eligibilityCriteria?.mustNotHaveDisciplinaryAction || 
                scholarship.eligibilityCriteria?.noDisciplinaryRecord || false,
              mustNotHaveFailingGrade: scholarship.eligibilityCriteria?.mustNotHaveFailingGrade || 
                scholarship.eligibilityCriteria?.noFailingGrades || false,
              mustNotHaveGradeOf4: scholarship.eligibilityCriteria?.mustNotHaveGradeOf4 || false,
              mustNotHaveIncompleteGrade: scholarship.eligibilityCriteria?.mustNotHaveIncompleteGrade || false,
              mustBeGraduating: scholarship.eligibilityCriteria?.mustBeGraduating || false,
              additionalRequirements: mapAdditionalRequirements(scholarship.eligibilityCriteria?.additionalRequirements)
            },
            // Load custom conditions (from eligibilityCriteria or top-level for backward compatibility)
            customConditions: (() => {
              const conditions = scholarship.eligibilityCriteria?.customConditions || scholarship.customConditions || [];
              return Array.isArray(conditions) 
                ? conditions.map((c: any) => ({
                    id: c.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: c.name || '',
                    description: c.description || '',
                    conditionType: c.conditionType || ConditionType.RANGE,
                    studentField: c.studentField || 'gwa',
                    operator: c.operator || RangeOperator.LESS_THAN_OR_EQUAL,
                    value: c.value ?? 0,
                    category: c.category || ConditionCategory.ACADEMIC,
                    importance: c.importance || ConditionImportance.REQUIRED,
                    isActive: c.isActive !== false
                  }))
                : [];
            })(),
            requiredDocuments: mapRequiredDocuments(scholarship.requiredDocuments),
            status: scholarship.status || 'draft'
          });
        } else {
          toast.error('Failed to load scholarship data');
          navigate('/admin/scholarships');
        }
      } catch (err) {
        console.error('Failed to fetch scholarship:', err);
        toast.error('Failed to load scholarship data');
        navigate('/admin/scholarships');
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchScholarshipData();
  }, [isEditMode, id, navigate]);

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
      setCustomDocument({ name: '', description: '', isRequired: true, fileType: 'any' });
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
  // Custom Condition Management
  // ============================================================================
  
  // Get operators based on condition type
  const getOperatorsForType = (type: ConditionType) => {
    switch (type) {
      case ConditionType.RANGE:
        return [
          { value: RangeOperator.LESS_THAN, label: 'Less than (<)' },
          { value: RangeOperator.LESS_THAN_OR_EQUAL, label: 'Less than or equal (≤)' },
          { value: RangeOperator.GREATER_THAN, label: 'Greater than (>)' },
          { value: RangeOperator.GREATER_THAN_OR_EQUAL, label: 'Greater than or equal (≥)' },
          { value: RangeOperator.EQUAL, label: 'Equal (=)' },
          { value: RangeOperator.NOT_EQUAL, label: 'Not equal (≠)' },
          { value: RangeOperator.BETWEEN, label: 'Between (inclusive)' },
        ];
      case ConditionType.BOOLEAN:
        return [
          { value: BooleanOperator.IS_TRUE, label: 'Must be TRUE (Yes)' },
          { value: BooleanOperator.IS_FALSE, label: 'Must be FALSE (No)' },
          { value: BooleanOperator.EXISTS, label: 'Must have a value' },
          { value: BooleanOperator.NOT_EXISTS, label: 'Must not have a value' },
        ];
      case ConditionType.LIST:
        return [
          { value: ListOperator.IN, label: 'Must be one of the values' },
          { value: ListOperator.NOT_IN, label: 'Must NOT be one of the values' },
          { value: ListOperator.CONTAINS, label: 'Must contain value' },
          { value: ListOperator.CONTAINS_ANY, label: 'Must contain any of values' },
        ];
      default:
        return [];
    }
  };

  // Get fields filtered by condition type (include custom option at the end)
  const getFieldsForType = (type: ConditionType) => {
    const typeFields = STUDENT_PROFILE_FIELDS.filter(f => f.type === type && f.value !== '__custom__');
    const customOption = STUDENT_PROFILE_FIELDS.find(f => f.value === '__custom__');
    // Always include the custom option at the end
    return customOption ? [...typeFields, { ...customOption, type }] : typeFields;
  };

  // Handle TYPE selection change (first step)
  const handleTypeChange = (type: ConditionType) => {
    const fieldsForType = getFieldsForType(type);
    const firstField = fieldsForType[0];
    const operators = getOperatorsForType(type);
    
    // Reset custom field mode when changing type
    setIsCustomFieldMode(false);
    setCustomFieldName('');
    
    setCustomConditionInput(prev => ({
      ...prev,
      conditionType: type,
      studentField: firstField?.value || '',
      category: (firstField?.category as ConditionCategory) || ConditionCategory.CUSTOM,
      operator: operators[0]?.value || RangeOperator.LESS_THAN_OR_EQUAL,
      value: type === ConditionType.BOOLEAN ? true : type === ConditionType.LIST ? [] : 0
    }));
  };

  // Handle FIELD selection change (second step)
  const handleFieldChange = (fieldValue: string) => {
    if (fieldValue === '__custom__') {
      // Switch to custom field mode
      setIsCustomFieldMode(true);
      setCustomFieldName('');
      setCustomConditionInput(prev => ({
        ...prev,
        studentField: '',
        category: ConditionCategory.CUSTOM
      }));
    } else {
      // Normal field selection
      setIsCustomFieldMode(false);
      setCustomFieldName('');
      const field = STUDENT_PROFILE_FIELDS.find(f => f.value === fieldValue);
      if (field) {
        setCustomConditionInput(prev => ({
          ...prev,
          studentField: fieldValue,
          category: field.category as ConditionCategory
        }));
      }
    }
  };

  // Handle custom field name input
  const handleCustomFieldNameChange = (name: string) => {
    // Convert to camelCase and store in customFields path
    const fieldKey = name.replace(/\s+/g, '').replace(/^./, c => c.toLowerCase());
    setCustomFieldName(name);
    setCustomConditionInput(prev => ({
      ...prev,
      studentField: `customFields.${fieldKey}`,
      category: ConditionCategory.CUSTOM
    }));
  };

  // Add custom condition
  const addCustomCondition = () => {
    if (!customConditionInput.name?.trim() || !customConditionInput.studentField) {
      toast.error('Please provide a name and select a field for the condition');
      return;
    }
    
    const newCondition: CustomCondition = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customConditionInput.name!.trim(),
      description: customConditionInput.description?.trim() || '',
      conditionType: customConditionInput.conditionType!,
      studentField: customConditionInput.studentField!,
      operator: customConditionInput.operator!,
      value: customConditionInput.value!,
      category: customConditionInput.category!,
      // All custom conditions are always optional (nice to have)
      importance: ConditionImportance.OPTIONAL,
      isActive: customConditionInput.isActive !== false
    };

    setFormData(prev => ({
      ...prev,
      customConditions: [...prev.customConditions, newCondition]
    }));

    // Reset the input
    setCustomConditionInput({
      name: '',
      description: '',
      conditionType: ConditionType.RANGE,
      studentField: 'gwa',
      operator: RangeOperator.LESS_THAN_OR_EQUAL,
      value: 0,
      category: ConditionCategory.ACADEMIC,
      importance: ConditionImportance.REQUIRED,
      isActive: true
    });
    setIsCustomFieldMode(false);
    setCustomFieldName('');
    setShowConditionBuilder(false);
    toast.success('Custom condition added');
  };

  // Remove custom condition
  const removeCustomCondition = (conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      customConditions: prev.customConditions.filter(c => c.id !== conditionId)
    }));
    toast.success('Condition removed');
  };

  // Toggle condition active status
  const toggleConditionActive = (conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      customConditions: prev.customConditions.map(c =>
        c.id === conditionId ? { ...c, isActive: !c.isActive } : c
      )
    }));
  };

  // Format condition value for display
  const formatConditionValue = (condition: CustomCondition): string => {
    if (condition.conditionType === ConditionType.BOOLEAN) {
      return condition.operator === BooleanOperator.IS_TRUE ? 'Yes' : 'No';
    }
    if (condition.conditionType === ConditionType.LIST && Array.isArray(condition.value)) {
      return (condition.value as string[]).join(', ');
    }
    if (condition.operator === RangeOperator.BETWEEN && typeof condition.value === 'object') {
      const range = condition.value as { min?: number; max?: number };
      return `${range.min ?? '∞'} - ${range.max ?? '∞'}`;
    }
    return String(condition.value);
  };

  // Get readable field label
  const getFieldLabel = (fieldValue: string): string => {
    // Handle custom fields (stored as customFields.fieldName)
    if (fieldValue?.startsWith('customFields.')) {
      const customFieldKey = fieldValue.replace('customFields.', '');
      // Convert camelCase to readable format
      return '✏️ ' + customFieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
    }
    const field = STUDENT_PROFILE_FIELDS.find(f => f.value === fieldValue);
    return field?.label || fieldValue;
  };

  // Get operator label for display
  const getOperatorLabel = (operator: string): string => {
    const allOperators = [
      ...getOperatorsForType(ConditionType.RANGE),
      ...getOperatorsForType(ConditionType.BOOLEAN),
      ...getOperatorsForType(ConditionType.LIST)
    ];
    return allOperators.find(o => o.value === operator)?.label || operator;
  };

  // Preset condition templates for quick addition
  const CONDITION_PRESETS = [
    {
      label: 'Maximum GWA Required',
      icon: '📊',
      template: {
        name: 'Maximum GWA Requirement',
        description: 'Student must have GWA less than or equal to specified value',
        conditionType: ConditionType.RANGE,
        studentField: 'gwa',
        operator: RangeOperator.LESS_THAN_OR_EQUAL,
        value: 2.0,
        category: ConditionCategory.ACADEMIC,
        importance: ConditionImportance.REQUIRED
      }
    },
    {
      label: 'Maximum Family Income',
      icon: '💰',
      template: {
        name: 'Maximum Annual Family Income',
        description: 'Family income must not exceed specified amount',
        conditionType: ConditionType.RANGE,
        studentField: 'annualFamilyIncome',
        operator: RangeOperator.LESS_THAN_OR_EQUAL,
        value: 500000,
        category: ConditionCategory.FINANCIAL,
        importance: ConditionImportance.REQUIRED
      }
    },
    {
      label: 'Filipino Citizen Only',
      icon: '🇵🇭',
      template: {
        name: 'Filipino Citizenship Required',
        description: 'Applicant must be a Filipino citizen',
        conditionType: ConditionType.BOOLEAN,
        studentField: 'isFilipino',
        operator: BooleanOperator.IS_TRUE,
        value: true,
        category: ConditionCategory.DEMOGRAPHIC,
        importance: ConditionImportance.REQUIRED
      }
    },
    {
      label: 'No Existing Scholarship',
      icon: '🎓',
      template: {
        name: 'No Existing Scholarship',
        description: 'Applicant must not have an existing scholarship',
        conditionType: ConditionType.BOOLEAN,
        studentField: 'hasExistingScholarship',
        operator: BooleanOperator.IS_FALSE,
        value: false,
        category: ConditionCategory.FINANCIAL,
        importance: ConditionImportance.REQUIRED
      }
    },
    {
      label: 'No Disciplinary Record',
      icon: '✅',
      template: {
        name: 'No Disciplinary Record',
        description: 'Applicant must have no disciplinary record',
        conditionType: ConditionType.BOOLEAN,
        studentField: 'hasDisciplinaryRecord',
        operator: BooleanOperator.IS_FALSE,
        value: false,
        category: ConditionCategory.DEMOGRAPHIC,
        importance: ConditionImportance.REQUIRED
      }
    },
    {
      label: 'Specific ST Bracket',
      icon: '📋',
      template: {
        name: 'ST Bracket Requirement',
        description: 'Applicant must have one of the specified ST brackets',
        conditionType: ConditionType.LIST,
        studentField: 'stBracket',
        operator: ListOperator.IN,
        value: ['FDS', 'FD'],
        category: ConditionCategory.FINANCIAL,
        importance: ConditionImportance.REQUIRED
      }
    }
  ];

  // Apply a preset condition
  const applyConditionPreset = (preset: typeof CONDITION_PRESETS[0]) => {
    setCustomConditionInput({
      ...preset.template,
      isActive: true
    });
    setShowConditionBuilder(true);
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
    
    // Scope validation
    if ((formData.scholarshipLevel === 'college' || formData.scholarshipLevel === 'academic_unit') && !formData.managingCollegeCode) {
      allErrors.managingCollegeCode = 'Managing college is required for college/academic unit level scholarships';
      if (Object.keys(allErrors).length === 1) setCurrentStep(1);
    }
    
    if (formData.scholarshipLevel === 'academic_unit' && !formData.managingAcademicUnitCode) {
      allErrors.managingAcademicUnitCode = 'Managing academic unit is required for academic unit level scholarships';
      if (Object.keys(allErrors).length === 1) setCurrentStep(1);
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
        
        // Admin Scope - determines which admins can manage this scholarship
        scholarshipLevel: formData.scholarshipLevel,
        managingCollegeCode: formData.managingCollegeCode || null,
        managingAcademicUnitCode: formData.managingAcademicUnitCode || null,
        
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
          
          // Additional custom requirements (text-based, manual verification)
          additionalRequirements: formData.eligibilityCriteria.additionalRequirements,
          
          // Custom conditions for dynamic eligibility (auto-evaluated)
          customConditions: formData.customConditions.filter(c => c.isActive)
        },
        
        // Required documents
        requiredDocuments: formData.requiredDocuments
      };

      console.log(`📤 ${isEditMode ? 'Updating' : 'Creating'} scholarship data:`, JSON.stringify(scholarshipData, null, 2));

      const response = isEditMode 
        ? await scholarshipApi.update(id!, scholarshipData)
        : await scholarshipApi.create(scholarshipData);
      
      console.log('📥 Received response:', response);
      
      if (response.success) {
        toast.success(`🎓 Scholarship ${isEditMode ? 'updated' : 'created'} successfully!`, {
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
        throw new Error(response.message || `Failed to ${isEditMode ? 'update' : 'create'} scholarship`);
      }
    } catch (err: any) {
      console.error(`❌ Error ${isEditMode ? 'updating' : 'creating'} scholarship:`, err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      // Provide specific error messages based on response
      let errorMessage = '';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = `You do not have permission to ${isEditMode ? 'update' : 'create'} this scholarship.`;
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

  // Show loading state when fetching scholarship data in edit mode
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading scholarship data...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-slate-800">
                {isEditMode ? 'Edit Scholarship' : 'Create New Scholarship'}
              </h1>
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

                  {/* Scholarship Scope/Level Section */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Administrative Scope
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Define which administrative unit manages this scholarship. This determines which admins can view and manage applications.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Scholarship Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.scholarshipLevel}
                          onChange={(e) => {
                            const newLevel = e.target.value as ScholarshipFormData['scholarshipLevel'];
                            setFormData(prev => ({
                              ...prev,
                              scholarshipLevel: newLevel,
                              // Reset codes when changing level
                              managingCollegeCode: newLevel === 'university' || newLevel === 'external' ? '' : prev.managingCollegeCode,
                              managingAcademicUnitCode: newLevel !== 'academic_unit' ? '' : prev.managingAcademicUnitCode
                            }));
                          }}
                          disabled={adminScope?.level === 'academic_unit' || adminScope?.level === 'college'}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          {/* CLEAN SEPARATION: Only show options based on admin level */}
                          {adminScope?.level === 'university' && (
                            <>
                              <option value="university">🏛️ University-wide - Visible to all admins</option>
                              <option value="external">🌐 External - University manages, open to all</option>
                              <option value="college">🎓 College-level - Managed by specific college</option>
                              <option value="academic_unit">📚 Academic Unit-level - Managed by specific department/institute</option>
                            </>
                          )}
                          {/* College admin can ONLY create college-level scholarships */}
                          {adminScope?.level === 'college' && (
                            <option value="college">🎓 College-level - Managed by your college</option>
                          )}
                          {/* Academic unit admin can ONLY create academic_unit-level scholarships */}
                          {adminScope?.level === 'academic_unit' && (
                            <option value="academic_unit">📚 Academic Unit-level - Managed by your department/institute</option>
                          )}
                        </select>
                        {adminScope?.level !== 'university' && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Your admin level restricts the scholarship levels you can create.
                          </p>
                        )}
                      </div>

                      {/* College Selection - for college and academic_unit level */}
                      {(formData.scholarshipLevel === 'college' || formData.scholarshipLevel === 'academic_unit') && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Managing College <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.managingCollegeCode}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                managingCollegeCode: e.target.value,
                                managingAcademicUnitCode: '' // Reset academic unit when college changes
                              }));
                            }}
                            disabled={adminScope?.level === 'college' || adminScope?.level === 'academic_unit'}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            required
                          >
                            <option value="">-- Select College --</option>
                            {getCollegeOptions().map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {adminScope?.level !== 'university' && formData.managingCollegeCode && (
                            <p className="text-xs text-slate-500 mt-1">
                              Auto-set to your college assignment.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Academic Unit Selection - only for academic_unit level */}
                      {formData.scholarshipLevel === 'academic_unit' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Managing Department/Institute <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.managingAcademicUnitCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, managingAcademicUnitCode: e.target.value }))}
                            disabled={!formData.managingCollegeCode || adminScope?.level === 'academic_unit'}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            required
                          >
                            <option value="">
                              {formData.managingCollegeCode ? '-- Select Department/Institute --' : '-- Select College First --'}
                            </option>
                            {formData.managingCollegeCode && getDepartmentOptions(formData.managingCollegeCode as UPLBCollegeCode).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {adminScope?.level === 'academic_unit' && formData.managingAcademicUnitCode && (
                            <p className="text-xs text-slate-500 mt-1">
                              Auto-set to your academic unit assignment.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Scope Summary */}
                      <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-slate-700">Current Scope:</span>
                          <span className="text-blue-700 font-semibold">
                            {formData.scholarshipLevel === 'university' && '🏛️ University-wide (all admins can see)'}
                            {formData.scholarshipLevel === 'external' && '🌐 External (university manages)'}
                            {formData.scholarshipLevel === 'college' && formData.managingCollegeCode && 
                              `🎓 ${formData.managingCollegeCode} - ${UPLBColleges[formData.managingCollegeCode as UPLBCollegeCode]?.name || 'College'}`}
                            {formData.scholarshipLevel === 'college' && !formData.managingCollegeCode && '🎓 College (select college above)'}
                            {formData.scholarshipLevel === 'academic_unit' && formData.managingAcademicUnitCode && 
                              `📚 ${formData.managingAcademicUnitCode} (${formData.managingCollegeCode})`}
                            {formData.scholarshipLevel === 'academic_unit' && !formData.managingAcademicUnitCode && '📚 Academic Unit (select above)'}
                          </span>
                        </div>
                      </div>
                    </div>
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
                      {/* GWA Requirement - UPLB uses 1.0=highest, 5.0=lowest */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-amber-800">
                          <strong>UP Grading System:</strong> 1.0 = highest (excellent), 5.0 = lowest (failed). 
                          Set the maximum GWA a student can have to be eligible (e.g., 2.0 means students must have 2.0 or better).
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Required GWA (or better)
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.maxGWA === 5.0 ? '' : formData.eligibilityCriteria.maxGWA}
                            onChange={(e) => handleEligibilityChange('maxGWA', parseFloat(e.target.value) || 5.0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="1.0"
                            max="5.0"
                            step="0.01"
                            placeholder="e.g., 2.00 (no restriction if blank)"
                          />
                          <p className="text-xs text-slate-500 mt-1">Leave blank if no GWA requirement</p>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Minimum GWA (for elite scholarships)
                          </label>
                          <input
                            type="number"
                            value={formData.eligibilityCriteria.minGWA === 0 || formData.eligibilityCriteria.minGWA === 1.0 ? '' : formData.eligibilityCriteria.minGWA}
                            onChange={(e) => handleEligibilityChange('minGWA', parseFloat(e.target.value) || 1.0)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            min="1.0"
                            max="5.0"
                            step="0.01"
                            placeholder="e.g., 1.25 (rarely used)"
                          />
                          <p className="text-xs text-slate-500 mt-1">Only for Dean's List type scholarships</p>
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

                  {/* ============================================================ */}
                  {/* Custom Conditions Builder */}
                  {/* ============================================================ */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                          Custom Eligibility Conditions
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Create advanced conditions that are automatically evaluated
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConditionBuilder(!showConditionBuilder)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {showConditionBuilder ? 'Cancel' : 'Add Custom'}
                      </button>
                    </div>

                    {/* Quick Presets - Only show if not in builder mode */}
                    {!showConditionBuilder && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-slate-600 mb-2">Quick Add (click to customize):</p>
                        <div className="flex flex-wrap gap-2">
                          {CONDITION_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyConditionPreset(preset)}
                              className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center gap-1.5"
                            >
                              <span>{preset.icon}</span>
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Existing Custom Conditions List */}
                    {formData.customConditions.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formData.customConditions.map((condition) => (
                          <div
                            key={condition.id}
                            className={`flex items-start gap-3 px-4 py-3 bg-white rounded-lg border-2 transition-all ${
                              condition.isActive ? 'border-indigo-300' : 'border-slate-200 opacity-60'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  condition.conditionType === ConditionType.RANGE
                                    ? 'bg-blue-100 text-blue-700'
                                    : condition.conditionType === ConditionType.BOOLEAN
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {condition.conditionType}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-800">{condition.name}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                <span className="font-medium">{getFieldLabel(condition.studentField)}</span>
                                {' '}{getOperatorLabel(condition.operator)}{' '}
                                <span className="font-medium text-indigo-600">{formatConditionValue(condition)}</span>
                              </p>
                              {condition.description && (
                                <p className="text-xs text-slate-400 mt-1">{condition.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleConditionActive(condition.id)}
                                className={`p-1.5 rounded transition-colors ${
                                  condition.isActive
                                    ? 'text-indigo-600 hover:bg-indigo-50'
                                    : 'text-slate-400 hover:bg-slate-100'
                                }`}
                                title={condition.isActive ? 'Disable condition' : 'Enable condition'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCustomCondition(condition.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Condition Builder Form */}
                    {showConditionBuilder && (
                      <div className="bg-white rounded-lg p-4 border border-indigo-200 space-y-4">
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold">1. Type</span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="px-2 py-1 bg-slate-100 rounded">2. Field</span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="px-2 py-1 bg-slate-100 rounded">3. Value</span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="px-2 py-1 bg-slate-100 rounded">4. Operator</span>
                        </div>

                        {/* STEP 1: Condition Type Selection */}
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <label className="block text-sm font-semibold text-indigo-800 mb-2">
                            Step 1: What type of condition?
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleTypeChange(ConditionType.RANGE)}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                customConditionInput.conditionType === ConditionType.RANGE
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-lg mb-1">📊</div>
                              <div className="text-sm font-medium">Range</div>
                              <div className="text-[10px] text-slate-500">Numbers (GWA, Income)</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTypeChange(ConditionType.BOOLEAN)}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                customConditionInput.conditionType === ConditionType.BOOLEAN
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-slate-200 bg-white hover:border-green-300'
                              }`}
                            >
                              <div className="text-lg mb-1">✓✗</div>
                              <div className="text-sm font-medium">Boolean</div>
                              <div className="text-[10px] text-slate-500">Yes/No conditions</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTypeChange(ConditionType.LIST)}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                customConditionInput.conditionType === ConditionType.LIST
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-slate-200 bg-white hover:border-purple-300'
                              }`}
                            >
                              <div className="text-lg mb-1">📋</div>
                              <div className="text-sm font-medium">List</div>
                              <div className="text-[10px] text-slate-500">College, Year Level</div>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* STEP 2: Field Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Step 2: Which field to check? *
                            </label>
                            <select
                              value={isCustomFieldMode ? '__custom__' : (customConditionInput.studentField || '')}
                              onChange={(e) => handleFieldChange(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                              <option value="" disabled>-- Select a field --</option>
                              {getFieldsForType(customConditionInput.conditionType!).map(field => (
                                <option key={field.value} value={field.value}>
                                  {field.label}
                                </option>
                              ))}
                            </select>
                            
                            {/* Custom Field Name Input - Enhanced */}
                            {isCustomFieldMode && (
                              <div className="mt-3 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="text-purple-600 text-xs">✏️</span>
                                  </div>
                                  <span className="text-sm font-semibold text-purple-800">Create Custom Field</span>
                                </div>
                                
                                <div className="space-y-3">
                                  {/* Field Name */}
                                  <div>
                                    <label className="block text-xs font-medium text-purple-700 mb-1">
                                      Field Identifier *
                                    </label>
                                    <input
                                      type="text"
                                      value={customFieldName}
                                      onChange={(e) => handleCustomFieldNameChange(e.target.value)}
                                      placeholder="e.g., volunteerHours, communityService, athleteStatus"
                                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-sm"
                                    />
                                    <p className="text-[10px] text-purple-600 mt-1">
                                      💾 Stored as: <code className="bg-purple-100 px-1 rounded">customFields.{customFieldName.replace(/\s+/g, '').replace(/^./, c => c.toLowerCase()) || '...'}</code>
                                    </p>
                                  </div>

                                  {/* Auto-set Condition Name based on field */}
                                  {customFieldName && !customConditionInput.name && (
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                      💡 Tip: Set the <strong>Condition Name</strong> below to describe this requirement (e.g., "Minimum Volunteer Hours")
                                    </div>
                                  )}
                                </div>

                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                  <p className="text-xs text-amber-700">
                                    <strong>⚠️ Note:</strong> Students will see this field when applying and must fill it in. 
                                    Make sure to add a clear <strong>Description</strong> below so students understand what to enter.
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {!isCustomFieldMode && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                {getFieldsForType(customConditionInput.conditionType!).length - 1} predefined fields + custom option
                              </p>
                            )}
                          </div>

                          {/* STEP 3: Value Input */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Step 3: What value? *
                            </label>
                            {customConditionInput.conditionType === ConditionType.RANGE && (
                              customConditionInput.operator === RangeOperator.BETWEEN ? (
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={(customConditionInput.value as { min?: number; max?: number })?.min || ''}
                                    onChange={(e) => setCustomConditionInput(prev => ({
                                      ...prev,
                                      value: { ...(prev.value as { min?: number; max?: number }), min: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Min"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={(customConditionInput.value as { min?: number; max?: number })?.max || ''}
                                    onChange={(e) => setCustomConditionInput(prev => ({
                                      ...prev,
                                      value: { ...(prev.value as { min?: number; max?: number }), max: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Max"
                                  />
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={customConditionInput.value as number || 0}
                                  onChange={(e) => setCustomConditionInput(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Enter numeric value"
                                />
                              )
                            )}
                            {customConditionInput.conditionType === ConditionType.BOOLEAN && (
                              <div className="text-sm text-slate-600 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                                ✓ Value is determined by the operator (Step 4)
                              </div>
                            )}
                            {customConditionInput.conditionType === ConditionType.LIST && (
                              <input
                                type="text"
                                value={Array.isArray(customConditionInput.value) ? (customConditionInput.value as string[]).join(', ') : ''}
                                onChange={(e) => setCustomConditionInput(prev => ({
                                  ...prev,
                                  value: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter values separated by commas"
                              />
                            )}
                          </div>

                          {/* STEP 4: Operator Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Step 4: How to compare? *
                            </label>
                            <select
                              value={customConditionInput.operator as string || ''}
                              onChange={(e) => setCustomConditionInput(prev => ({ ...prev, operator: e.target.value as any }))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                              {getOperatorsForType(customConditionInput.conditionType!).map(op => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Condition Name */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Condition Name *
                            </label>
                            <input
                              type="text"
                              value={customConditionInput.name || ''}
                              onChange={(e) => setCustomConditionInput(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="e.g., Minimum GWA Requirement"
                            />
                          </div>

                          {/* Description */}
                          <div className={isCustomFieldMode ? 'p-3 bg-blue-50 border border-blue-200 rounded-lg' : ''}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Description {isCustomFieldMode ? <span className="text-red-500">*</span> : '(Optional)'}
                            </label>
                            {isCustomFieldMode && (
                              <p className="text-xs text-blue-600 mb-2">
                                📝 Students will see this when filling the custom field. Be clear about what they should enter.
                              </p>
                            )}
                            <textarea
                              rows={isCustomFieldMode ? 2 : 1}
                              value={customConditionInput.description || ''}
                              onChange={(e) => setCustomConditionInput(prev => ({ ...prev, description: e.target.value }))}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none ${
                                isCustomFieldMode 
                                  ? 'border-blue-300 bg-white' 
                                  : 'border-slate-300'
                              }`}
                              placeholder={isCustomFieldMode 
                                ? "e.g., Enter the total number of volunteer hours you've completed (minimum 20 hours required)" 
                                : "Brief explanation for students"
                              }
                            />
                            {isCustomFieldMode && !customConditionInput.description && (
                              <p className="text-xs text-amber-600 mt-1">
                                ⚠️ Adding a description is highly recommended for custom fields
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Preview & Add Button */}
                        <div className="pt-3 border-t border-slate-200">
                          {customConditionInput.studentField && customConditionInput.name?.trim() && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <p className="text-xs font-semibold text-slate-500 mb-1">Preview:</p>
                              <p className="text-sm text-slate-700">
                                <span className="font-medium">{customConditionInput.name}</span>: {getFieldLabel(customConditionInput.studentField)} {getOperatorLabel(customConditionInput.operator as string)} <span className="text-indigo-600 font-medium">{formatConditionValue(customConditionInput as CustomCondition)}</span>
                              </p>
                              {customConditionInput.description && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                  "{customConditionInput.description}"
                                </p>
                              )}
                              {isCustomFieldMode && (
                                <div className="mt-2 flex items-center gap-1">
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded">
                                    CUSTOM FIELD
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Students will fill this during application
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowConditionBuilder(false)}
                              className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={addCustomCondition}
                              disabled={!customConditionInput.name?.trim() || !customConditionInput.studentField}
                              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                                customConditionInput.name?.trim() && customConditionInput.studentField
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                              Add Condition
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {formData.customConditions.length === 0 && !showConditionBuilder && (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        No custom conditions added. Click "Add Custom" or use a Quick Add preset to create eligibility rules.
                      </div>
                    )}
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
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                                {(doc as any).fileType && (doc as any).fileType !== 'any' && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    (doc as any).fileType === 'pdf' ? 'bg-red-100 text-red-700' :
                                    (doc as any).fileType === 'image' ? 'bg-blue-100 text-blue-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {(doc as any).fileType === 'pdf' ? '📄 PDF' :
                                     (doc as any).fileType === 'image' ? '🖼️ Image' :
                                     '📝 Text Input'}
                                  </span>
                                )}
                              </div>
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

                      <div className="grid grid-cols-3 gap-3">
                        {/* File Type Selection */}
                        <select
                          value={customDocument.fileType}
                          onChange={(e) => setCustomDocument({ ...customDocument, fileType: e.target.value as 'any' | 'pdf' | 'image' | 'text' })}
                          className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="any">📎 Any File Type</option>
                          <option value="pdf">📄 PDF Only</option>
                          <option value="image">🖼️ Image Only (JPG, PNG)</option>
                          <option value="text">📝 Text Input (No File)</option>
                        </select>
                        
                        {/* Required/Optional */}
                        <select
                          value={customDocument.isRequired.toString()}
                          onChange={(e) => setCustomDocument({ ...customDocument, isRequired: e.target.value === 'true' })}
                          className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="true">Required</option>
                          <option value="false">Optional</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={addCustomDocument}
                          disabled={!customDocument.name.trim()}
                          className={`px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                            customDocument.name.trim()
                              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-5 h-5" />
                          Add
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

                  {/* Custom Conditions Review */}
                  {formData.customConditions.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200 shadow-sm">
                      <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                        Custom Conditions ({formData.customConditions.filter(c => c.isActive).length} active)
                      </h3>
                      <div className="bg-white rounded-lg p-4">
                        <ul className="space-y-2">
                          {formData.customConditions.map((condition) => (
                            <li key={condition.id} className={`flex items-start gap-2 pb-2 border-b border-slate-100 last:border-0 last:pb-0 ${
                              !condition.isActive ? 'opacity-50' : ''
                            }`}>
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-indigo-500" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-slate-800">{condition.name}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                  condition.conditionType === ConditionType.RANGE
                                    ? 'bg-blue-100 text-blue-700'
                                    : condition.conditionType === ConditionType.BOOLEAN
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {condition.conditionType}
                                </span>
                                {!condition.isActive && (
                                  <span className="ml-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">
                                    Disabled
                                  </span>
                                )}
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {getFieldLabel(condition.studentField)} {getOperatorLabel(condition.operator)} <span className="font-medium">{formatConditionValue(condition)}</span>
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

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
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    doc.isRequired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {doc.isRequired ? 'Required' : 'Optional'}
                                  </span>
                                  {(doc as any).fileType && (doc as any).fileType !== 'any' && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      (doc as any).fileType === 'pdf' ? 'bg-red-50 text-red-600 border border-red-200' :
                                      (doc as any).fileType === 'image' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                      'bg-amber-50 text-amber-600 border border-amber-200'
                                    }`}>
                                      {(doc as any).fileType === 'pdf' ? '📄 PDF only' :
                                       (doc as any).fileType === 'image' ? '🖼️ Image only' :
                                       '📝 Text Input'}
                                    </span>
                                  )}
                                </div>
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
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        {isEditMode ? 'Update Scholarship' : 'Create Scholarship'}
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
