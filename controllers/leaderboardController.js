const Score = require('../models/score');  // Import Score model
const User = require('../models/userModel');  // Import User model

// Controller function to fetch top 10 users and calculate user's rank
exports.getLeaderboard = async (req, res) => {
  try {

    // Log the user object to check if it's correctly populated
    console.log('Authenticated User:', req.user);

    // Check if req.user is populated correctly
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User is not authenticated' });
    }
    // Fetch the top 10 users by sorting scores in descending order
    const leaderboard = await Score.find()
      .sort({ totalScore: -1 })  // Sort by total score in descending order
      .limit(10)
      .populate({
        path: 'user',  // Populate the 'user' field
        select: 'name totalScore',  // Select only the 'name' and 'totalScore' fields
        model: 'User'  // Ensure we're populating the User model
      });

    // Get user rank for the authenticated user (assuming user ID is passed in the request)
    const userId = req.user._id;  // Assuming you have a user object in req.user (from authentication middleware)
    const userRank = await getUserRank(userId);

    res.status(200).json({
      leaderboard,
      userRank,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);  // Log the error for debugging
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

// Helper function to calculate rank for a specific user
async function getUserRank(userId) {
  const userScore = await Score.findOne({ user: userId }).select('totalScore');
  if (!userScore) return null;

  const allScores = await Score.find().sort({ totalScore: -1 });  // Fetch all scores sorted by totalScore
  const rank = allScores.findIndex(score => score.user.toString() === userId.toString()) + 1;

  return rank > 10 ? rank : null;  // Only return rank if outside top 10
}
