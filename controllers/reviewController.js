const Review = require('../models/reviewModel');

exports.createReview = async (req, res) => {
  try {
    const { rating, title, description, wouldRecommend, email } = req.body;

    const review = await Review.create({
      rating,
      title,
      description,
      wouldRecommend,
      email
    });

    res.json({ data: review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review', details: err.message });
  }
};

exports.getReviews = async (req, res) => {
    try {
      const reviews = await Review.find().sort({ createdAt: -1 }); // Fetch all reviews
      res.json({ data: reviews });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get reviews', details: err.message });
    }
  };
  

exports.getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ data: review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get review', details: err.message });
  }
};

exports.publishReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.published = !review.published;
    await review.save();
    res.json({ data: review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update publish status', details: err.message });
  }
};

exports.deleteReview = async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
  
      await Review.findByIdAndDelete(req.params.id); // more reliable deletion
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete review', details: err.message });
    }
  };
  

exports.updateReview = async (req, res) => {
  try {
    const { rating, title, description } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.rating = rating;
    review.title = title;
    review.description = description;
    // review.wouldRecommend = wouldRecommend;
    // review.email = email;  

    const updatedReview = await review.save();
    res.json({ data: updatedReview });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review', details: err.message });
  }
};
