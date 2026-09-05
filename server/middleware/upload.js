const multer = require('multer');

// Store in memory instead of uploading directly to Cloudinary.
// We need the buffers for perceptual hashing before finalizing the upload.
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
