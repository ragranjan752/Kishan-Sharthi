// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Disease Detection File Upload Validator
//  Enforces MIME type whitelisting, file size caps & crypto random names
// ═══════════════════════════════════════════════════════════════════

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { AppError } = require('../../middleware/errorHandler');

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage engine with sanitized, unguessable filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const randomName = `crop_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, randomName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('अमान्य फाइल प्रकार। केवल JPEG, PNG एवं WebP छवियां अनुमत हैं।', 400, 'INVALID_FILE_TYPE'), false);
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum
  }
});

module.exports = {
  uploadMiddleware,
  UPLOAD_DIR
};
