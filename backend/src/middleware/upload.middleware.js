// =============================================================================
// ISKOlarship - File Upload Middleware
// Multer configuration for efficient file uploads
// =============================================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =============================================================================
// Storage Configuration
// =============================================================================

// Configure storage to organize files by user ID
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory
    const userId = req.user._id.toString();
    const uploadPath = path.join(__dirname, '../../uploads/documents', userId);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_') // Sanitize filename
      .substring(0, 50); // Limit length
    
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// =============================================================================
// File Filter (Validation)
// =============================================================================

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed.'), false);
  }
};

// =============================================================================
// Multer Configuration
// =============================================================================

// File size limits
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB max per file
  files: 10 // Maximum 10 files per request
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});

// =============================================================================
// Upload Middleware Configurations
// =============================================================================

// Single file upload
const uploadSingle = upload.single('document');

// Multiple files upload (for profile documents)
const uploadMultiple = upload.array('documents', 10);

// Application documents upload (same as profile documents)
const uploadApplicationDocuments = upload.array('documents', 10);

// Fields-based upload (different types)
const uploadFields = upload.fields([
  { name: 'studentId', maxCount: 1 },
  { name: 'grades', maxCount: 1 },
  { name: 'registration', maxCount: 1 },
  { name: 'enrollment', maxCount: 1 },
  { name: 'photoId', maxCount: 1 },
  { name: 'other', maxCount: 5 }
]);

// =============================================================================
// Error Handler Middleware
// =============================================================================

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB per file.',
        error: 'FILE_TOO_LARGE'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.',
        error: 'TOO_MANY_FILES'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field in file upload.',
        error: 'UNEXPECTED_FIELD'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
        error: 'UPLOAD_ERROR'
      });
    }
  } else if (err) {
    // Other errors (e.g., file type validation)
    return res.status(400).json({
      success: false,
      message: err.message || 'An error occurred during file upload',
      error: 'UPLOAD_ERROR'
    });
  }
  
  next();
};

// =============================================================================
// Utility Functions
// =============================================================================

// Delete a file
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../../uploads', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Delete all files for a user
const deleteUserFiles = (userId) => {
  try {
    const userPath = path.join(__dirname, '../../uploads/documents', userId);
    if (fs.existsSync(userPath)) {
      fs.rmSync(userPath, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting user files:', error);
    return false;
  }
};

// Get file info
const getFileInfo = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../../uploads', filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { exists: false };
  }
};

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadApplicationDocuments,
  uploadFields,
  handleUploadError,
  deleteFile,
  deleteUserFiles,
  getFileInfo
};
