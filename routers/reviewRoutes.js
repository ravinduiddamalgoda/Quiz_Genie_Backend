const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
//const auth = require('../middleware/auth');

router.post('/', reviewController.createReview);
router.get('/', reviewController.getReviews);
router.get('/stats', reviewController.getReviewStats);
router.get('/:id', reviewController.getReview);

// router.patch('/:id/publish', auth.protect, auth.authorize('admin'), reviewController.publishReview);
// router.delete('/:id', auth.protect, auth.authorize('admin'), reviewController.deleteReview);

module.exports = router;
