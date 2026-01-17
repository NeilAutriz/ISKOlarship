// ============================================================================
// ISKOlarship - Profile Completion Wizard
// 4-step wizard for first-time user profile setup
// ============================================================================

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Hash, 
  DollarSign, 
  Home, 
  ChevronDown,
  Globe,
  Building2,
  BarChart3,
  Award,
  X,
  Upload,
  FileText,
  File,
  CheckCircle,
  Eye
} from 'lucide-react';
import { YearLevel, UPLBCollege } from '../types';
import { uploadDocuments, validateFile, formatFileSize } from '../services/documentUpload';

export interface ProfileData {
  // Step 1: Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  // Expanded address fields
  street: string;
  barangay: string;
  city: string;
  zipCode: string;
  dateOfBirth: string;
  gender: string;
  
  // Step 2: Academic Details
  college: string;
  course: string;
  yearLevel: string;
  gwa: string;
  unitsEnrolled: string;
  unitsPassed: string;
  studentNumber: string;
  
  // Step 3: Financial Information
  annualFamilyIncome: string;
  hasExistingScholarship: boolean;
  hasThesisGrant: boolean;
  hasDisciplinaryAction: boolean;
  householdSize: string;
  stBracket: string;
  
  // Step 4: Demographic Data
  provinceOfOrigin: string;
  citizenship: string;
  
  // Step 5: Required Documents
  documents: Array<{
    file: File | null;
    type: string;
    name: string;
    required: boolean;
    uploaded: boolean;
    error?: string;
    base64?: string;
    previewUrl?: string; // Add preview URL
  }>;
}

interface ProfileCompletionProps {
  email: string;
  onComplete: (profileData: ProfileData) => void;
  onCancel: () => void;
}

