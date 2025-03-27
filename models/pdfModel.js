const mongoose = require('mongoose');

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
  pdf: {
    type: String, //  PDF URL or path 
    required: true,
  },
});


const PdfModel = mongoose.model('PdfModel', pdfSchema);

module.exports = PdfModel;
