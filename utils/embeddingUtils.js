const { OpenAI } = require('openai');
const { PGVectorStore  } = require('@langchain/community/vectorstores/pgvector');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Document } = require('@langchain/core/documents');
const { Pool } = require('pg');
const crypto = require('crypto');
const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
const Tesseract = require('tesseract.js');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-poppler');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure Textract Client (AWS SDK v3)
const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Configure PG connection

const configVectorDB = {

    postgresConnectionOptions: {
      type: 'postgres',
      host: 'localhost',
      port: 5435,
      user: 'postgres',
      password: 'mysecretpassword',
      database: 'api',
    },
    tableName: 'indexData',
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'vector',
      contentColumnName: 'content',
      metadataColumnName: 'metadata',
    },
    distanceStrategy: 'cosine'
  };  

  const pgPool = new Pool(configVectorDB.postgresConnectionOptions);
/**
 * Extract text from PDF using AWS Textract
 * @param {string} bucketName - S3 bucket name
 * @param {string} objectKey - S3 object key
 * @returns {Promise<Object>}
 */
async function extractTextFromPDF(bucketName, objectKey) {
  const startCommand = new StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: bucketName, Name: objectKey } },
  });

  const startResponse = await textractClient.send(startCommand);
  const jobId = startResponse.JobId;

  if (!jobId) {
    throw new Error('Failed to start Textract job');
  }

  let jobStatus = 'IN_PROGRESS';
  let textData = {
    text: '',
    status: 'IN_PROGRESS',
    lineCount: 0,
    pageCount: 0,
    pageTexts: []
  };

  // Polling until job completes
  while (jobStatus === 'IN_PROGRESS') {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
    const getResponse = await textractClient.send(getCommand);
    jobStatus = getResponse.JobStatus;
    textData.status = jobStatus;
  }

  if (jobStatus !== 'SUCCEEDED') {
    console.error('Textract job failed:', jobStatus);
    return textData;
  }

  // Collect text blocks
  let blocks = [];
  let nextToken;

  do {
    const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId, NextToken: nextToken });
    const getResponse = await textractClient.send(getCommand);
    if (getResponse.Blocks) {
      blocks = blocks.concat(getResponse.Blocks);
    }
    nextToken = getResponse.NextToken;
  } while (nextToken);

  let fullText = '';
  let lineCount = 0;
  let pageCount = 0;
  let currentPage = 0;

  blocks.forEach((block) => {
    if (block.BlockType === 'PAGE') {
      currentPage++;
      pageCount++;
      textData.pageTexts.push({ pageNumber: currentPage, text: '' });
    } else if (block.BlockType === 'LINE' && block.Text) {
      fullText += block.Text + '\n';
      lineCount++;
      textData.pageTexts[currentPage - 1].text += block.Text + '\n';
    }
  });

  textData.text = fullText;
  textData.lineCount = lineCount;
  textData.pageCount = pageCount;

  return textData;
}

/**
 * Fetch the PDF from S3 and convert it to images
 * @param {string} bucketName - S3 bucket name
 * @param {string} objectKey - S3 object key (file path)
 * @returns {Promise<string[]>} - List of image file paths
 */
async function convertPdfToImages(bucketName, objectKey) {
  // Get the PDF from S3
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  const data = await s3Client.send(command);

  if (!data.Body) {
    throw new Error('Failed to retrieve file from S3');
  }

  // Save the PDF to a temporary file
  const tempPdfPath = path.join(__dirname, 'temp.pdf');
  const fileStream = fs.createWriteStream(tempPdfPath);
  data.Body.pipe(fileStream);

  // Wait for the PDF file to be saved locally
  await new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  // Convert the PDF to images using pdf-poppler
  const outputDir = path.join(__dirname, 'pdf_images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const options = {
    format: 'png',
    out_dir: outputDir,
    page: null, // Convert all pages
  };

  await pdf.convert(tempPdfPath, options);

  // Delete the temporary PDF file
  fs.unlinkSync(tempPdfPath);

  // Get the list of generated images
  const imagePaths = fs.readdirSync(outputDir).map(file => path.join(outputDir, file));

  return imagePaths;
}


/**
 * Fetch the PDF from S3 and extract text using OCR
 * @param {string} bucketName - S3 bucket name
 * @param {string} objectKey - S3 object key (file path)
 * @returns {Promise<string>} - Extracted text from the PDF using OCR
 */
async function extractTextWithOCR(bucketName, objectKey) {
  try {
    // Convert the PDF to images
    const imagePaths = await convertPdfToImages(bucketName, objectKey);

    // Perform OCR on each image and accumulate the result
    let extractedText = '';
    for (const imagePath of imagePaths) {
      const text = await new Promise((resolve, reject) => {
        Tesseract.recognize(imagePath, 'eng+sin+tam', { logger: (m) => console.log(m) })
          .then(({ data: { text } }) => {
            resolve(text);
          })
          .catch(reject);
      });

      extractedText += text + '\n\n';
    }

    // Optionally, delete the image files after processing
    imagePaths.forEach(imagePath => fs.unlinkSync(imagePath));

    return extractedText;
  } catch (error) {
    console.error('Error extracting text with OCR from S3:', error);
    throw error;
  }
}

