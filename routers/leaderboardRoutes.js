const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');  // Import controller
const authenticate = require('../middleware/auth');  // Import authentication middleware
// Route to fetch leaderboard
router.get('/leaderboard',authenticate, leaderboardController.getLeaderboard);

module.exports = router;
