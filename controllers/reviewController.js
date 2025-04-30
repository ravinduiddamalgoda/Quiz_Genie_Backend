const Review = require('../models/reviewModel');
const asyncHandler = require('express-async-handler');

exports.createReview = asyncHandler(async (req, res) => {
  const { rating, title, description, wouldRecommend, email } = req.body;

  if (!rating || !title || !description) {
    res.status(400);
    throw new Error('Please provide rating, title and description');
  }

  const review = await Review.create({
    rating,
    title,
    description,
    wouldRecommend,
    email: email || undefined
  });

  res.status(201).json({ success: true, data: review });
});

exports.getReviews = asyncHandler(async (req, res) => {
  const query = { published: true };

  if (req.query.rating) {
    query.rating = Number(req.query.rating);
  }

  if (req.query.wouldRecommend === 'true') {
    query.wouldRecommend = true;
  } else if (req.query.wouldRecommend === 'false') {
    query.wouldRecommend = false;
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const reviews = await Review.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Review.countDocuments(query);

  res.status(200).json({
    success: true,
    count: reviews.length,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    },
    data: reviews
  });
});

exports.getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  res.status(200).json({ success: true, data: review });
});

exports.publishReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  review.published = !review.published;
  await review.save();

  res.status(200).json({ success: true, data: review });
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  await review.remove();
  res.status(200).json({ success: true, data: {} });
});

exports.getReviewStats = asyncHandler(async (req, res) => {
  const stats = await Review.aggregate([
    { $match: { published: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const ratingStats = {
    total: 0,
    average: 0,
    counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };

  let sum = 0;
  let count = 0;

  stats.forEach(stat => {
    ratingStats.counts[stat._id] = stat.count;
    sum += stat._id * stat.count;
    count += stat.count;
  });

  ratingStats.total = count;
  ratingStats.average = count > 0 ? (sum / count).toFixed(1) : 0;

  const recommendStats = await Review.aggregate([
    { $match: { published: true, wouldRecommend: { $ne: null } } },
    {
      $group: {
        _id: '$wouldRecommend',
        count: { $sum: 1 }
      }
    }
  ]);

  const recommendations = {
    yes: 0,
    no: 0,
    total: 0,
    percentage: 0
  };

  recommendStats.forEach(stat => {
    if (stat._id === true) recommendations.yes = stat.count;
    else recommendations.no = stat.count;
  });

  recommendations.total = recommendations.yes + recommendations.no;
  recommendations.percentage = recommendations.total > 0
    ? Math.round((recommendations.yes / recommendations.total) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: { ratings: ratingStats, recommendations }
  });
});
