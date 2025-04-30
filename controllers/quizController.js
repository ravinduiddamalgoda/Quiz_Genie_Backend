// controllers/quizController.js
const { Quiz, QuizAttempt } = require('../models/quiz');

// Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      language,
      questions,
      difficultyLevel,
      timeLimit,
      passingScore,
      tags,
      prerequisites,
      category
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Quiz title is required' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Create new quiz
    const newQuiz = new Quiz({
      title,
      description,
      language: language || 'english',
      questions,
      difficultyLevel: difficultyLevel || 1,
      timeLimit,
      passingScore,
      tags,
      prerequisites,
      category
    });

    // Save quiz to database
    const savedQuiz = await newQuiz.save();

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz: savedQuiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ 
      message: 'Server error while creating quiz', 
      error: error.message 
    });
  }
};

// Get all quizzes with pagination and filtering
exports.getQuizzes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      language, 
      difficultyLevel,
      category,
      search,
      tags
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (language) filter.language = language;
    if (difficultyLevel) filter.difficultyLevel = difficultyLevel;
    if (category) filter.category = category;
    if (tags) {
      // Handle tags as comma-separated string
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }
    if (search) {
      // Search in title and description
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Count total matching documents
    const total = await Quiz.countDocuments(filter);

    // Fetch paginated results
    const quizzes = await Quiz.find(filter)
      .select('title description language difficultyLevel timeLimit tags category createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      quizzes,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching quizzes', 
      error: error.message 
    });
  }
};

// Get a single quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.status(200).json({ quiz });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching quiz', 
      error: error.message 
    });
  }
};

// Update a quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      language,
      questions,
      difficultyLevel,
      timeLimit,
      passingScore,
      tags,
      prerequisites,
      category
    } = req.body;

    // Find quiz first to check if it exists
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Update fields if provided
    if (title) quiz.title = title;
    if (description !== undefined) quiz.description = description;
    if (language) quiz.language = language;
    if (questions && Array.isArray(questions) && questions.length > 0) quiz.questions = questions;
    if (difficultyLevel) quiz.difficultyLevel = difficultyLevel;
    if (timeLimit !== undefined) quiz.timeLimit = timeLimit;
    if (passingScore !== undefined) quiz.passingScore = passingScore;
    if (tags !== undefined) quiz.tags = tags;
    if (prerequisites !== undefined) quiz.prerequisites = prerequisites;
    if (category !== undefined) quiz.category = category;

    // Save updated quiz
    const updatedQuiz = await quiz.save();

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      quiz: updatedQuiz
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ 
      message: 'Server error while updating quiz', 
      error: error.message 
    });
  }
};

