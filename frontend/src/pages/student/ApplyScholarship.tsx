// ============================================================================
// ISKOlarship - Apply Scholarship Page
// Dynamic scholarship application form with document upload
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  AlertCircle,
  X,
  File,
  CheckCircle,
  Loader2,
  Info,
  Award
} from 'lucide-react';
import { Scholarship, StudentProfile } from '../../types';
import { scholarshipApi, applicationApi } from '../../services/apiClient';
import { matchStudentToScholarships } from '../../services/filterEngine';

// ============================================================================
// Types
// ============================================================================

interface DocumentUpload {
  file: File | null;
  type: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  error?: string;
}

interface ApplicationFormData {
  personalStatement: string;
  additionalInfo: string;
  documents: DocumentUpload[];
}

// ============================================================================
// Component
// ============================================================================

const ApplyScholarship: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalStatement: '',
    additionalInfo: '',
    documents: []
  });

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // Fetch scholarship and student profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch scholarship
        const scholarshipResponse = await scholarshipApi.getById(id!);
        if (!scholarshipResponse.success) {
          throw new Error('Failed to load scholarship');
        }
        
        const scholarshipData = scholarshipResponse.data;
        setScholarship(scholarshipData);

        // Fetch student profile
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setStudentProfile(user.studentProfile || user);
        }

        // Initialize document uploads dynamically based on scholarship requirements
        const requiredDocs: DocumentUpload[] = [];
        
        // Check if scholarship has custom required documents
        if (scholarshipData.requiredDocuments && scholarshipData.requiredDocuments.length > 0) {
          // Use scholarship-specific required documents
          scholarshipData.requiredDocuments.forEach((doc: any) => {
            // Map document name to type
            let docType = 'other';
            const docNameLower = doc.name.toLowerCase();
            
            if (docNameLower.includes('transcript')) docType = 'transcript';
            else if (docNameLower.includes('registration') || docNameLower.includes('certificate of registration')) docType = 'certificate_of_registration';
            else if (docNameLower.includes('income') || docNameLower.includes('itr')) docType = 'income_certificate';
            else if (docNameLower.includes('thesis')) docType = 'thesis_outline';
            else if (docNameLower.includes('recommendation') || docNameLower.includes('letter')) docType = 'recommendation_letter';
            else if (docNameLower.includes('grade')) docType = 'grade_report';
            else if (docNameLower.includes('barangay') || docNameLower.includes('indigency')) docType = 'barangay_certificate';
            else if (docNameLower.includes('id')) docType = 'photo_id';
            
            requiredDocs.push({
              file: null,
              type: docType,
              name: doc.name + (doc.isRequired ? '' : ' (Optional)'),
              required: doc.isRequired !== false,
              uploaded: false
            });
          });
        } else {
          // Use default document requirements
          requiredDocs.push({
            file: null,
            type: 'transcript',
            name: 'Transcript of Records',
            required: true,
            uploaded: false
          });

          requiredDocs.push({
            file: null,
            type: 'certificate_of_registration',
            name: 'Certificate of Registration',
            required: true,
            uploaded: false
          });

          // Add income certificate if scholarship has income requirement
          if (scholarshipData.eligibilityCriteria?.maxAnnualFamilyIncome) {
            requiredDocs.push({
              file: null,
              type: 'income_certificate',
              name: 'Family Income Certificate / ITR',
              required: true,
              uploaded: false
            });
          }

          // Add thesis outline if required
          if (scholarshipData.eligibilityCriteria?.requiresApprovedThesis) {
            requiredDocs.push({
              file: null,
              type: 'thesis_outline',
              name: 'Approved Thesis Outline',
              required: true,
              uploaded: false
            });
          }

          // Add recommendation letter (optional)
          requiredDocs.push({
            file: null,
            type: 'recommendation_letter',
            name: 'Recommendation Letter',
            required: false,
            uploaded: false
          });
        }

        setFormData(prev => ({ ...prev, documents: requiredDocs }));
        
      } catch (err: any) {
        setError(err.message || 'Failed to load application form');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Check eligibility
  const matchResult = React.useMemo(() => {
    if (!scholarship || !studentProfile) return null;
    const results = matchStudentToScholarships(studentProfile, [scholarship]);
    return results[0] || null;
  }, [scholarship, studentProfile]);

  // Handle file upload
  const handleFileChange = (index: number, file: File | null) => {
    if (!file) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const updatedDocs = [...formData.documents];
      updatedDocs[index].error = 'File size must be less than 5MB';
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
      return;
    }

    // Validate file type (PDF, images)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      const updatedDocs = [...formData.documents];
      updatedDocs[index].error = 'Only PDF, JPG, and PNG files are allowed';
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
      return;
    }

    const updatedDocs = [...formData.documents];
    updatedDocs[index].file = file;
    updatedDocs[index].uploaded = true;
    updatedDocs[index].error = undefined;
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
  };

  // Remove uploaded file
  const handleRemoveFile = (index: number) => {
    const updatedDocs = [...formData.documents];
    updatedDocs[index].file = null;
    updatedDocs[index].uploaded = false;
    updatedDocs[index].error = undefined;
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
  };

  // Validate form
  const validateForm = (): boolean => {
    // Check required documents
    const missingDocs = formData.documents.filter(doc => doc.required && !doc.uploaded);
    if (missingDocs.length > 0) {
      showToast(`Please upload all required documents`, 'error');
      return false;
    }

    // Check personal statement
    if (!formData.personalStatement.trim()) {
      showToast('Personal statement is required', 'error');
      return false;
    }

    if (formData.personalStatement.length < 100) {
      showToast('Personal statement must be at least 100 characters', 'error');
      return false;
    }

    return true;
  };

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
  };

  // Submit application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // In a real implementation, you would upload files to a storage service
      // and get URLs back, then submit the application with those URLs
      
      if (!id) {
        throw new Error('Scholarship ID is missing');
      }
      
      const applicationData = {
        scholarshipId: id,
        personalStatement: formData.personalStatement,
        additionalInfo: formData.additionalInfo,
        // In production, this would include document URLs from cloud storage
        documents: formData.documents
          .filter(doc => doc.uploaded)
          .map(doc => ({
            name: doc.name,
            documentType: doc.type,
            fileName: doc.file?.name,
            fileSize: doc.file?.size,
            mimeType: doc.file?.type
          }))
      };

      const response = await applicationApi.create(applicationData);

      if (response.success) {
        showToast('🎉 Application submitted successfully!', 'success');
        setTimeout(() => {
          navigate('/student/applications');
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to submit application');
      }

    } catch (err: any) {
      showToast(err.message || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Get scholarship type color
  const getTypeColor = (type: string) => {
    const colors = {
      university: 'bg-blue-100 text-blue-700 border-blue-300',
      college: 'bg-teal-100 text-teal-700 border-teal-300',
      government: 'bg-amber-100 text-amber-700 border-amber-300',
      private: 'bg-purple-100 text-purple-700 border-purple-300',
      thesis_grant: 'bg-emerald-100 text-emerald-700 border-emerald-300'
    };
    return colors[type as keyof typeof colors] || colors.university;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
          <p className="text-slate-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !scholarship) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error || 'Scholarship not found'}</p>
          <Link to="/scholarships" className="btn-primary inline-block">
            Back to Scholarships
          </Link>
        </div>
      </div>
    );
  }

  // Check eligibility
  if (matchResult && !matchResult.isEligible) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Not Eligible</h2>
          <p className="text-slate-600 mb-6">
            Unfortunately, you don't meet the eligibility requirements for this scholarship.
          </p>
          <Link to={`/scholarships/${id}`} className="btn-primary inline-block">
            View Scholarship Details
          </Link>
        </div>
      </div>
    );
  }

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`card p-4 shadow-lg max-w-md flex items-start gap-3 ${
            toast.type === 'success' ? 'border-l-4 border-green-500' :
            toast.type === 'error' ? 'border-l-4 border-red-500' :
            'border-l-4 border-blue-500'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <p className="text-sm text-slate-700 flex-1">{toast.message}</p>
            <button onClick={() => setToast({ ...toast, show: false })} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container-app py-6">
          <Link
            to={`/scholarships/${id}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Scholarship
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-8 h-8 text-primary-600" />
                <h1 className="text-3xl font-bold text-slate-900">{scholarship.name}</h1>
              </div>
              <p className="text-slate-600">{scholarship.sponsor}</p>
              <div className="mt-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(scholarship.type)}`}>
                  {scholarship.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Application Progress</span>
              <span className="text-sm font-medium text-primary-600">Step {currentStep} of {totalSteps}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container-app py-8">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Personal Information Review */}
              {currentStep === 1 && (
                <div className="card p-6 border-t-4 border-primary-600">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Review Your Information</h2>
                      <p className="text-sm text-slate-600">Verify that your profile information is accurate</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-900 font-semibold mb-1">Information from your profile</p>
                        <p className="text-sm text-blue-700">
                          The information below is taken from your student profile. If you need to update it, 
                          please go to your profile settings first.
                        </p>
                      </div>
                    </div>
                  </div>

                  {studentProfile && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">Student Number</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900">{studentProfile.studentNumber || 'Not provided'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">GWA</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900">{studentProfile.gwa ? studentProfile.gwa.toFixed(2) : 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">College</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900 text-sm">{studentProfile.college || 'Not provided'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">Year Level</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900">{studentProfile.yearLevel || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Course</label>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-slate-900">{studentProfile.course || 'Not provided'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">Annual Family Income</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900">
                              {studentProfile.annualFamilyIncome 
                                ? `₱${studentProfile.annualFamilyIncome.toLocaleString()}`
                                : 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">ST Bracket</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900">{studentProfile.stBracket || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="btn-primary flex items-center gap-2"
                    >
                      Continue to Documents
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Document Upload */}
              {currentStep === 2 && (
                <div className="card p-6 border-t-4 border-primary-600">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                      <span className="text-white font-bold text-lg">2</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Upload Documents</h2>
                      <p className="text-sm text-slate-600">All documents must be in PDF, JPG, or PNG format (max 5MB each)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-slate-900">{doc.name}</h3>
                              {doc.required && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          {doc.uploaded && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
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
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600 font-medium">Click to upload</p>
                              <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (max 5MB)</p>
                            </div>
                          </label>
                        ) : (
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
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}

                        {doc.error && (
                          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {doc.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const hasRequiredDocs = formData.documents
                          .filter(doc => doc.required)
                          .every(doc => doc.uploaded);
                        
                        if (!hasRequiredDocs) {
                          showToast('Please upload all required documents', 'error');
                          return;
                        }
                        setCurrentStep(3);
                      }}
                      className="btn-primary flex items-center gap-2"
                    >
                      Continue to Statement
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Personal Statement */}
              {currentStep === 3 && (
                <div className="card p-6 border-t-4 border-primary-600">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                      <span className="text-white font-bold text-lg">3</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Personal Statement</h2>
                      <p className="text-sm text-slate-600">Tell us why you're applying for this scholarship</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Personal Statement <span className="text-red-500">*</span>
                      </label>
                      <p className="text-sm text-slate-600 mb-3">
                        Explain why you are applying for this scholarship, how it will help you achieve your goals,
                        and what makes you a strong candidate. (Minimum 100 characters, maximum 5000)
                      </p>
                      <textarea
                        value={formData.personalStatement}
                        onChange={(e) => setFormData(prev => ({ ...prev, personalStatement: e.target.value }))}
                        rows={10}
                        className="input w-full"
                        placeholder="Start writing your personal statement here..."
                        maxLength={5000}
                      />
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className={`${
                          formData.personalStatement.length < 100 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {formData.personalStatement.length < 100 
                            ? `${100 - formData.personalStatement.length} more characters needed`
                            : '✓ Minimum length met'}
                        </span>
                        <span className="text-slate-500">
                          {formData.personalStatement.length} / 5000
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Additional Information <span className="text-slate-500">(Optional)</span>
                      </label>
                      <p className="text-sm text-slate-600 mb-3">
                        Include any additional information you think is relevant to your application.
                      </p>
                      <textarea
                        value={formData.additionalInfo}
                        onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                        rows={5}
                        className="input w-full"
                        placeholder="Any additional information..."
                        maxLength={2000}
                      />
                      <div className="mt-2 text-sm text-right text-slate-500">
                        {formData.additionalInfo.length} / 2000
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Submit Application
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-6 border-t-4 border-primary-600">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Application Checklist</h3>
                </div>
                <div className="space-y-3">
                  <div className={`flex items-start gap-3 ${currentStep > 1 ? 'opacity-100' : 'opacity-50'}`}>
                    {currentStep > 1 ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">Profile Information</p>
                      <p className="text-xs text-slate-600">Review your profile details</p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 ${currentStep > 2 ? 'opacity-100' : 'opacity-50'}`}>
                    {currentStep > 2 ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">Required Documents</p>
                      <p className="text-xs text-slate-600">
                        {formData.documents.filter(d => d.required && d.uploaded).length} / {formData.documents.filter(d => d.required).length} uploaded
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 ${formData.personalStatement.length >= 100 ? 'opacity-100' : 'opacity-50'}`}>
                    {formData.personalStatement.length >= 100 ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">Personal Statement</p>
                      <p className="text-xs text-slate-600">Write your statement</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Important Notes</h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 mt-0.5">•</span>
                      <span>Review all information carefully before submitting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 mt-0.5">•</span>
                      <span>Ensure all documents are clear and legible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 mt-0.5">•</span>
                      <span>You can track your application status after submission</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 mt-0.5">•</span>
                      <span>You will be notified via email about updates</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyScholarship;
