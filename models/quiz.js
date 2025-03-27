// models/quiz.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Option Schema - for multiple choice questions
const OptionSchema = new Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false
  }
});

// Question Schema
const QuestionSchema = new Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'fill-in-blank'],
    default: 'multiple-choice'
  },
  options: [OptionSchema],
  correctAnswer: {
    type: String,
    trim: true
    // Required only for short-answer and fill-in-blank questions
  },
  difficultyLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1
  },
  explanation: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Store the section/chapter of the source material this question relates to
  sourceReference: {
    type: String,
    trim: true
  }
});

// Quiz Schema
const QuizSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    required: true,
    enum: ['english', 'sinhala'],
    default: 'english'
  },
  questions: [QuestionSchema],
  // The PDF or document this quiz was generated from
//   sourceDocument: {
//     type: Schema.Types.ObjectId,
//     ref: 'Document'
//   },
  difficultyLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1
  },
  timeLimit: {
    type: Number, // Time limit in minutes
    default: 30
  },
  passingScore: {
    type: Number, // Percentage required to pass
    min: 0,
    max: 100,
    default: 70
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // For adaptive learning
  prerequisites: [{
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    minScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    }
  }],
  // For organizing quizzes into learning paths
  category: {
    type: String,
    trim: true
  }
});

// Pre-save middleware to update the 'updatedAt' field
QuizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Document Schema - for source PDFs
// const DocumentSchema = new Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   description: {
//     type: String,
//     trim: true
//   },
//   fileName: {
//     type: String,
//     required: true
//   },
//   fileType: {
//     type: String,
//     required: true,
//     enum: ['pdf', 'doc', 'docx', 'txt'],
//     default: 'pdf'
//   },
//   language: {
//     type: String,
//     required: true,
//     enum: ['english', 'sinhala'],
//     default: 'english'
//   },
//   filePath: {
//     type: String,
//     required: true
//   },
//   uploadedAt: {
//     type: Date,
//     default: Date.now
//   },
//   // For categorizing documents
//   tags: [{
//     type: String,
//     trim: true
//   }],
//   // The user who uploaded the document
//   uploadedBy: {
//     type: Schema.Types.ObjectId,
//     ref: 'User'
//   }
// });

// User attempt schema - to track user performance
const QuizAttemptSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  // Track responses to individual questions
  responses: [{
    question: {
      type: Schema.Types.ObjectId
      // This is the ID of the question in the quiz
    },
    selectedOptions: [{
      type: String
      // For multiple choice questions
    }],
    textAnswer: {
      type: String,
      trim: true
      // For short answer questions
    },
    isCorrect: {
      type: Boolean
    }
  }],
  // For adaptive learning analysis
  timeTaken: {
    type: Number // Time taken in seconds
  },
  // Track areas where the user struggled
  incorrectTopics: [{
    type: String,
    trim: true
  }]
});

// Quiz Models
const Quiz = mongoose.model('Quiz', QuizSchema);
// const Document = mongoose.model('Document', DocumentSchema);
const QuizAttempt = mongoose.model('QuizAttempt', QuizAttemptSchema);

module.exports = {
  Quiz,
//   Document,
  QuizAttempt
};