// Delete a quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if there are attempts for this quiz (optional: you might want to prevent deletion if there are attempts)
    const attemptCount = await QuizAttempt.countDocuments({ quiz: id });
    
    if (attemptCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete quiz with ${attemptCount} existing attempts`,
        attemptCount
      });
    }

    // Delete the quiz
    await Quiz.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting quiz', 
      error: error.message 
    });
  }
};

// Record a quiz attempt
exports.recordQuizAttempt = async (req, res) => {
  try {
    const {
      quizId,
      userId,
      responses,
      score,
      timeTaken,
      incorrectTopics
    } = req.body;

    // Validate required fields
    if (!quizId || !userId) {
      return res.status(400).json({ message: 'Quiz ID and User ID are required' });
    }

    // Create new attempt
    const newAttempt = new QuizAttempt({
      quiz: quizId,
      user: userId,
      responses,
      score,
      timeTaken,
      incorrectTopics,
      completedAt: new Date()
    });

    // Save attempt
    const savedAttempt = await newAttempt.save();

    res.status(201).json({
      success: true,
      message: 'Quiz attempt recorded successfully',
      attempt: savedAttempt
    });
  } catch (error) {
    console.error('Record quiz attempt error:', error);
    res.status(500).json({ 
      message: 'Server error while recording quiz attempt', 
      error: error.message 
    });
  }
};

// Get quiz attempts for a user
exports.getUserAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    const attempts = await QuizAttempt.find({ user: userId })
      .populate('quiz', 'title difficultyLevel language')
      .sort({ completedAt: -1 });

    res.status(200).json({ attempts });
  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching user attempts', 
      error: error.message 
    });
  }
};

// Get quiz statistics (for admins or analytics)
exports.getQuizStatistics = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Ensure quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Get attempt statistics
    const attempts = await QuizAttempt.find({ quiz: quizId });
    
    if (attempts.length === 0) {
      return res.status(200).json({
        message: 'No attempts found for this quiz',
        attemptsCount: 0,
        avgScore: 0,
        avgTimeTaken: 0
      });
    }

    // Calculate statistics
    const totalAttempts = attempts.length;
    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    const totalTime = attempts.reduce((sum, attempt) => sum + (attempt.timeTaken || 0), 0);
    
    // Get common incorrect topics
    const allIncorrectTopics = attempts.flatMap(attempt => attempt.incorrectTopics || []);
    const topicCounts = {};
    
    allIncorrectTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
    
    // Sort topics by frequency
    const commonTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    res.status(200).json({
      attemptsCount: totalAttempts,
      avgScore: totalScore / totalAttempts,
      avgTimeTaken: totalTime / totalAttempts,
      commonIncorrectTopics: commonTopics
    });
  } catch (error) {
    console.error('Get quiz statistics error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching quiz statistics', 
      error: error.message 
    });
  }
};

// Get personalized quiz suggestions for users based on low performance areas
exports.getQuizSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { threshold = 70, limit = 5 } = req.query; // Default: suggest quizzes for scores below 70%, limit to 5 suggestions

    // Find user's attempt history and join with quiz details
    const userAttempts = await QuizAttempt.find({ user: userId })
      .populate('quiz', 'title tags category difficultyLevel language')
      .sort({ completedAt: -1 });

    if (userAttempts.length === 0) {
      return res.status(200).json({
        message: 'No quiz history found, suggesting beginner-level quizzes',
        suggestions: await Quiz.find({ difficultyLevel: 1 })
          .select('title description difficultyLevel language category tags')
          .limit(parseInt(limit))
      });
    }

    // 1. Identify weak areas (topics with low scores)
    const weakAreas = [];
    const completedQuizIds = new Set();
    const topicScores = {};
    
    userAttempts.forEach(attempt => {
      // Track completed quizzes to avoid suggesting them again
      if (attempt.quiz?._id) {
        completedQuizIds.add(attempt.quiz._id.toString());
      }
      
      // If score is below threshold, collect topics for improvement
      if (attempt.score < parseInt(threshold)) {
        // Add topics from the quiz tags if present
        if (attempt.quiz?.tags && Array.isArray(attempt.quiz.tags)) {
          attempt.quiz.tags.forEach(tag => {
            if (!topicScores[tag]) {
              topicScores[tag] = { totalScore: 0, count: 0 };
            }
            topicScores[tag].totalScore += attempt.score;
            topicScores[tag].count += 1;
          });
        }
        
        // Add incorrect topics if present
        if (attempt.incorrectTopics && Array.isArray(attempt.incorrectTopics)) {
          attempt.incorrectTopics.forEach(topic => {
            if (!topicScores[topic]) {
              topicScores[topic] = { totalScore: 0, count: 0 };
            }
            // Add with a lower score for explicitly incorrect topics
            topicScores[topic].totalScore += (attempt.score * 0.7); // Weight incorrect topics more heavily
            topicScores[topic].count += 1;
          });
        }
      }
    });
    
    // Calculate average score per topic and identify weak areas
    Object.entries(topicScores).forEach(([topic, data]) => {
      const avgScore = data.totalScore / data.count;
      if (avgScore < parseInt(threshold)) {
        weakAreas.push({
          topic,
          avgScore,
          priority: parseInt(threshold) - avgScore // Higher priority for lower scores
        });
      }
    });
    
    // Sort weak areas by priority (higher number = higher priority)
    weakAreas.sort((a, b) => b.priority - a.priority);
    
    // 2. Determine user's current knowledge level based on recent performance
    const recentAttempts = userAttempts.slice(0, 5); // Consider last 5 attempts
    const avgRecentScore = recentAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / 
                          (recentAttempts.length || 1);
    
    // Determine appropriate difficulty level based on average score
    let suggestedDifficultyLevel;
    if (avgRecentScore < 50) {
      suggestedDifficultyLevel = 1; // Beginner
    } else if (avgRecentScore < 70) {
      suggestedDifficultyLevel = 2; // Intermediate
    } else if (avgRecentScore < 85) {
      suggestedDifficultyLevel = 3; // Advanced
    } else {
      suggestedDifficultyLevel = 4; // Expert
    }
    
    // 3. Get user's preferred language
    const preferredLanguage = userAttempts[0]?.quiz?.language || 'english';
    
    // 4. Build search criteria for suggested quizzes
    const weakTopics = weakAreas.slice(0, 5).map(area => area.topic); // Focus on top 5 weak areas
    
    // Build the query to find suitable quizzes
    const query = {
      _id: { $nin: Array.from(completedQuizIds) }, // Exclude already completed quizzes
      language: preferredLanguage,
      $or: [
        { difficultyLevel: suggestedDifficultyLevel },
        { difficultyLevel: Math.max(1, suggestedDifficultyLevel - 1) } // Also include slightly easier quizzes
      ]
    };
    
    // Include weak topics in the query if they exist
    if (weakTopics.length > 0) {
      query.$or.push({ tags: { $in: weakTopics } });
      query.$or.push({ category: { $in: weakTopics } });
    }
    
    // 5. Fetch suggested quizzes
    const suggestedQuizzes = await Quiz.find(query)
      .select('title description difficultyLevel language category tags')
      .limit(parseInt(limit));
    
    // If we don't have enough quizzes based on weak areas, add some general recommendations
    if (suggestedQuizzes.length < parseInt(limit)) {
      const generalSuggestions = await Quiz.find({
        _id: { $nin: [...Array.from(completedQuizIds), ...suggestedQuizzes.map(q => q._id)] },
        language: preferredLanguage,
        difficultyLevel: suggestedDifficultyLevel
      })
        .select('title description difficultyLevel language category tags')
        .limit(parseInt(limit) - suggestedQuizzes.length);
      
      suggestedQuizzes.push(...generalSuggestions);
    }
    
    // 6. Return personalized suggestions with reasoning
    res.status(200).json({
      suggestions: suggestedQuizzes,
      weakAreas: weakAreas.slice(0, 5), // Only send top 5 weak areas
      currentLevel: {
        avgScore: avgRecentScore,
        suggestedDifficultyLevel
      },
      reasonForSuggestions: weakAreas.length > 0 
        ? `These quizzes are suggested to improve your performance in: ${weakTopics.join(', ')}`
        : 'These quizzes are suggested based on your current knowledge level'
    });
  } catch (error) {
    console.error('Get quiz suggestions error:', error);
    res.status(500).json({ 
      message: 'Server error while generating quiz suggestions', 
      error: error.message 
    });
  }
};