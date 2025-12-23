// ============================================================================
// ISKOlarship - Profile Completion Wizard
// 4-step wizard for first-time user profile setup
// ============================================================================

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Calendar } from 'lucide-react';
import { YearLevel, UPLBCollege } from '../types';

export interface ProfileData {
  // Step 1: Personal Information
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
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
  householdSize: string;
  stBracket: string;
  
  // Step 4: Demographic Data
  provinceOfOrigin: string;
  citizenship: string;
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
  const totalSteps = 4;

  const [formData, setFormData] = useState<ProfileData>({
    fullName: '',
    email: email,
    contactNumber: '',
    address: '',
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
    householdSize: '',
    stBracket: '',
    provinceOfOrigin: '',
    citizenship: 'Filipino',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ProfileData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        break;
      case 2:
        if (!formData.college) newErrors.college = 'College is required';
        if (!formData.course.trim()) newErrors.course = 'Course is required';
        if (!formData.yearLevel) newErrors.yearLevel = 'Year level is required';
        if (!formData.gwa.trim()) newErrors.gwa = 'GWA is required';
        if (!formData.studentNumber.trim()) newErrors.studentNumber = 'Student number is required';
        break;
      case 3:
        if (!formData.annualFamilyIncome.trim()) newErrors.annualFamilyIncome = 'Family income is required';
        if (!formData.householdSize.trim()) newErrors.householdSize = 'Household size is required';
        if (!formData.stBracket) newErrors.stBracket = 'ST Bracket is required';
        break;
      case 4:
        if (!formData.provinceOfOrigin) newErrors.provinceOfOrigin = 'Province is required';
        if (!formData.citizenship) newErrors.citizenship = 'Citizenship is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete(formData);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex gap-2 mb-2">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`flex-1 h-2 rounded-full transition-all ${
              step <= currentStep ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-slate-500">Step {currentStep} of {totalSteps}</p>
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Personal Information</h3>
      <p className="text-slate-500 text-sm mb-6">Tell us about yourself</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="Juan Dela Cruz"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.fullName ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="juan.delacruz@university.edu"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.email ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
          <input
            type="tel"
            value={formData.contactNumber}
            onChange={(e) => updateField('contactNumber', e.target.value)}
            placeholder="+63 912 345 6789"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.contactNumber ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Main Street, City"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
          <div className="relative">
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                errors.dateOfBirth ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white ${
              errors.gender ? 'border-red-300' : 'border-slate-200'
            }`}
          >
            <option value="">Select gender</option>
            {genders.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Academic Details</h3>
      <p className="text-slate-500 text-sm mb-6">Your educational background</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Student Number</label>
          <input
            type="text"
            value={formData.studentNumber}
            onChange={(e) => updateField('studentNumber', e.target.value)}
            placeholder="2024-12345"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.studentNumber ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {errors.studentNumber && <p className="text-red-500 text-xs mt-1">{errors.studentNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
          <select
            value={formData.college}
            onChange={(e) => updateField('college', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white ${
              errors.college ? 'border-red-300' : 'border-slate-200'
            }`}
          >
            <option value="">Select college</option>
            {colleges.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.college && <p className="text-red-500 text-xs mt-1">{errors.college}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
          <input
            type="text"
            value={formData.course}
            onChange={(e) => updateField('course', e.target.value)}
            placeholder="e.g., BS Computer Science"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.course ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {errors.course && <p className="text-red-500 text-xs mt-1">{errors.course}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Year Level</label>
          <select
            value={formData.yearLevel}
            onChange={(e) => updateField('yearLevel', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white ${
              errors.yearLevel ? 'border-red-300' : 'border-slate-200'
            }`}
          >
            <option value="">Select year level</option>
            {yearLevels.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
          {errors.yearLevel && <p className="text-red-500 text-xs mt-1">{errors.yearLevel}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            GWA (General Weighted Average)
          </label>
          <input
            type="text"
            value={formData.gwa}
            onChange={(e) => updateField('gwa', e.target.value)}
            placeholder="e.g., 2.50"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.gwa ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          <p className="text-slate-400 text-xs mt-1">Scale: 1.0 (highest) to 5.0 (lowest)</p>
          {errors.gwa && <p className="text-red-500 text-xs mt-1">{errors.gwa}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Units Enrolled</label>
          <input
            type="text"
            value={formData.unitsEnrolled}
            onChange={(e) => updateField('unitsEnrolled', e.target.value)}
            placeholder="e.g., 18"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
          <p className="text-slate-400 text-xs mt-1">Current semester units</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Units Passed</label>
          <input
            type="text"
            value={formData.unitsPassed}
            onChange={(e) => updateField('unitsPassed', e.target.value)}
            placeholder="e.g., 54"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
          <p className="text-slate-400 text-xs mt-1">Total units completed so far</p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Financial Information</h3>
      <p className="text-slate-500 text-sm mb-6">Financial status for scholarship matching</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Family Annual Income (₱)
          </label>
          <input
            type="text"
            value={formData.annualFamilyIncome}
            onChange={(e) => updateField('annualFamilyIncome', e.target.value)}
            placeholder="e.g., 250000"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.annualFamilyIncome ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          <p className="text-slate-400 text-xs mt-1">Enter your family's total annual income</p>
          {errors.annualFamilyIncome && <p className="text-red-500 text-xs mt-1">{errors.annualFamilyIncome}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Household Size
          </label>
          <input
            type="number"
            value={formData.householdSize}
            onChange={(e) => updateField('householdSize', e.target.value)}
            placeholder="e.g., 5"
            min="1"
            max="20"
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
              errors.householdSize ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          <p className="text-slate-400 text-xs mt-1">Total number of family members</p>
          {errors.householdSize && <p className="text-red-500 text-xs mt-1">{errors.householdSize}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ST Bracket (Socialized Tuition)
          </label>
          <select
            value={formData.stBracket}
            onChange={(e) => updateField('stBracket', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white ${
              errors.stBracket ? 'border-red-300' : 'border-slate-200'
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
          <p className="text-slate-400 text-xs mt-1">Your current tuition discount bracket</p>
          {errors.stBracket && <p className="text-red-500 text-xs mt-1">{errors.stBracket}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Do you currently have other scholarships?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateField('hasExistingScholarship', false)}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                !formData.hasExistingScholarship
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => updateField('hasExistingScholarship', true)}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                formData.hasExistingScholarship
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Demographic Data</h3>
      <p className="text-slate-500 text-sm mb-6">Additional information for eligibility</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Province of Origin</label>
          <select
            value={formData.provinceOfOrigin}
            onChange={(e) => updateField('provinceOfOrigin', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white ${
              errors.provinceOfOrigin ? 'border-red-300' : 'border-slate-200'
            }`}
          >
            <option value="">Select province</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.provinceOfOrigin && <p className="text-red-500 text-xs mt-1">{errors.provinceOfOrigin}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Citizenship</label>
          <select
            value={formData.citizenship}
            onChange={(e) => updateField('citizenship', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white ${
              errors.citizenship ? 'border-red-300' : 'border-slate-200'
            }`}
          >
            <option value="Filipino">Filipino</option>
            <option value="Dual Citizen">Dual Citizen</option>
            <option value="Foreign National">Foreign National</option>
          </select>
          {errors.citizenship && <p className="text-red-500 text-xs mt-1">{errors.citizenship}</p>}
        </div>
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
            className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
          >
            {currentStep === totalSteps ? (
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
    </div>
  );
};

export default ProfileCompletion;
