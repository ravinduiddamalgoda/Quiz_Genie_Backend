// const express = require('express');
// const multer = require('multer');
// const {
//   uploadFile,
//   getAllFiles,
//   deleteFile,
//   updateFile
// } = require('../controllers/fileController');

// const router = express.Router();

// // Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads'),
//   filename: (req, file, cb) => cb(null, Date.now() + file.originalname),
// });
// const upload = multer({ storage });

// // Routes
// router.post('/upload', upload.single('selectedFile'), uploadFile);
// router.get('/', getAllFiles);
// router.delete('/:id', deleteFile);
// router.put('/:id', upload.single('selectedFile'), updateFile);

// module.exports = router;
