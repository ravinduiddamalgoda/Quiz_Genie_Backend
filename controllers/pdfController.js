/*const PdfModel = require('../models/pdfModel');
const path = require('path');

// Create a new PDF document with a file upload
exports.createPdf = async (req, res) => {
  const { title, subject, description } = req.body;
  const file = req.file;

  // Check if the file is present
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Generate the file URL or file path (store it in your file storage)
    const filePath = `/uploads/${file.filename}`;

    // Create a new PDF document based on the request body
    const newPdf = new PdfModel({
      title,
      subject,
      description,
      key: filePath,  // Store the file path in the `key` field
    });

    // Save the PDF document to the database
    const savedPdf = await newPdf.save();

    // Return the saved PDF as a response
    res.status(201).json({
      message: 'PDF created successfully!',
      pdf: savedPdf,
    });
  } catch (error) {
    console.error('Error creating PDF:', error);
    res.status(500).json({ message: 'Failed to create PDF.', error });
  }
};
*/


const PdfSchema = require('../models/pdfModel');

// Upload PDF file
const uploadFile = async (req, res) => {
  const { title, subject, description } = req.body;
  const filename = req.file?.filename;

  if (!filename) return res.status(400).json({ message: 'No file uploaded.' });

  try {
    const newPdf = await PdfSchema.create({ title, subject, description, key: filename });
    res.json({ status: 'ok', data: newPdf });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get all PDFs
const getAllFiles = async (req, res) => {
  try {
    const data = await PdfSchema.find();
    res.json({ status: 'ok', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete a PDF
const deleteFile = async (req, res) => {
  try {
    await PdfSchema.findByIdAndDelete(req.params.id);
    res.json({ status: 'ok', message: 'PDF deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update a PDF
const updateFile = async (req, res) => {
  const updateData = { ...req.body };
  if (req.file) updateData.key = req.file.filename;

  try {
    const updatedPdf = await PdfSchema.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedPdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    res.json({ status: 'ok', message: 'PDF updated', data: updatedPdf });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  uploadFile,
  getAllFiles,
  deleteFile,
  updateFile
};
