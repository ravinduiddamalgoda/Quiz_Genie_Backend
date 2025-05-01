const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');  // Import controller
const authenticate = require('../middleware/auth');  // Import authentication middleware
// Route to fetch leaderboard
router.get('/',authenticate, leaderboardController.getLeaderboard);

// Route to fetch leaderboard by battle ID
router.get('/:battleId', leaderboardController.getLeaderboardByBattleId);

module.exports = router;
