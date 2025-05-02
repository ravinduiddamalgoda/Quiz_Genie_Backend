// routers/pdfRoutes.js
const express = require('express');
const multer = require('multer');
const pdfController = require('../controllers/pdfController');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'tmp/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Filter to ensure only PDFs are uploaded
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  }
});

// Create directory for uploads if it doesn't exist
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, '../tmp/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Public routes
router.get('/get-files', pdfController.getAllFiles);
router.get('/get-file/:id', pdfController.getFileById);
router.get('/download/:id', pdfController.getDownloadUrl);

// Protected routes (authentication required)
router.post('/upload-file', auth, upload.single('selectedFile'), pdfController.uploadFile);
router.put('/update-file/:id', auth, upload.single('selectedFile'), pdfController.updateFile);
router.delete('/delete-file/:id', auth, pdfController.deleteFile);
router.post('/reindex/:id', auth, pdfController.reindexFile);

module.exports = router;