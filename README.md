# Quiz Genie - PDF Processing and Quiz Generator

An intelligent quiz generation system that processes PDFs, stores them in S3, creates vector embeddings for semantic search, and generates quizzes using OpenAI.

## Features

- PDF upload, storage in AWS S3, and management
- PDF text extraction and embedding generation
- Semantic search using PG Vector database
- Quiz generation from PDF content using OpenAI
- Support for multiple languages (English, Sinhala, Tamil)
- User performance tracking and analysis
- Personalized quiz recommendations based on weak areas
- Comprehensive quiz statistics and visualization

## Architecture

The system consists of several key components:

1. **PDF Management**: Upload, download, and manage PDFs with S3 storage
2. **Embedding Engine**: Generate embeddings for PDF text and store in PG Vector
3. **Quiz Generator**: Create multiple-choice quizzes from PDF content using OpenAI
4. **User Analytics**: Track quiz attempts, analyze performance, and identify weak areas

## Prerequisites

- Node.js (v14+)
- MongoDB
- PostgreSQL with pgvector extension
- AWS S3 bucket
- OpenAI API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quiz-genie.git
   cd quiz-genie
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment files:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Create required directories:
   ```bash
   mkdir -p tmp/uploads
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Set the following environment variables in your `.env` file:

- `PORT` - Server port (default: 3600)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token generation
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `POSTGRES_CONNECTION_STRING` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key

## API Endpoints

### PDF Management

- `POST /api/files/upload-file` - Upload a PDF file
- `GET /api/files/get-files` - Get all PDF files
- `GET /api/files/get-file/:id` - Get a specific PDF file
- `GET /api/files/download/:id` - Generate download URL
- `PUT /api/files/update-file/:id` - Update a PDF file
- `DELETE /api/files/delete-file/:id` - Delete a PDF file
- `POST /api/files/reindex/:id` - Re-index a PDF file

### Quiz Generation

- `POST /api/quiz-generator/generate` - Generate a quiz
- `POST /api/quiz-generator/submit` - Submit a quiz attempt
- `GET /api/quiz-generator/recommendations` - Get personalized recommendations
- `GET /api/quiz-generator/user-stats` - Get user quiz statistics
- `GET /api/quiz-generator/practice` - Get practice questions

## Usage Examples

### Uploading a PDF

```javascript
// Frontend example with axios
import axios from 'axios';

const uploadPDF = async (file, metadata) => {
  const formData = new FormData();
  formData.append('selectedFile', file);
  formData.append('title', metadata.title);
  formData.append('subject', metadata.subject);
  formData.append('description', metadata.description);
  
  try {
    const response = await axios.post('/api/files/upload-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

### Generating a Quiz

```javascript
// Frontend example with axios
import axios from 'axios';

const generateQuiz = async (prompt, pdfIds, numQuestions = 10, language = null) => {
  try {
    const response = await axios.post('/api/quiz-generator/generate', {
      prompt,
      pdfIds,
      numQuestions,
      language
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.data.quiz;
  } catch (error) {
    console.error('Quiz generation error:', error);
    throw error;
  }
};
```

### Submitting Quiz Answers

```javascript
// Frontend example with axios
import axios from 'axios';

const submitQuizAnswers = async (quizId, responses, timeTaken) => {
  try {
    const response = await axios.post('/api/quiz-generator/submit', {
      quizId,
      responses,
      timeTaken
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Quiz submission error:', error);
    throw error;
  }
};
```

## Database Schema

### PDF Model

```javascript
const pdfSchema = new mongoose.Schema({
  title: String,
  subject: String,
  description: String,
  key: String, // S3 key
  filename: String,
  size: Number,
  user: ObjectId,
  vectorCollection: String,
  language: String,
  isIndexed: Boolean,
  lastIndexed: Date,
  totalPages: Number,
  topics: [String],
  quizCount: Number
}, { timestamps: true });
```

### Quiz Models

```javascript
const QuestionSchema = new Schema({
  text: String,
  type: String,
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  difficultyLevel: Number,
  explanation: String,
  tags: [String]
});

const QuizSchema = new Schema({
  title: String,
  description: String,
  language: String,
  questions: [QuestionSchema],
  difficultyLevel: Number,
  topics: [String],
  creator: ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const QuizAttemptSchema = new Schema({
  user: ObjectId,
  quiz: ObjectId,
  startedAt: Date,
  completedAt: Date,
  score: Number,
  responses: [{
    question: ObjectId,
    selectedOptions: [String],
    isCorrect: Boolean
  }],
  timeTaken: Number,
  incorrectTopics: [String]
});
```

## Vector Database Setup

The system uses PostgreSQL with the pgvector extension for similarity search. Here's how to set it up:

1. Install pgvector in your PostgreSQL database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Create a table for storing embeddings:
   ```sql
   CREATE TABLE IF NOT EXISTS document_embeddings (
       id SERIAL PRIMARY KEY,
       content TEXT,
       metadata JSONB,
       embedding vector(1536)
   );
   ```

3. Create an index for faster similarity search:
   ```sql
   CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.