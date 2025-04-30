const Battle = require('../models/battle');

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



