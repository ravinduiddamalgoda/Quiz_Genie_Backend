const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Score schema
const scoreSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',  // Link to User model
    required: true
  },
  totalScore: {
    type: Number,
    default: 0  // Total cumulative score
  },
  totalQuestionsAnswered: {
    type: Number,
    default: 0  // Total number of questions the user has answered
  },
  correctAnswerRate: {
    type: Number,
    default: 0  // Correct answer rate percentage
  },
  rounds: [{
    round: {
      type: Number,  // Round number
      required: true
    },
    roundScore: {
      type: Number,  // Score for this round
      required: true
    },
    correctAnswers: {
      type: Number,  // Number of correct answers in this round
      required: true
    },
    totalQuestions: {
      type: Number,  // Total questions in this round (e.g., 10)
      required: true
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Method to update score for a user after completing a round
scoreSchema.methods.updateScore = async function(correctAnswers, totalQuestions, round) {
  const roundScore = (correctAnswers / totalQuestions) * 10;  // Maximum score per round is 10
  
  // Update rounds array
  this.rounds.push({
    round,
    roundScore,
    correctAnswers,
    totalQuestions
  });

  // Update total score, total questions answered, and correct answer rate
  this.totalScore += roundScore;
  this.totalQuestionsAnswered += totalQuestions;
  this.correctAnswerRate = (this.totalScore / (this.totalQuestionsAnswered * 10)) * 100; // Recalculate correct answer rate

  // Update last updated time
  this.lastUpdated = Date.now();

  // Save the updated score
  return this.save();
};

// Compile the model
const Score = mongoose.model('Score', scoreSchema);

module.exports = Score;
