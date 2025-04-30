const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Score schema
const scoreSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',  // Link to User model
    required: true
  },
  battle: {
    type: Schema.Types.ObjectId,
    ref: 'Battle',  // Link to Battle model
    required: true
  },
  totalScore: {
    type: Number,
    default: 0
  },
  totalQuestionsAnswered: {
    type: Number,
    default: 0
  },
  correctAnswerRate: {
    type: Number,
    default: 0
  },
  rounds: [{
    round: {
      type: Number,
      required: true
    },
    roundScore: {
      type: Number,
      required: true
    },
    correctAnswers: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Method to update score after a round
scoreSchema.methods.updateScore = async function(correctAnswers, totalQuestions, round) {
  const roundScore = (correctAnswers / totalQuestions) * 10;

  // Add the round data to the rounds array
  this.rounds.push({
    round,
    roundScore,
    correctAnswers,
    totalQuestions
  });

  // Update total score, total questions answered, and correct answer rate
  this.totalScore += roundScore;
  this.totalQuestionsAnswered += totalQuestions;
  this.correctAnswerRate = (this.totalScore / (this.totalQuestionsAnswered * 10)) * 100;

  // Update last updated time
  this.lastUpdated = Date.now();

  // Save the updated score
  return this.save();
};

// Compile the model
const Score = mongoose.model('Score', scoreSchema);

module.exports = Score;
