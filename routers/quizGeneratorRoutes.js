// routers/quizGeneratorRoutes.js
const express = require('express');
const router = express.Router();
const quizGeneratorController = require('../controllers/quizGeneratorController');
const auth = require('../middleware/auth');

// Protected routes (authentication required)
router.post('/generate', auth, quizGeneratorController.generateQuiz);
router.post('/submit', auth, quizGeneratorController.submitQuizAttempt);
router.get('/recommendations', auth, quizGeneratorController.getQuizRecommendations);
// router.get('/user-stats', auth, quizGeneratorController.getUserQuizStats);
// router.get('/practice', auth, quizGeneratorController.getQuestionsForPractice);

module.exports = router;