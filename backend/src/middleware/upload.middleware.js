// =============================================================================
// ISKOlarship - File Upload Middleware
// Multer + Cloudinary for persistent cloud-based file storage
// Files are uploaded to Cloudinary instead of local disk so they survive
// Railway container restarts, deploys, and scaling events.
// =============================================================================

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// =============================================================================
// Cloudinary Configuration
// =============================================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// =============================================================================
// Storage Configuration — Memory (files go to Cloudinary after multer parses)
// =============================================================================

const storage = multer.memoryStorage();

// =============================================================================
// File Filter (Validation)
// =============================================================================

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB max per file
  files: 10
};

const upload = multer({
  storage,
  fileFilter,
  limits
});

// =============================================================================
// Upload Middleware Configurations
// =============================================================================

const uploadSingle = upload.single('document');
const uploadMultiple = upload.array('documents', 10);
const uploadApplicationDocuments = upload.array('documents', 10);
const uploadFields = upload.fields([
  { name: 'studentId', maxCount: 1 },
  { name: 'grades', maxCount: 1 },
  { name: 'registration', maxCount: 1 },
  { name: 'enrollment', maxCount: 1 },
  { name: 'photoId', maxCount: 1 },
  { name: 'other', maxCount: 5 }
]);

// =============================================================================
// Cloudinary Upload Helper
// =============================================================================

/**
 * Upload a single file buffer to Cloudinary.
 * @param {Buffer} buffer - File contents
 * @param {object} options
 * @param {string} options.folder - Cloudinary folder (e.g. 'iskolaship/documents/<userId>')
 * @param {string} [options.publicId] - Optional custom public_id
 * @param {string} [options.resourceType] - 'image' | 'raw' | 'auto' (default 'auto')
 * @returns {Promise<{ url: string, publicId: string, bytes: number, format: string }>}
 */
const uploadToCloudinary = (buffer, { folder, publicId, resourceType = 'auto', originalFilename } = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        // Keep the original filename in the URL for readability
        use_filename: true,
        unique_filename: true,
        // Pass original filename so Cloudinary can use it
        ...(originalFilename && { filename: originalFilename }),
        // Ensure raw files (PDFs, docs) are accessible via URL
        access_mode: 'public'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format
        });
      }
    );

    // Pipe the buffer into the upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Determine the correct Cloudinary resource_type based on MIME type.
 * Images → 'image' (enables Cloudinary transformations & native preview)
 * PDFs, docs, etc. → 'raw' (stored as-is, accessible via direct URL)
 */
const getResourceType = (mimetype) => {
  if (mimetype && mimetype.startsWith('image/')) return 'image';
  return 'raw';
};

/**
 * Upload an array of multer file objects to Cloudinary.
 * Uploads in parallel for speed. Returns results in the same order.
 * @param {Array} files - req.files from multer (memoryStorage)
 * @param {string} userId - Owner's user ID (used as sub-folder)
 * @returns {Promise<Array<{ url: string, publicId: string, bytes: number, format: string }>}
 */
const uploadFilesToCloudinary = async (files, userId) => {
  const folder = `iskolaship/documents/${userId}`;

  const promises = files.map(file =>
    uploadToCloudinary(file.buffer, {
      folder,
      resourceType: getResourceType(file.mimetype),
      originalFilename: file.originalname
    })
  );

  return Promise.all(promises);
};

// =============================================================================
// Cloudinary Delete Helper
// =============================================================================

/**
 * Delete a resource from Cloudinary by public_id.
 * @param {string} publicId - Cloudinary public_id
 * @param {string} [resourceType='raw'] - 'image' | 'raw' | 'video'
 * @returns {Promise<boolean>}
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  if (!publicId) return false;
  try {
    // Try the specified resource type first, then fallback to others
    const typesToTry = [resourceType, 'image', 'raw'].filter(
      (v, i, a) => a.indexOf(v) === i // unique
    );
    for (const type of typesToTry) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: type
        });
        if (result.result === 'ok') return true;
      } catch {
        // Try next type
      }
    }
    return false;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

/**
 * Delete all Cloudinary resources in a user's folder.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const deleteUserFiles = async (userId) => {
  try {
    const prefix = `iskolaship/documents/${userId}`;
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'raw' });
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'image' });
    // Remove the now-empty folder
    await cloudinary.api.delete_folder(prefix).catch(() => {});
    return true;
  } catch (error) {
    console.error('Error deleting user files from Cloudinary:', error);
    return false;
  }
};

// =============================================================================
// Error Handler Middleware
// =============================================================================

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
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
    return res.status(400).json({
      success: false,
      message: err.message || 'An error occurred during file upload',
      error: 'UPLOAD_ERROR'
    });
  }
  next();
};

// =============================================================================
// Signed URL Helper
// =============================================================================

/**
 * Generate an authenticated download URL for a Cloudinary resource.
 * Uses the Cloudinary download API which bypasses CDN delivery restrictions
 * that block unsigned / signed raw-file access (401 errors).
 * The generated URL is valid for 1 hour.
 * @param {string} publicId - Cloudinary public_id (includes extension for raw)
 * @param {string} [mimeType] - MIME type to determine resource_type
 * @returns {string} Authenticated HTTPS download URL (valid 1 h)
 */
const getSignedUrl = (publicId, mimeType) => {
  if (!publicId) return null;
  const resourceType = (mimeType && mimeType.startsWith('image/')) ? 'image' : 'raw';
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: resourceType,
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  });
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
  uploadToCloudinary,
  uploadFilesToCloudinary,
  deleteFromCloudinary,
  deleteUserFiles,
  getSignedUrl,
  cloudinary
};
