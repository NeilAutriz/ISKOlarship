// =============================================================================
// ISKOlarship - Document Upload Utility
// Optimized file upload functions using FormData and proper file handling
// =============================================================================

import apiClient from './apiClient';

/**
 * Upload multiple documents to the server (optimized approach)
 * Uses FormData to send actual files instead of base64 encoding
 * Much faster and more efficient than base64
 */
export const uploadDocuments = async (
  documents: Array<{
    file: File;
    name: string;
    type: string;
  }>
): Promise<{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}> => {
  try {
    console.log('🚀 uploadDocuments() called with:', documents.length, 'documents');
    console.log('📋 Documents to upload:', documents.map(d => ({ name: d.name, type: d.type, fileName: d.file.name, fileSize: d.file.size })));
    
    // Create FormData to send files
    const formData = new FormData();
    
    // Append each file and its metadata
    documents.forEach((doc, index) => {
      console.log(`  Adding to FormData [${index}]:`, doc.name, doc.file.name);
      formData.append('documents', doc.file); // 'documents' matches multer field name
      formData.append('documentNames', doc.name);
      formData.append('documentTypes', doc.type);
    });

    console.log(`📤 Uploading ${documents.length} document(s) via FormData to /users/documents/upload...`);
    console.log('🔑 Current access token exists:', !!localStorage.getItem('accessToken'));

    // Send multipart/form-data request
    const response = await apiClient.post('/users/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // Track upload progress
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`📊 Upload progress: ${percentCompleted}%`);
        }
      }
    });

    console.log('✅ Upload response:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Document upload error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to upload documents',
      error: error.response?.data?.error || 'UPLOAD_FAILED'
    };
  }
};

/**
 * Get document URL for display/download
 * Returns API endpoint URL that serves the document
 */
export const getDocumentUrl = (documentId: string): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return `${apiUrl}/users/documents/${documentId}`;
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId: string): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const response = await apiClient.delete(`/users/documents/${documentId}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Document delete error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete document'
    };
  }
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File): {
  valid: boolean;
  error?: string;
} => {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 5MB'
    };
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed'
    };
  }

  return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
