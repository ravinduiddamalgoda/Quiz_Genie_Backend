const Review = require('../models/reviewModel');

exports.createReview = async (req, res) => {
  const { rating, title, description, wouldRecommend, email } = req.body;

  const review = await Review.create({
    rating,
    title,
    description,
    wouldRecommend,
    email
  });

  res.json({ data: review });
};

exports.getReviews = async (req, res) => {
  const query = { published: true };

  if (req.query.rating) {
    query.rating = Number(req.query.rating);
  }

  if (req.query.wouldRecommend === 'true') {
    query.wouldRecommend = true;
  } else if (req.query.wouldRecommend === 'false') {
    query.wouldRecommend = false;
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  const reviews = await Review.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Review.countDocuments(query);

  res.json({
    data: reviews,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
};

exports.getReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  res.json({ data: review });
};

exports.publishReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  review.published = !review.published;
  await review.save();
  res.json({ data: review });
};

exports.deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  await review.remove();
  res.json({ message: 'Deleted' });
};

exports.updateReview = async (req, res) => {
  const { rating, title, description, wouldRecommend, email } = req.body;
  const review = await Review.findById(req.params.id);

  review.rating = rating;
  review.title = title;
  review.description = description;

  const updatedReview = await review.save();
  res.json({ data: updatedReview });
};

exports.getReviewStats = async (req, res) => {
  const stats = await Review.aggregate([
    { $match: { published: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const ratingStats = { total: 0, average: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  let sum = 0, count = 0;

  stats.forEach(stat => {
    ratingStats.counts[stat._id] = stat.count;
    sum += stat._id * stat.count;
    count += stat.count;
  });

  ratingStats.total = count;
  ratingStats.average = count > 0 ? (sum / count).toFixed(1) : 0;

  const recommendStats = await Review.aggregate([
    { $match: { published: true, wouldRecommend: { $ne: null } } },
    { $group: { _id: '$wouldRecommend', count: { $sum: 1 } } }
  ]);

  const recommendations = { yes: 0, no: 0, total: 0, percentage: 0 };

  recommendStats.forEach(stat => {
    if (stat._id === true) recommendations.yes = stat.count;
    else recommendations.no = stat.count;
  });

  recommendations.total = recommendations.yes + recommendations.no;
  recommendations.percentage = recommendations.total > 0
    ? Math.round((recommendations.yes / recommendations.total) * 100)
    : 0;

  res.json({ data: { ratings: ratingStats, recommendations } });
};