/**
 * Split text into chunks for embedding
 * @param {string} text - Text content to split
 * @param {number} chunkSize - Size of each chunk
 * @param {number} overlap - Overlap between chunks
 * @returns {Promise<Array<Document>>} - Array of document chunks
 */
const splitTextIntoChunks = async (text, chunkSize = 500, overlap = 50) => {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: overlap
    });
    
    return await splitter.createDocuments([text]);
  } catch (error) {
    console.error('Error splitting text into chunks:', error);
    throw error;
  }
};

/**
 * Create embeddings and store in PG Vector database
 * @param {string} text - Text content to embed
 * @param {Object} metadata - Additional metadata for the document
 * @returns {Promise<string>} - Collection ID
 */
const createAndStoreEmbeddings = async (text, metadata) => {
    try {
      // Detect language
      const language = detectLanguage(text);
      
      // Split text into chunks
      const documents = await splitTextIntoChunks(text);
      
      // Add metadata to each document
      const documentsWithMetadata = documents.map(doc => {
        return new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...metadata,
            language,
            chunkHash: crypto.createHash('md5').update(doc.pageContent).digest('hex')
          }
        });
      });
      
      // Initialize OpenAI embeddings
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-ada-002"
      });
      
      // Generate collection name based on document metadata
      const collectionName = `pdf_${metadata.documentId}_${Date.now()}`;
      
      // First check if the PostgreSQL connection works
    //   try {
    //     const testClient = await pgPool.connect();
    //     console.log('Successfully connected to PostgreSQL.');
        
    //     // Check if pgvector extension is installed
    //     const extensionRes = await testClient.query(
    //       "SELECT * FROM pg_extension WHERE extname = 'vector'"
    //     );
        
    //     if (extensionRes.rows.length === 0) {
    //       console.log('Installing pgvector extension...');
    //       await testClient.query('CREATE EXTENSION IF NOT EXISTS vector');
    //     }
        
    //     testClient.release();
    //   } catch (connectionError) {
    //     console.error('PostgreSQL connection test failed:', connectionError);
    //     throw new Error('Could not connect to PostgreSQL database: ' + connectionError.message);
    //   }
      
      // Store documents in vector database using direct pool
      await PGVectorStore.fromDocuments(
        documentsWithMetadata,
        embeddings,
        configVectorDB
      );
      
      console.log(`Successfully created embeddings in collection: ${collectionName}`);
      return collectionName;
    } catch (error) {
      console.error('Error creating and storing embeddings:', error);
      
      // Enhanced error reporting
      if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused. Make sure PostgreSQL is running on localhost:5435');
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('Table does not exist. Check if pgvector extension is installed.');
      }
      
      throw error;
    }
  }

  /**
 * Perform similarity search and filter by metadata
 * @param {string} query - Search query
 * @param {Array<string>} collectionNames - Names of collections to search
 * @param {number} k - Number of results to return
 * @returns {Promise<Array<Object>>} - Search results
 */
  const performSimilaritySearch = async (query, k = 500, userId) => {
    try {
      // Initialize OpenAI embeddings for the query
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-ada-002"
      });
  
      // Use PGVectorStore with a new index
      const vectorStore = new PGVectorStore(embeddings, {
        postgresConnectionOptions: {
          host: 'localhost',
          port: 5435,
          user: 'postgres',
          password: 'mysecretpassword',
          database: 'api',
        },
        tableName: 'indexData', 
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'vector',
          contentColumnName: 'content',
          metadataColumnName: 'metadata',
        }
      });
  
      // Perform similarity search
      const results = await vectorStore.similaritySearch(query, k);
      console.log('Similarity search results:', results);
      // Filter results based on metadata (e.g., userId)
      const filteredResults = results.filter(result => result.metadata.userId === userId);
  
      return filteredResults;
    } catch (error) {
      console.error('Error performing similarity search:', error);
      throw error;
    }
  };
  
  

/**
 * Detect the language of text content
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language code ('en', 'si', 'ta')
 */
const detectLanguage = (text) => {
  const sample = text.substring(0, 1000);
  let sinhalaCount = 0;
  let tamilCount = 0;
  let englishCount = 0;

  for (const char of sample) {
    const code = char.charCodeAt(0);
    // Sinhala Unicode range
    if (code >= 0x0D80 && code <= 0x0DFF) {
      sinhalaCount++;
    }
    // Tamil Unicode range
    else if (code >= 0x0B80 && code <= 0x0BFF) {
      tamilCount++;
    }
    // Basic Latin (English)
    else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      englishCount++;
    }
  }

  if (sinhalaCount > tamilCount && sinhalaCount > englishCount) {
    return 'si';
  } else if (tamilCount > sinhalaCount && tamilCount > englishCount) {
    return 'ta';
  } else {
    return 'en';
  }
};

module.exports = {
  splitTextIntoChunks,
  detectLanguage,
  createAndStoreEmbeddings,
  extractTextFromPDF,
  extractTextWithOCR,
  performSimilaritySearch
};
