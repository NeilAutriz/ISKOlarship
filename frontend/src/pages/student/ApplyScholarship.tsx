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
  Award,
  Eye,
  Edit3
} from 'lucide-react';
import { Scholarship, StudentProfile, CustomCondition } from '../../types';
import { scholarshipApi, applicationApi, userApi } from '../../services/apiClient';
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
  previewUrl?: string; // Preview URL for local files
  allowedFileType?: 'any' | 'pdf' | 'image' | 'text'; // File type restriction from scholarship
  textContent?: string; // For text-type documents (no file upload needed)
  existingDocId?: string; // Server document ID (edit mode)
  existingFileName?: string; // Original file name from server
  existingFileSize?: number; // Original file size from server
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
  const { id, applicationId } = useParams<{ id: string; applicationId: string }>();
  const isEditMode = !!applicationId;
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
  
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; previewUrl: string } | null>(null);

  // Custom fields state for scholarship-specific requirements
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});
  const [customFieldRequirements, setCustomFieldRequirements] = useState<Array<{
    fieldName: string;
    displayName: string;
    conditionType: string;
    isRequired: boolean;
    description?: string;
  }>>([]);

  // Edit mode state
  const [existingApplication, setExistingApplication] = useState<any>(null);
  // Resolved scholarship ID: from URL param (create mode) or from loaded application (edit mode)
  const [resolvedScholarshipId, setResolvedScholarshipId] = useState<string | null>(id || null);

  // Fetch scholarship and student profile
  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const fetchData = async () => {
      try {
        if (isMounted) setLoading(true);

        let scholarshipId = id; // From URL param (create mode)
        let applicationData: any = null;

        // In CREATE mode, check if user already has an active application for this scholarship
        if (!isEditMode && scholarshipId) {
          try {
            const checkResponse = await applicationApi.checkExisting(scholarshipId);
            if (checkResponse.success && checkResponse.data?.exists && checkResponse.data.applicationId) {
              const existingStatus = checkResponse.data.status;
              const existingAppId = checkResponse.data.applicationId;

              if (existingStatus === 'draft') {
                // Draft exists — redirect to edit mode so user can continue filling it out
                if (isMounted) {
                  navigate(`/applications/${existingAppId}/edit`, { replace: true });
                }
                return; // Stop loading, navigation will unmount component
              } else {
                // Active non-draft application exists (submitted, under_review, etc.)
                if (isMounted) {
                  showToast('You already have an active application for this scholarship.', 'info');
                  navigate('/my-applications', { replace: true });
                }
                return;
              }
            }
          } catch (checkErr: any) {
            // If the check endpoint fails, continue with normal flow — the POST will catch duplicates
            console.warn('Could not check for existing application:', checkErr);
          }
        }

        // In edit mode, first load the existing application
        if (isEditMode && applicationId) {
          const appResponse = await applicationApi.getById(applicationId);
          if (!appResponse.success || !appResponse.data) {
            throw new Error('Failed to load application');
          }
          applicationData = appResponse.data;
          if (isMounted) setExistingApplication(applicationData);

          // Extract scholarship ID from the loaded application
          scholarshipId = typeof applicationData.scholarship === 'string'
            ? applicationData.scholarship
            : applicationData.scholarship?._id || applicationData.scholarship?.id;

          if (isMounted) setResolvedScholarshipId(scholarshipId || null);
        }

        if (!scholarshipId) {
          throw new Error('Scholarship ID is missing');
        }

        // Fetch scholarship
        const scholarshipResponse = await scholarshipApi.getById(scholarshipId);
        if (!scholarshipResponse.success) {
          throw new Error('Failed to load scholarship');
        }

        const scholarshipData = scholarshipResponse.data;
        if (isMounted) setScholarship(scholarshipData);

        // Fetch student profile from API (not localStorage which may be stale/empty)
        const profileResponse = await userApi.getProfile();
        let fetchedProfile: any = null;
        if (isMounted && profileResponse.success && profileResponse.data) {
          fetchedProfile = profileResponse.data;
          setStudentProfile(fetchedProfile.studentProfile || fetchedProfile);
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
              name: doc.name, // Don't add (Optional) - just show the name
              required: doc.isRequired !== false,
              uploaded: false,
              allowedFileType: doc.fileType || 'any'
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

        // In edit mode: match existing application documents to required doc slots
        if (isEditMode && applicationData?.documents) {
          const existingDocs = applicationData.documents || [];
          requiredDocs.forEach((reqDoc, idx) => {
            // Find matching existing doc by type or name
            const match = existingDocs.find((ed: any) => {
              const typeMatch = ed.documentType === reqDoc.type || ed.type === reqDoc.type;
              const nameMatch = ed.name?.toLowerCase() === reqDoc.name.toLowerCase();
              return typeMatch || nameMatch;
            });
            if (match) {
              requiredDocs[idx].uploaded = true;
              requiredDocs[idx].existingDocId = match._id;
              requiredDocs[idx].existingFileName = match.fileName || match.name;
              requiredDocs[idx].existingFileSize = match.fileSize;
              // For text documents, restore textContent
              if (match.isTextDocument && match.textContent) {
                requiredDocs[idx].textContent = match.textContent;
              }
            }
          });
        }

        if (isMounted) {
          setFormData(prev => ({
            ...prev,
            documents: requiredDocs,
            // Pre-fill text fields in edit mode
            ...(isEditMode && applicationData ? {
              personalStatement: applicationData.personalStatement || '',
              additionalInfo: applicationData.additionalInfo || '',
            } : {})
          }));
        }

        // Extract custom field requirements from customConditions
        const customConditions = scholarshipData.eligibilityCriteria?.customConditions as CustomCondition[] | undefined;
        if (customConditions && Array.isArray(customConditions) && isMounted) {
          const customFields = customConditions
            .filter((cond: CustomCondition) => cond.isActive !== false && cond.studentField?.startsWith('customFields.'))
            .map((cond: CustomCondition) => {
              const fieldPath = cond.studentField;
              const fieldName = fieldPath.replace('customFields.', '');
              // Convert camelCase to readable label
              const displayName = fieldName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())
                .trim();

              return {
                fieldName,
                displayName: cond.name || displayName,
                conditionType: cond.conditionType,
                isRequired: cond.importance === 'required',
                description: cond.description
              };
            });

          setCustomFieldRequirements(customFields);

          // In edit mode: pre-fill custom field values from application's customFieldAnswers
          if (isEditMode && applicationData?.customFieldAnswers) {
            const savedAnswers = applicationData.customFieldAnswers;
            const initialValues: Record<string, string | number | boolean> = {};
            customFields.forEach(field => {
              if (savedAnswers[field.fieldName] !== undefined) {
                initialValues[field.fieldName] = savedAnswers[field.fieldName];
              }
            });
            if (Object.keys(initialValues).length > 0) {
              setCustomFieldValues(initialValues);
            } else if (fetchedProfile) {
              // Fallback to profile custom fields
              const existingCustomFields = (fetchedProfile.studentProfile || fetchedProfile)?.customFields || {};
              const profileValues: Record<string, string | number | boolean> = {};
              customFields.forEach(field => {
                if (existingCustomFields[field.fieldName] !== undefined) {
                  profileValues[field.fieldName] = existingCustomFields[field.fieldName];
                }
              });
              setCustomFieldValues(profileValues);
            }
          } else if (fetchedProfile) {
            // Create mode: initialize from profile
            const existingCustomFields = (fetchedProfile.studentProfile || fetchedProfile)?.customFields || {};
            const initialValues: Record<string, string | number | boolean> = {};
            customFields.forEach(field => {
              if (existingCustomFields[field.fieldName] !== undefined) {
                initialValues[field.fieldName] = existingCustomFields[field.fieldName];
              }
            });
            setCustomFieldValues(initialValues);
          }
        }

      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load application form');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id || applicationId) {
      fetchData();
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [id, applicationId, isEditMode]);

  // Check eligibility
  const matchResult = React.useMemo(() => {
    if (!scholarship || !studentProfile) return null;
    const results = matchStudentToScholarships(studentProfile, [scholarship]);
    return results[0] || null;
  }, [scholarship, studentProfile]);

  // Handle file upload (no base64 conversion - use FormData instead)
  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const updatedDocs = [...formData.documents];
      updatedDocs[index].error = 'File size must be less than 5MB';
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    // Validate file type (PDF, images)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      const updatedDocs = [...formData.documents];
      updatedDocs[index].error = 'Only PDF, JPG, and PNG files are allowed';
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
      showToast('Only PDF, JPG, and PNG files are allowed', 'error');
      return;
    }

    try {
      // Create preview URL (no base64 conversion needed!)
      const previewUrl = URL.createObjectURL(file);
      
      const updatedDocs = [...formData.documents];
      updatedDocs[index].file = file;
      updatedDocs[index].uploaded = true;
      updatedDocs[index].error = undefined;
      updatedDocs[index].previewUrl = previewUrl;
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
      
      showToast(`${file.name} ready to upload`, 'success');
    } catch (error) {
      const updatedDocs = [...formData.documents];
      updatedDocs[index].error = 'Failed to process file';
      setFormData(prev => ({ ...prev, documents: updatedDocs }));
    }
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
    updatedDocs[index].existingDocId = undefined;
    updatedDocs[index].existingFileName = undefined;
    updatedDocs[index].existingFileSize = undefined;
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
    showToast('File removed', 'info');
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

      const currentScholarshipId = resolvedScholarshipId || id;
      if (!currentScholarshipId && !isEditMode) {
        throw new Error('Scholarship ID is missing');
      }

      // Save custom field values to student profile if any were filled
      if (Object.keys(customFieldValues).length > 0) {
        try {
          await userApi.updateProfile({
            studentProfile: {
              customFields: customFieldValues
            }
          });
        } catch (err) {
          console.warn('⚠️ Could not save custom fields to profile:', err);
          // Continue with application submission even if profile update fails
        }
      }

      // Create FormData for multipart/form-data upload (efficient!)
      const formDataToSend = new FormData();
      formDataToSend.append('personalStatement', formData.personalStatement);
      formDataToSend.append('additionalInfo', formData.additionalInfo);

      // Append custom field answers to be stored with the application
      if (Object.keys(customFieldValues).length > 0) {
        formDataToSend.append('customFieldAnswers', JSON.stringify(customFieldValues));
      }

      if (isEditMode) {
        // EDIT MODE: Include existing document IDs to keep + new uploads
        const keptDocIds = formData.documents
          .filter(doc => doc.existingDocId && doc.uploaded && !doc.file)
          .map(doc => doc.existingDocId!);
        formDataToSend.append('existingDocumentIds', JSON.stringify(keptDocIds));

        // Only append NEW file uploads (not existing server docs)
        formData.documents
          .filter(doc => doc.uploaded && doc.file && doc.allowedFileType !== 'text')
          .forEach(doc => {
            formDataToSend.append('documents', doc.file!);
            formDataToSend.append('documentNames', doc.name);
            formDataToSend.append('documentTypes', doc.type);
          });

        // Append text documents
        const textDocuments = formData.documents
          .filter(doc => doc.allowedFileType === 'text' && doc.textContent && doc.textContent.trim().length > 0 && !doc.existingDocId)
          .map(doc => ({
            name: doc.name,
            type: doc.type,
            content: doc.textContent
          }));

        if (textDocuments.length > 0) {
          formDataToSend.append('textDocuments', JSON.stringify(textDocuments));
        }

        const response = await applicationApi.update(applicationId!, formDataToSend);

        if (response.success) {
          // If the application was a draft, also submit it to change status from draft to submitted
          if (existingApplication?.status === 'draft') {
            const submitResponse = await applicationApi.submit(applicationId!);
            if (submitResponse.success) {
              showToast('Application submitted successfully!', 'success');
            } else {
              showToast('Application updated but not submitted. Please submit it from your applications page.', 'info');
            }
          } else {
            showToast('Application updated successfully!', 'success');
          }
          setTimeout(() => {
            navigate('/my-applications');
          }, 2000);
        } else {
          throw new Error(response.message || 'Failed to update application');
        }
      } else {
        // CREATE MODE: Original flow
        formDataToSend.append('scholarshipId', currentScholarshipId!);

        // Append file documents and their metadata
        formData.documents
          .filter(doc => doc.uploaded && doc.file && doc.allowedFileType !== 'text')
          .forEach(doc => {
            formDataToSend.append('documents', doc.file!); // Append actual file
            formDataToSend.append('documentNames', doc.name);
            formDataToSend.append('documentTypes', doc.type);
          });

        // Append text documents (no file, just text content)
        const textDocuments = formData.documents
          .filter(doc => doc.allowedFileType === 'text' && doc.textContent && doc.textContent.trim().length > 0)
          .map(doc => ({
            name: doc.name,
            type: doc.type,
            content: doc.textContent
          }));

        if (textDocuments.length > 0) {
          formDataToSend.append('textDocuments', JSON.stringify(textDocuments));
        }

        // Create the application
        const response = await applicationApi.create(formDataToSend);

        if (response.success) {
          // If application was created successfully, submit it
          const createdAppId = response.data?.application?._id;
          if (createdAppId) {
            // Call submit endpoint to change status from draft to submitted
            const submitResponse = await applicationApi.submit(createdAppId);
            if (submitResponse.success) {
              showToast('Application submitted successfully!', 'success');
            } else {
              showToast('Application created but not submitted. Please submit it from your applications page.', 'info');
            }
          } else {
            showToast('Application created successfully!', 'success');
          }

          setTimeout(() => {
            navigate('/my-applications');
          }, 2000);
        } else {
          throw new Error(response.message || 'Failed to submit application');
        }
      }

    } catch (err: any) {
      // Handle 409 Conflict — user already has an active application for this scholarship
      if (err.response?.status === 409) {
        const existingAppId = err.response?.data?.data?.applicationId;
        if (existingAppId) {
          showToast('You already have an application for this scholarship. Redirecting to edit...', 'info');
          setTimeout(() => {
            navigate(`/applications/${existingAppId}/edit`);
          }, 1500);
        } else {
          showToast('You already have an active application for this scholarship', 'error');
          setTimeout(() => {
            navigate('/my-applications');
          }, 2000);
        }
        return;
      }
      showToast(err.response?.data?.message || err.message || 'Failed to submit application', 'error');
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

  // Check eligibility - skip in edit mode (app already exists)
  if (!isEditMode && matchResult && !matchResult.isEligible) {
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
            to={isEditMode ? '/my-applications' : `/scholarships/${resolvedScholarshipId || id}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEditMode ? 'Back to My Applications' : 'Back to Scholarship'}
          </Link>

          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <Award className="w-7 h-7 text-primary-600 flex-shrink-0" />
                <h1 className="text-2xl font-bold text-slate-900 truncate">
                  {isEditMode ? 'Edit Application' : scholarship.name}
                </h1>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-slate-600 text-sm">
                  {isEditMode ? `Editing application for ${scholarship.name}` : scholarship.sponsor}
                </p>
                <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(scholarship.type)}`}>
                  {scholarship.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>

            {/* Step Progress - right side */}
            <div className="flex-shrink-0 w-48">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500">Progress</span>
                <span className="text-sm font-bold text-primary-600">Step {currentStep}/{totalSteps}</span>
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
                            <p className="text-slate-900">{studentProfile.classification || studentProfile.yearLevel || 'Not provided'}</p>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">Contact Number</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900">{studentProfile.contactNumber || 'Not provided'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">Home Address</label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-900 text-sm">
                              {studentProfile.homeAddress?.fullAddress
                                || [
                                    studentProfile.homeAddress?.street || studentProfile.address?.street,
                                    studentProfile.homeAddress?.barangay || studentProfile.address?.barangay,
                                    studentProfile.homeAddress?.city || studentProfile.address?.city,
                                    studentProfile.homeAddress?.province || studentProfile.address?.province,
                                    studentProfile.homeAddress?.zipCode || studentProfile.address?.zipCode
                                  ].filter(Boolean).join(', ')
                                || 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Fields Section - For scholarship-specific requirements */}
                  {customFieldRequirements.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                          <Edit3 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Scholarship-Specific Requirements</h3>
                          <p className="text-sm text-slate-600">
                            This scholarship requires additional information from you
                          </p>
                        </div>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                        <div className="flex gap-3">
                          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-purple-900 font-semibold mb-1">Custom Requirements</p>
                            <p className="text-sm text-purple-700">
                              The scholarship administrator has requested the following information. 
                              Please fill them in to improve your eligibility.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {customFieldRequirements.map((field, index) => (
                          <div key={index} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-purple-300 transition-colors">
                            {/* Field Header */}
                            <div className="flex items-start justify-between mb-2">
                              <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </span>
                                {field.displayName}
                                {/* Custom fields are optional - no Required label shown */}
                              </label>
                            </div>
                            
                            {/* Description Box */}
                            {field.description ? (
                              <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-xs text-blue-700 flex items-start gap-1.5">
                                  <span className="text-blue-500 mt-0.5">ℹ️</span>
                                  {field.description}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 mb-2 italic">
                                Enter your {field.displayName.toLowerCase()} value below
                              </p>
                            )}
                            
                            {/* Input Field */}
                            {field.conditionType === 'boolean' ? (
                              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-purple-300 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={!!customFieldValues[field.fieldName]}
                                  onChange={(e) => setCustomFieldValues(prev => ({
                                    ...prev,
                                    [field.fieldName]: e.target.checked
                                  }))}
                                  className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-slate-700">Yes, I confirm this applies to me</span>
                              </label>
                            ) : field.conditionType === 'range' ? (
                              <div>
                                <input
                                  type="number"
                                  value={customFieldValues[field.fieldName] as number || ''}
                                  onChange={(e) => setCustomFieldValues(prev => ({
                                    ...prev,
                                    [field.fieldName]: parseFloat(e.target.value) || 0
                                  }))}
                                  placeholder={`Enter a number (e.g., 25)`}
                                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Enter a numeric value</p>
                              </div>
                            ) : (
                              <div>
                                <input
                                  type="text"
                                  value={customFieldValues[field.fieldName] as string || ''}
                                  onChange={(e) => setCustomFieldValues(prev => ({
                                    ...prev,
                                    [field.fieldName]: e.target.value
                                  }))}
                                  placeholder={`Enter your ${field.displayName.toLowerCase()}`}
                                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Enter text value</p>
                              </div>
                            )}
                          </div>
                        ))}
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
                              <div className="flex items-center flex-wrap gap-2">
                                <h3 className="text-sm font-medium text-slate-900">{doc.name}</h3>
                                {doc.required && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                    Required
                                  </span>
                                )}
                                {doc.allowedFileType && doc.allowedFileType !== 'any' && (
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    doc.allowedFileType === 'pdf' ? 'bg-red-50 text-red-600 border border-red-200' :
                                    doc.allowedFileType === 'image' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                    'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}>
                                    {doc.allowedFileType === 'pdf' ? '📄 PDF only' :
                                     doc.allowedFileType === 'image' ? '🖼️ Image only' :
                                     '📝 Text Input'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {doc.uploaded && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>

                        {/* For TEXT type documents, show a textarea instead of file upload */}
                        {doc.allowedFileType === 'text' ? (
                          <>
                            <textarea
                              value={doc.textContent || ''}
                              onChange={(e) => {
                                const newDocs = [...formData.documents];
                                newDocs[index] = {
                                  ...newDocs[index],
                                  textContent: e.target.value,
                                  uploaded: e.target.value.trim().length > 0
                                };
                                setFormData(prev => ({ ...prev, documents: newDocs }));
                              }}
                              rows={4}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                              placeholder={`Enter your ${doc.name} here...`}
                            />
                            {doc.textContent && doc.textContent.trim().length > 0 && (
                              <div className="mt-2 flex items-center justify-between text-sm">
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" />
                                  Text entered ({doc.textContent.length} characters)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newDocs = [...formData.documents];
                                    newDocs[index] = {
                                      ...newDocs[index],
                                      textContent: '',
                                      uploaded: false
                                    };
                                    setFormData(prev => ({ ...prev, documents: newDocs }));
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </>
                        ) : doc.existingDocId && !doc.file ? (
                          /* Existing server document (edit mode) */
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <File className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">{doc.existingFileName || doc.name}</p>
                                <p className="text-xs text-green-700">
                                  Previously uploaded
                                  {doc.existingFileSize ? ` - ${(doc.existingFileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove and re-upload"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : !doc.uploaded ? (
                          <label className="block">
                            <input
                              type="file"
                              accept={
                                doc.allowedFileType === 'pdf' ? '.pdf' :
                                doc.allowedFileType === 'image' ? '.jpg,.jpeg,.png,.gif,.webp' :
                                '.pdf,.jpg,.jpeg,.png'
                              }
                              onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600 font-medium">Click to upload</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {doc.allowedFileType === 'pdf' ? 'PDF only (max 5MB)' :
                                 doc.allowedFileType === 'image' ? 'JPG, PNG, GIF, WebP (max 5MB)' :
                                 'PDF, JPG, PNG (max 5MB)'}
                              </p>
                            </div>
                          </label>
                        ) : (
                          <div className="space-y-3">
                            {/* File Preview Box (Clickable) */}
                            {doc.file && doc.previewUrl && (
                              <div 
                                className="border border-green-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-400 transition-colors relative group"
                                onClick={() => {
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
                            
                            {/* File Info Card */}
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
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewDoc({
                                      name: doc.name,
                                      type: doc.file?.type || 'application/pdf',
                                      previewUrl: doc.previewUrl || ''
                                    });
                                    setPreviewModalOpen(true);
                                  }}
                                  className="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                                  title="Preview document"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
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
                          {isEditMode && existingApplication?.status !== 'draft' ? 'Updating...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {isEditMode && existingApplication?.status !== 'draft' ? 'Update Application' : 'Submit Application'}
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

export default ApplyScholarship;
