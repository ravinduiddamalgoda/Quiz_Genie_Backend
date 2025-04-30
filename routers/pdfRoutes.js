const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');  // Import the multer upload middleware
const pdfController = require('../controllers/pdfController');

// Route to create a new PDF with a file upload
router.post('/create', upload.single('pdfFile'), pdfController.createPdf);

module.exports = router;
