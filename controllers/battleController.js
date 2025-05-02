const Battle = require('../models/battle');
const { Quiz } = require('../models/quiz');

// Create a new battle
exports.createBattle = async (req, res) => {
  const { name, subject, type, userId } = req.body;

  try {
    const newBattle = await Battle.create({
      name,
      subject,
      type,
      admin: userId,
      participants: [userId]
    });

    res.status(201).json(newBattle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create battle' });
  }
};

// Join an existing battle
exports.joinBattle = async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;

  try {
    const battle = await Battle.findById(id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    if (!battle.participants.includes(userId)) {
      battle.participants.push(userId);
      await battle.save();
    }

    res.json({ message: 'Joined battle successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join battle' });
  }
};

// Get all battles related to a user
exports.getUserBattles = async (req, res) => {
  const { userId } = req.params;

  try {
    const battles = await Battle.find({
      $or: [
        { admin: userId },
        { participants: userId }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(battles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch battles for user' });
  }
};

// Get battle details by ID
exports.getBattleDetails = async (req, res) => {
  const { id } = req.params;  // Get the battle ID from the URL parameters

  try {
    // Find the battle by its ID
    const battle = await Battle.findById(id);

    if (!battle) {
      // If no battle is found, send a 404 error
      return res.status(404).json({ error: 'Battle not found' });
    }

    // If the battle is found, return it in the response
    res.status(200).json(battle);
  } catch (error) {
    // Catch any errors and return a 500 status with an error message
    res.status(500).json({ error: 'Failed to fetch battle details' });
  }
};



// Delete a battle by ID
exports.deleteBattle = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedBattle = await Battle.findByIdAndDelete(id);

    if (!deletedBattle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    res.json({ message: 'Battle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete battle' });
  }
};

// get all battles
exports.getAllBattles = async (req, res) => {
  try {
    const battles = await Battle.find().sort({ createdAt: -1 });
    res.status(200).json(battles);
  } catch (error) {
    console.error('Error fetching all battles:', error); // Log the error
    res.status(500).json({ error: 'Failed to fetch battles' });
  }
};

exports.updateQuizInBattle = async (req, res) => {
  const { id } = req.params; // Get the battle ID from the URL parameters
  const { quizId } = req.body; // Get the quiz ID from the request body
  console.log(quizId);
  try {
    // Find the battle by its ID
    const battle = await Battle.findById(id);

    if (!battle) {
      // If no battle is found, send a 404 error
      return res.status(404).json({ error: 'Battle not found' });
    }

    const quiz = await Quiz.findById(quizId); // Find the quiz by its ID
    if (!quiz) {
      // If no quiz is found, send a 404 error
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Update the quiz in the battle
    battle.quiz = quizId;
    await battle.save();

    // Return the updated battle in the response
    res.status(200).json(battle);
  } catch (error) {
    // Catch any errors and return a 500 status with an error message
    res.status(500).json({ error: 'Failed to update quiz in battle' });
  }
}



