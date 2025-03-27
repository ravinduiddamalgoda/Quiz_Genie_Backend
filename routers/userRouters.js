// routers/userRouters.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (authentication required)
router.get('/profile', auth, userController.getCurrentUser);
router.put('/profile', auth, userController.updateProfile);
router.put('/change-password', auth, userController.changePassword);

// Quiz interaction routes
router.post('/quiz-result', auth, userController.saveQuizResult);
router.get('/learning-stats', auth, userController.getLearningStats);
router.post('/favorite-quiz', auth, userController.toggleFavoriteQuiz);
router.get('/favorited-quizzes', auth, userController.getFavoritedQuizzes);

module.exports = router;