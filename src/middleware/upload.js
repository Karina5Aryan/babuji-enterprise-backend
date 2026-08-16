/**
 * src/middleware/upload.js
 *
 * Storage abstraction: set STORAGE_DRIVER=local (default) or STORAGE_DRIVER=s3
 * in .env. No other code needs to change when switching.
 *
 * Local:  files saved to  /uploads/products/<filename>
 * S3:     files uploaded to  s3://<AWS_S3_BUCKET>/products/<filename>
 *
 * multer field name: "images"  (array, max 5)
 */

const path    = require('path');
const multer  = require('multer');
const crypto  = require('crypto');
const fs      = require('fs');

const DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

// ─── helpers ──────────────────────────────────────────────────────────────────
const uniqueFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
};

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed'), false);
  }
};

// ─── LOCAL storage ────────────────────────────────────────────────────────────
function buildLocalUpload() {
  const uploadDir = path.join(__dirname, '../../uploads/products');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, uniqueFilename(file.originalname)),
  });

  const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

  /**
   * normaliseFiles — converts multer's req.files into a consistent
   * [{ url, key }] array regardless of storage driver.
   */
  const normaliseFiles = (req) => {
    if (!req.files || req.files.length === 0) return [];
    const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    return req.files.map((f) => ({
      url: `${base}/uploads/products/${f.filename}`,
      key: `products/${f.filename}`, // relative key — used to delete the file later
    }));
  };

  /**
   * deleteFile — removes a local file by its key.
   */
  const deleteFile = async (key) => {
    try {
      const fullPath = path.join(__dirname, '../../uploads', key);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (err) {
      console.error('[upload:local] deleteFile error:', err.message);
    }
  };

  return { upload, normaliseFiles, deleteFile };
}

// ─── S3 storage ───────────────────────────────────────────────────────────────
function buildS3Upload() {
  const { S3Client }    = require('@aws-sdk/client-s3');
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const multerS3        = require('multer-s3');

  const s3 = new S3Client({
    region:      process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const bucket = process.env.AWS_S3_BUCKET;

  const storage = multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => cb(null, `products/${uniqueFilename(file.originalname)}`),
  });

  const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

  const normaliseFiles = (req) => {
    if (!req.files || req.files.length === 0) return [];
    return req.files.map((f) => ({
      url: f.location,  // S3 public URL
      key: f.key,       // e.g. "products/filename.jpg"
    }));
  };

  const deleteFile = async (key) => {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (err) {
      console.error('[upload:s3] deleteFile error:', err.message);
    }
  };

  return { upload, normaliseFiles, deleteFile };
}

// ─── Export the correct driver ────────────────────────────────────────────────
const driver = DRIVER === 's3' ? buildS3Upload() : buildLocalUpload();

/**
 * uploadImages — multer middleware that accepts up to 5 images in the "images" field.
 * Use in routes: router.post('/', protect, admin, uploadImages, createProduct)
 */
const uploadImages = driver.upload.array('images', 5);

const normaliseFiles = driver.normaliseFiles;
const deleteFile     = driver.deleteFile;

module.exports = { uploadImages, normaliseFiles, deleteFile };
