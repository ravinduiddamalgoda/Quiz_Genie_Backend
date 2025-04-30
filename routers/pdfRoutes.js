// const express = require('express');
// const router = express.Router();
// const upload = require('../middleware/uploadMiddleware');  // Import the multer upload middleware
// const pdfController = require('../controllers/pdfController');

// // Route to create a new PDF with a file upload
// router.post('/create', upload.single('pdfFile'), pdfController.createPdf);

// module.exports = router;
const express = require('express');
const multer = require('multer');
const {
  uploadFile,
  getAllFiles,
  deleteFile,
  updateFile
} = require('../controllers/pdfController');

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + file.originalname),
});
const upload = multer({ storage });

// Routes
router.post('/upload', upload.single('selectedFile'), uploadFile);
router.get('/get-files', getAllFiles);
router.delete('/:id', deleteFile);
router.put('/update-file/:id', upload.single('selectedFile'), updateFile);

module.exports = router;
