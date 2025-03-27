const mongoose = require('mongoose');

// Reference the User model to link the User with the PDF document
const pdfSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  key: {
    type: String, // This stores the PDF URL or file path
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, // Referencing the User model
    ref: 'User',
    required: true, // Ensures each PDF document is linked to a User
  },
}, { timestamps: true });

// Create the model
const PdfModel = mongoose.model('PdfModel', pdfSchema);

module.exports = PdfModel;