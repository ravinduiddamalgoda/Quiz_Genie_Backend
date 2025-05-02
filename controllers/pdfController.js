const PdfModel = require('../models/pdfModel');
const fs = require('fs');
const path = require('path');
const { uploadPdfToS3, generatePresignedUrl,deletePdfFromS3 } = require('../utils/pdfUtils');
const { extractTextFromPDF, extractTextWithOCR, createAndStoreEmbeddings } = require('../utils/embeddingUtils');
/**
 * Upload a PDF file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const uploadFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
    }

    const { title, subject, description } = req.body;
    const userId = req.user ? req.user.id : null;  // If using authentication
    
    // // Upload to S3
    const uploadResult = await uploadPdfToS3(req.file);
    console.log(uploadResult);
    // // Save the file info to the database
    // const newPdf = await PdfModel.create({
    //   title,
    //   subject,
    //   description,
    //   key: uploadResult.key,
    //   size: uploadResult.size,
    //   filename: uploadResult.filename,
    //   user: userId
    // });
    const newPdf = new PdfModel({
      title,
      subject,
      description,
      key: uploadResult.key,
      size: uploadResult.size,
      filename: uploadResult.filename,
      user: userId
    });
    await newPdf.save();
    // // Save to database (mocked here)
    
  

    res.status(200).json({ 
      status: 'success', 
      message: 'PDF uploaded successfully',
      data: {
        _id: newPdf._id,
        title: newPdf.title,
        subject: newPdf.subject,
        description: newPdf.description,
        filename: newPdf.filename,
        size: newPdf.size,
        createdAt: newPdf.createdAt
      }
    });
    // res.status(200).json({
    //   status: 'success',
    //   message: 'PDF uploaded successfully'});
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Get all PDFs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAllFiles = async (req, res) => {
  try {
    const userId = req.query.userId; // Optional filter by user
    
    // Build query
    const query = {};
    if (userId) {
      query.user = userId;
    }
    
    // Get PDFs with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const [pdfs, total] = await Promise.all([
      PdfModel.find(query)
        .select('title subject description key filename size createdAt user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PdfModel.countDocuments(query)
    ]);
    
    res.status(200).json({
      status: 'success',
      results: pdfs.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: pdfs
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Get a PDF by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getFileById = async (req, res) => {
  try {
    const pdf = await PdfModel.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    
    res.status(200).json({
      status: 'success',
      data: pdf
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Generate download URL for a PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getDownloadUrl = async (req, res) => {
  try {
    const pdf = await PdfModel.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    
    // Generate presigned URL for S3 download
    const downloadUrl = await generatePresignedUrl(pdf.key);

    res.status(200).json({
      status: 'success',
      data: {
        downloadUrl
      }
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Delete a PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const deleteFile = async (req, res) => {
  try {
    const pdf = await PdfModel.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    
    // Check if user owns this PDF (if using auth)
    if (req.user && pdf.user && pdf.user.toString() !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized to delete this file' });
    }
    
    // Delete file from S3, not filesystem
    try {
      await deletePdfFromS3(pdf.key);  // delete from S3
      Console.log('File deleted from S3:', pdf.key);
    } catch (fileError) {
      console.error('Error deleting file from S3:', fileError);
      // Continue with database deletion even if file deletion fails
    }
    
    // Delete record from database
    await PdfModel.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      status: 'success',
      message: 'PDF deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Update a PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const updateFile = async (req, res) => {
  try {
    const { title, subject, description } = req.body;
    const pdf = await PdfModel.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }
    
    // Check if user owns this PDF (if using auth)
    if (req.user && pdf.user && pdf.user.toString() !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized to update this file' });
    }
    
    // Update metadata
    pdf.title = title || pdf.title;
    pdf.subject = subject || pdf.subject;
    pdf.description = description || pdf.description;
    
    // If new file is uploaded, replace the old one
    // if (req.file) {
    //   // Delete old file from S3
    //   try {
    //     await deletePdfFromS3(pdf.key);
    //   } catch (fileError) {
    //     console.error('Error deleting old file from S3:', fileError);
    //   }
      
    //   // Update with new file info
    //   pdf.key = req.file.filename;
    //   pdf.size = req.file.size;
    //   pdf.filename = req.file.originalname;
    // }
    
    // Save changes
    await pdf.save();
    
    res.status(200).json({
      status: 'success',
      message: 'PDF updated successfully',
      data: {
        _id: pdf._id,
        title: pdf.title,
        subject: pdf.subject,
        description: pdf.description,
        filename: pdf.filename,
        size: pdf.size,
        createdAt: pdf.createdAt,
        updatedAt: pdf.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Re-index a PDF (for future implementation with vector embeddings)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const reindexFile = async (req, res) => {
  try {
    const pdf = await PdfModel.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    // Extract text from the PDF using AWS Textract or OCR (if Textract fails)
    let textData;
    try {
      // Extract text using Textract
      textData = await extractTextFromPDF(process.env.AWS_S3_BUCKET_NAME, pdf.key);
      console.log(textData);
      // If no text is extracted, use OCR as fallback
      if (!textData.text) {
        console.log('No text extracted from Textract. Falling back to OCR...');
        textData.text = await extractTextWithOCR(pdf.key);  // Assuming you are storing the local file path in S3
      }
      // textData.text = await extractTextWithOCR( process.env.AWS_S3_BUCKET_NAME , pdf.key);
    } catch (error) {
      console.error('Error extracting text:', error);
      return res.status(500).json({ status: 'error', message: 'Error extracting text from PDF' });
    }

    // Create embeddings and store in PG Vector database
    const metadata = { documentId: pdf._id, filename: pdf.filename , userId: pdf.user._id, language: pdf.language };
    const collectionName = await createAndStoreEmbeddings(textData.text, metadata);

    // Update PDF metadata to reflect that it has been reindexed
    pdf.isIndexed = true;
    pdf.lastIndexed = new Date();
    pdf.vectorCollection = collectionName;  // Store the collection name for the vector store
    await pdf.save();

    res.status(200).json({
      status: 'success',
      message: 'PDF re-indexed successfully',
      data: {
        _id: pdf._id,
        title: pdf.title,
        isIndexed: pdf.isIndexed,
        lastIndexed: pdf.lastIndexed,
        vectorCollection: pdf.vectorCollection
      }
    });
  } catch (error) {
    console.error('Error re-indexing file:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  uploadFile,
  getAllFiles,
  getFileById,
  getDownloadUrl,
  deleteFile,
  updateFile,
  reindexFile
};
