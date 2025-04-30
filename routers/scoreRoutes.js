const express = require('express');
const router = express.Router();
const scoreController = require('../controllers/scoreController');

// Route to submit answers and update score
router.post('/submitAnswers', scoreController.submitAnswers);


module.exports = router;