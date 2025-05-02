// models/pdfModel.js
const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'PDF title is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  key: {
    type: String, // S3 key for the PDF file
    required: [true, 'S3 key is required']
  },
  filename: {
    type: String, // Original filename
    required: [true, 'Original filename is required']
  },
  size: {
    type: Number, // File size in bytes
    required: [true, 'File size is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional since some systems might not require authentication
  },
  vectorCollection: {
    type: String, // Name of the vector collection in PG Vector
    default: null
  },
  language: {
    type: String, 
    default: 'english'
  },
  isIndexed: {
    type: Boolean,
    default: false
  },
  lastIndexed: {
    type: Date,
    default: null
  },
  totalPages: {
    type: Number,
    default: 0
  },
  topics: [{
    type: String,
    trim: true
  }],
  quizCount: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted file size
pdfSchema.virtual('formattedSize').get(function() {
  const bytes = this.size;
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
});

// Create a text index for search
pdfSchema.index(
  { title: 'text', subject: 'text', description: 'text' },
  { name: 'pdf_text_index' }
);

const PdfModel = mongoose.model('PdfModel', pdfSchema);

module.exports = PdfModel;