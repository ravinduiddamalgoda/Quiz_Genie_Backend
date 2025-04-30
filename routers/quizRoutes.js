// routers/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.get('/', quizController.getQuizzes);
router.get('/:id', quizController.getQuizById);

// Protected routes (regular users)
router.post('/attempt', auth, quizController.recordQuizAttempt);
router.get('/user/attempts/:userId', auth, quizController.getUserAttempts);
router.get('/suggestions/:userId', auth, quizController.getQuizSuggestions); // New route for quiz suggestions

// Admin only routes
router.post('/', auth, adminAuth, quizController.createQuiz);
router.put('/:id', auth, adminAuth, quizController.updateQuiz);
router.delete('/:id', auth, adminAuth, quizController.deleteQuiz);
router.get('/statistics/:quizId', auth, adminAuth, quizController.getQuizStatistics);

module.exports = router;