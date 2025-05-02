// utils/pdfUtils.js
const fs = require('fs-extra');
const path = require('path');
const pdf = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
console.log('AWS_REGION:', REGION);
console.log('AWS_S3_BUCKET_NAME:', BUCKET);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY);

// Create a single S3 client instance
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Upload a PDF file to S3
 */
async function uploadPdfToS3(file) {
  // read and name
  const fileContent = await fs.readFile(file.path);
  const ext = path.extname(file.originalname);
  const key = `pdfs/${uuidv4()}${ext}`;

  // upload
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: 'application/pdf'
  });
  await s3Client.send(cmd);

  // cleanup local temp file
  await fs.unlink(file.path);

  return {
    key,
    // you can reconstruct the location if your bucket is public:
    location: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
    filename: file.originalname,
    size: file.size
  };
}

/**
 * Generate a presigned URL for downloading a PDF from S3
 */
async function generatePresignedUrl(key, expirySeconds = 3600) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  });
  return getSignedUrl(s3Client, cmd, { expiresIn: expirySeconds });
}

/**
 * Extract text content from a PDF file in S3
 */
async function extractTextFromPdf(s3Key) {
  // download
  const getCmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key
  });
  const { Body } = await s3Client.send(getCmd);

  // Body is a stream or Buffer
  const buffer = await streamToBuffer(Body);
  const data = await pdf(buffer);
  return data.text;
}

/**
 * Delete a PDF file from S3
 */
async function deletePdfFromS3(key) {
  const cmd = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key
  });
  await s3Client.send(cmd);
  return true;
}

/**
 * Helper: convert ReadableStream to Buffer
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = {
  uploadPdfToS3,
  generatePresignedUrl,
  extractTextFromPdf,
  deletePdfFromS3
};