const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  email,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; previewUrl: string } | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: email,
    contactNumber: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
    dateOfBirth: '',
    gender: '',
    college: '',
    course: '',
    yearLevel: '',
    gwa: '',
    unitsEnrolled: '',
    unitsPassed: '',
    studentNumber: '',
    annualFamilyIncome: '',
    hasExistingScholarship: false,
    hasThesisGrant: false,
    hasDisciplinaryAction: false,
    householdSize: '',
    stBracket: '',
    provinceOfOrigin: '',
    citizenship: 'Filipino',
    documents: [
      {
        file: null,
        type: 'student_id',
        name: 'Student ID / Proof of Enrollment',
        required: true,
        uploaded: false
      },
      {
        file: null,
        type: 'latest_grades',
        name: 'Latest Grades / Transcript',
        required: true,
        uploaded: false
      },
      {
        file: null,
        type: 'certificate_of_registration',
        name: 'Certificate of Registration (Current Semester)',
        required: true,
        uploaded: false
      }
    ]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ProfileData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Clear course when college changes
      if (field === 'college') {
        updated.course = '';
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
        if (!formData.street.trim()) newErrors.street = 'Street address is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        break;
      case 2:
        if (!formData.college) newErrors.college = 'College is required';
        if (!formData.course.trim()) newErrors.course = 'Course is required';
        if (!formData.yearLevel) newErrors.yearLevel = 'Year level is required';
        if (!formData.gwa.trim()) {
          newErrors.gwa = 'GWA is required';
        } else {
          const gwaNum = parseFloat(formData.gwa);
          if (isNaN(gwaNum) || gwaNum < 1.0 || gwaNum > 5.0) {
            newErrors.gwa = 'GWA must be between 1.0 and 5.0';
          }
        }
        if (!formData.studentNumber.trim()) newErrors.studentNumber = 'Student number is required';
        const unitsEnrolled = parseInt(formData.unitsEnrolled);
        if (formData.unitsEnrolled && (isNaN(unitsEnrolled) || unitsEnrolled < 0 || unitsEnrolled > 30)) {
          newErrors.unitsEnrolled = 'Units enrolled must be between 0 and 30';
        }
        const unitsPassed = parseInt(formData.unitsPassed);
        if (formData.unitsPassed && (isNaN(unitsPassed) || unitsPassed < 0)) {
          newErrors.unitsPassed = 'Units passed must be 0 or greater';
        }
        break;
      case 3:
        if (!formData.annualFamilyIncome.trim()) {
          newErrors.annualFamilyIncome = 'Annual family income is required';
        } else {
          const income = parseInt(formData.annualFamilyIncome);
          if (isNaN(income) || income < 0) {
            newErrors.annualFamilyIncome = 'Annual family income must be a positive number';
          }
        }
        if (!formData.householdSize.trim()) {
          newErrors.householdSize = 'Household size is required';
        } else {
          const size = parseInt(formData.householdSize);
          if (isNaN(size) || size < 1 || size > 20) {
            newErrors.householdSize = 'Household size must be between 1 and 20';
          }
        }
        if (!formData.stBracket) newErrors.stBracket = 'ST Bracket is required';
        break;
      case 4:
        if (!formData.provinceOfOrigin) newErrors.provinceOfOrigin = 'Province is required';
        if (!formData.citizenship) newErrors.citizenship = 'Citizenship is required';
        break;
      case 5:
        // Check that all required documents are uploaded
        const missingDocs = formData.documents.filter(doc => doc.required && !doc.uploaded);
        if (missingDocs.length > 0) {
          newErrors.documents = `Please upload all required documents (${missingDocs.length} missing)`;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle file upload - Optimized approach (no base64 conversion)
  const handleFileChange = async (index: number, file: File | null) => {
    console.log(`📎 handleFileChange called - index: ${index}, file:`, file);
    
    if (!file) {
      console.log('❌ No file provided');
      return;
    }

    // Validate file using utility function
    const validation = validateFile(file);
    console.log(`📋 Validation result:`, validation);
    
    if (!validation.valid) {
      const updatedDocs = [...formData.documents];
      updatedDocs[index].error = validation.error;
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
      return;
    }

    // Create preview URL for the file
    const previewUrl = URL.createObjectURL(file);

    // Store file directly (no base64 conversion!)
    const updatedDocs = [...formData.documents];
    updatedDocs[index].file = file;
    updatedDocs[index].uploaded = true;
    updatedDocs[index].error = undefined;
    updatedDocs[index].previewUrl = previewUrl;
    
    console.log(`✅ File stored in state - index: ${index}, file name: ${file.name}, file size: ${file.size}`);
    console.log(`📋 Updated docs array:`, updatedDocs.map(d => ({ name: d.name, hasFile: !!d.file, uploaded: d.uploaded })));
    
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
    
    console.log(`✅ File selected: ${file.name} (${formatFileSize(file.size)})`);
  };

  // Remove uploaded file
  const handleRemoveFile = (index: number) => {
    const updatedDocs = [...formData.documents];
    
    // Revoke preview URL to free memory
    if (updatedDocs[index].previewUrl) {
      URL.revokeObjectURL(updatedDocs[index].previewUrl!);
    }
    
    updatedDocs[index].file = null;
    updatedDocs[index].uploaded = false;
    updatedDocs[index].error = undefined;
    updatedDocs[index].previewUrl = undefined;
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
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
          // DEBUG: Log documents state before submission
          console.log('📤 ProfileCompletion - Submitting with documents:', formData.documents.map(d => ({
            name: d.name,
            type: d.type,
            uploaded: d.uploaded,
            hasFile: !!d.file,
            fileName: d.file?.name,
            fileSize: d.file?.size
          })));
          
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

  // UPLB Colleges and their respective programs
  const uplbPrograms: Record<string, string[]> = {
    [UPLBCollege.CAFS]: [
      'BS Agriculture',
      'BS Agricultural Biotechnology',
      'BS Agricultural Chemistry',
      'BS Food Science and Technology',
      'BS Nutrition',
      'BS Agricultural and Applied Economics',
      'BS Agribusiness Management and Entrepreneurship',
      'Other CAFS Program'
    ],
    [UPLBCollege.CAS]: [
      'BS Biology',
      'BS Applied Mathematics',
      'BS Applied Physics',
      'BS Chemistry',
      'BS Computer Science',
      'BS Mathematics',
      'BS Mathematics and Science Teaching',
      'BS Statistics',
      'BA Communication Arts',
      'BA Philosophy',
      'BA Sociology',
      'BS Human Kinetics',
      'Associate in Arts in Sports Studies',
      'Other CAS Program'
    ],
    [UPLBCollege.CDC]: [
      'BS Development Communication',
      'Associate of Science in Development Communication',
      'Other CDC Program'
    ],
    [UPLBCollege.CEM]: [
      'BS Accountancy',
      'BS Agricultural and Applied Economics',
      'BS Agribusiness Management and Entrepreneurship',
      'BS Economics',
      'Associate in Arts in Entrepreneurship',
      'Other CEM Program'
    ],
    [UPLBCollege.CEAT]: [
      'BS Agricultural and Biosystems Engineering',
      'BS Chemical Engineering',
      'BS Civil Engineering',
      'BS Electrical Engineering',
      'BS Industrial Engineering',
      'BS Mechanical Engineering',
      'BS Materials Engineering',
      'Other CEAT Program'
    ],
    [UPLBCollege.CFNR]: [
      'BS Forestry',
      'Associate of Science in Forestry',
      'Other CFNR Program'
    ],
    [UPLBCollege.CHE]: [
      'BS Human Ecology',
      'BS Nutrition',
      'Other CHE Program'
    ],
    [UPLBCollege.CVM]: [
      'Doctor of Veterinary Medicine',
      'Other CVM Program'
    ],
    [UPLBCollege.GS]: [
      'Graduate Programs',
      'Other Graduate Program'
    ]
  };

  // College options
  const colleges = [
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

  // Get available courses based on selected college
  const availableCourses = formData.college ? uplbPrograms[formData.college] || [] : [];

  // Year level options
  const yearLevels = [
    { value: YearLevel.FRESHMAN, label: 'Freshman' },
    { value: YearLevel.SOPHOMORE, label: 'Sophomore' },
    { value: YearLevel.JUNIOR, label: 'Junior' },
    { value: YearLevel.SENIOR, label: 'Senior' },
    { value: YearLevel.GRADUATE, label: 'Graduate' },
  ];

  // Philippine provinces
  const provinces = [
    'Metro Manila', 'Laguna', 'Cavite', 'Batangas', 'Rizal', 'Quezon', 'Bulacan',
    'Pampanga', 'Pangasinan', 'Ilocos Norte', 'Ilocos Sur', 'La Union', 'Zambales',
    'Cebu', 'Davao del Sur', 'Davao del Norte', 'Negros Occidental', 'Negros Oriental',
    'Leyte', 'Samar', 'Bohol', 'Palawan', 'Mindoro', 'Albay', 'Camarines Sur',
    'Other'
  ];

  // Gender options
  const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  const stepInfo = [
    { icon: User, label: 'Personal' },
    { icon: GraduationCap, label: 'Academic' },
    { icon: DollarSign, label: 'Financial' },
    { icon: Globe, label: 'Demographic' },
    { icon: Upload, label: 'Documents' }
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
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              step < currentStep ? 'bg-green-500' :
              step === currentStep ? 'bg-primary-600' :
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
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <User className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
          <p className="text-slate-500 text-sm">Tell us about yourself</p>
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
              placeholder="juan.delacruz@up.edu.ph"
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
              placeholder="+63 912 345 6789"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.contactNumber ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          {errors.contactNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.contactNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Street Address</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="e.g., 123 Main Street"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.street ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          {errors.street && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.street}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Barangay</label>
            <input
              type="text"
              value={formData.barangay}
              onChange={(e) => updateField('barangay', e.target.value)}
              placeholder="e.g., Poblacion"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">City/Municipality</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="e.g., Los Baños"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">ZIP Code</label>
          <input
            type="text"
            value={formData.zipCode}
            onChange={(e) => updateField('zipCode', e.target.value)}
            placeholder="e.g., 4031"
            maxLength={4}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Calendar className="w-5 h-5" />
            </div>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.dateOfBirth ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Users className="w-5 h-5" />
            </div>
            <select
              value={formData.gender}
              onChange={(e) => updateField('gender', e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                errors.gender ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Select gender</option>
              {genders.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.gender && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.gender}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Academic Details</h3>
          <p className="text-slate-500 text-sm">Your educational background</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Number</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Hash className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={formData.studentNumber}
              onChange={(e) => updateField('studentNumber', e.target.value)}
              placeholder="2024-12345"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.studentNumber ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          {errors.studentNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.studentNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">College</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Building2 className="w-5 h-5" />
            </div>
            <select
              value={formData.college}
              onChange={(e) => updateField('college', e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                errors.college ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Select college</option>
              {colleges.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.college && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.college}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Course/Program</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <select
              value={formData.course}
              onChange={(e) => updateField('course', e.target.value)}
              disabled={!formData.college}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                !formData.college ? 'bg-slate-50 cursor-not-allowed' :
                errors.course ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">{!formData.college ? 'Select college first' : 'Select your program'}</option>
              {availableCourses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.course && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.course}</p>}
          {formData.college && <p className="text-slate-400 text-xs mt-1">If your program is not listed, select "Other {colleges.find(c => c.value === formData.college)?.value} Program"</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Year Level</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <select
              value={formData.yearLevel}
              onChange={(e) => updateField('yearLevel', e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                errors.yearLevel ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Select year level</option>
              {yearLevels.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.yearLevel && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.yearLevel}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            GWA (General Weighted Average)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <input
              type="number"
              value={formData.gwa}
              onChange={(e) => updateField('gwa', e.target.value)}
              placeholder="e.g., 2.50"
              min="1.0"
              max="5.0"
              step="0.01"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.gwa ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          <p className="text-slate-400 text-xs mt-1">Scale: 1.0 (highest) to 5.0 (lowest)</p>
          {errors.gwa && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.gwa}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Units Enrolled</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <input
                type="number"
                value={formData.unitsEnrolled}
                onChange={(e) => updateField('unitsEnrolled', e.target.value)}
                placeholder="e.g., 18"
                min="0"
                max="30"
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
              />
            </div>
            <p className="text-slate-400 text-xs mt-1">Current semester</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Units Passed</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Award className="w-5 h-5" />
              </div>
              <input
                type="number"
                value={formData.unitsPassed}
                onChange={(e) => updateField('unitsPassed', e.target.value)}
                placeholder="e.g., 54"
                min="0"
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
              />
            </div>
            <p className="text-slate-400 text-xs mt-1">Total completed</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Financial Information</h3>
          <p className="text-slate-500 text-sm">Financial status for scholarship matching</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Family Annual Income (₱)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <input
              type="number"
              value={formData.annualFamilyIncome}
              onChange={(e) => updateField('annualFamilyIncome', e.target.value)}
              placeholder="e.g., 250000"
              min="0"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.annualFamilyIncome ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          <p className="text-slate-400 text-xs mt-1">Enter your family's total annual income</p>
          {errors.annualFamilyIncome && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.annualFamilyIncome}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Household Size
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Home className="w-5 h-5" />
            </div>
            <input
              type="number"
              value={formData.householdSize}
              onChange={(e) => updateField('householdSize', e.target.value)}
              placeholder="e.g., 5"
              min="1"
              max="20"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.householdSize ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            />
          </div>
          <p className="text-slate-400 text-xs mt-1">Total number of family members</p>
          {errors.householdSize && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.householdSize}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            ST Bracket (Socialized Tuition)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Award className="w-5 h-5" />
            </div>
            <select
              value={formData.stBracket}
              onChange={(e) => updateField('stBracket', e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                errors.stBracket ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Select ST bracket</option>
              <option value="Full Discount with Stipend">Full Discount with Stipend (FDS)</option>
              <option value="Full Discount">Full Discount (FD)</option>
              <option value="PD80">Partial Discount 80% (PD80)</option>
              <option value="PD60">Partial Discount 60% (PD60)</option>
              <option value="PD40">Partial Discount 40% (PD40)</option>
              <option value="PD20">Partial Discount 20% (PD20)</option>
              <option value="No Discount">No Discount (ND)</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-slate-400 text-xs mt-1">Your current tuition discount bracket</p>
          {errors.stBracket && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.stBracket}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Do you currently have other scholarships?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateField('hasExistingScholarship', false)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                !formData.hasExistingScholarship
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <X className="w-4 h-4" />
              No, I don't
            </button>
            <button
              type="button"
              onClick={() => updateField('hasExistingScholarship', true)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                formData.hasExistingScholarship
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Check className="w-4 h-4" />
              Yes, I do
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Do you have a thesis/dissertation grant?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateField('hasThesisGrant', false)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                !formData.hasThesisGrant
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <X className="w-4 h-4" />
              No, I don't
            </button>
            <button
              type="button"
              onClick={() => updateField('hasThesisGrant', true)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                formData.hasThesisGrant
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Check className="w-4 h-4" />
              Yes, I do
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Do you have any disciplinary action on record?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateField('hasDisciplinaryAction', false)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                !formData.hasDisciplinaryAction
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <X className="w-4 h-4" />
              No, I don't
            </button>
            <button
              type="button"
              onClick={() => updateField('hasDisciplinaryAction', true)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                formData.hasDisciplinaryAction
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Check className="w-4 h-4" />
              Yes, I do
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Demographic Data</h3>
          <p className="text-slate-500 text-sm">Additional information for eligibility</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Province of Origin</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin className="w-5 h-5" />
            </div>
            <select
              value={formData.provinceOfOrigin}
              onChange={(e) => updateField('provinceOfOrigin', e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                errors.provinceOfOrigin ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Select province</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.provinceOfOrigin && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.provinceOfOrigin}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Citizenship</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Globe className="w-5 h-5" />
            </div>
            <select
              value={formData.citizenship}
              onChange={(e) => updateField('citizenship', e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white cursor-pointer ${
                errors.citizenship ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="Filipino">Filipino</option>
              <option value="Dual Citizen">Dual Citizen</option>
              <option value="Foreign National">Foreign National</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.citizenship && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {errors.citizenship}</p>}
        </div>
      </div>
    </div>
  );
  
  const renderStep5 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Required Documents</h3>
          <p className="text-slate-500 text-sm">Upload necessary documents for profile verification</p>
        </div>
      </div>

      {errors.documents && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errors.documents}
        </div>
      )}

      <div className="space-y-4">
        {formData.documents.map((doc, index) => (
          <div key={index} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-900">{doc.name}</h3>
                  {doc.required && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      Required
                    </span>
                  )}
                  <p className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
                </div>
              </div>
              {doc.uploaded && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>

            {!doc.uploaded ? (
              <label className="block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Click to upload</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>
              </label>
            ) : (
              <div className="space-y-3">
                {/* File Preview */}
                {doc.file && doc.previewUrl && (
                  <div 
                    className="border border-green-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-400 transition-colors relative group"
                    onClick={() => {
                      console.log('🔍 Preview clicked:', {
                        name: doc.name,
                        fileType: doc.file?.type,
                        previewUrl: doc.previewUrl,
                        hasPreviewUrl: !!doc.previewUrl
                      });
                      setPreviewDoc({
                        name: doc.name,
                        type: doc.file?.type || 'application/pdf',
                        previewUrl: doc.previewUrl || ''
                      });
                      setPreviewModalOpen(true);
                    }}
                  >
                    {doc.file.type === 'application/pdf' ? (
                      <div className="bg-slate-50 p-4 flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600">PDF Preview</p>
                          <p className="text-xs text-slate-500">{doc.file.name}</p>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={doc.previewUrl} 
                        alt={doc.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white rounded-full p-3">
                        <Eye className="w-6 h-6 text-slate-700" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* File Info */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.file?.name}</p>
                      <p className="text-xs text-slate-600">
                        {doc.file && (doc.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            )}

            {doc.error && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                ⚠ {doc.error}
              </p>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These documents will be used to verify your profile information and may be reviewed during scholarship application processing.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary-600 mb-2">Complete Your Profile</h1>
          <p className="text-slate-600">Help us match you with the best scholarship opportunities</p>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}

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

      {/* Preview Modal */}
      {previewModalOpen && previewDoc && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setPreviewModalOpen(false);
            setPreviewDoc(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-primary-600 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-lg">{previewDoc.name}</h3>
                  <p className="text-sm text-primary-100">Document Preview</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewDoc(null);
                }} 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {previewDoc.type === 'application/pdf' ? (
                <embed
                  src={previewDoc.previewUrl}
                  type="application/pdf"
                  className="w-full h-[600px] border-0 rounded-lg"
                  title={previewDoc.name}
                />
              ) : (
                <img
                  src={previewDoc.previewUrl}
                  alt={previewDoc.name}
                  className="w-full h-auto rounded-lg"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewDoc(null);
                }}
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

export default ProfileCompletion;
