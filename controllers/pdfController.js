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