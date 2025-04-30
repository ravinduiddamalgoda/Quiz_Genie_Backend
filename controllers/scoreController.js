const Score = require('../models/score');  // Import Score model
const Battle = require('../models/battle');  // Import Battle model

// Controller function to handle submitting answers and updating score
exports.submitAnswers = async (req, res) => {
  const { userId, correctAnswers, totalQuestions, round, battleId } = req.body; // battleId added

  try {
    // Find the battle to ensure that it's valid
    const battle = await Battle.findById(battleId);

    if (!battle) {
      return res.status(400).json({ message: 'Battle not found' });
    }

    // Check if the user is a participant of the battle
    if (!battle.participants.includes(userId)) {
      return res.status(403).json({ message: 'User is not a participant of this battle' });
    }

    // Check if the score record exists for the user in this specific battle
    let score = await Score.findOne({ user: userId, battle: battleId });

    if (!score) {
      // If no score record exists for this battle, create one
      score = new Score({
        user: userId,
        battle: battleId
      });
    }

    // Update the score using the method defined in the model
    await score.updateScore(correctAnswers, totalQuestions, round);

    // Send back the updated score details
    res.status(200).json({
      message: 'Answers submitted successfully and score updated!',
      totalScore: score.totalScore,
      correctAnswerRate: score.correctAnswerRate,
      totalQuestionsAnswered: score.totalQuestionsAnswered
    });
  } catch (error) {
    console.error('Error submitting answers or updating score:', error);
    res.status(500).json({ message: 'Error submitting answers or updating score' });
  }
};
