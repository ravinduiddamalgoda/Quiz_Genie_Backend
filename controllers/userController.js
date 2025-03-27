// controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, preferredLanguage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // Will be hashed in the pre-save hook
      preferredLanguage: preferredLanguage || 'english'
    });

    // Save user to the database
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return user info and token (without password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update login statistics
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return user info and token (without password)
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        currentLevel: user.currentLevel
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('completedQuizzes.quiz', 'title description');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, preferredLanguage, profilePicture } = req.body;
    
    // Find user and update
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (profilePicture) user.profilePicture = profilePicture;
    
    await user.save();
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile', error: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword; // Will be hashed in pre-save hook
    await user.save();
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password', error: error.message });
  }
};

// Save quiz result
exports.saveQuizResult = async (req, res) => {
  try {
    const { quizId, score, correctAnswers, incorrectTopics } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if quiz exists in completed quizzes
    const existingQuizIndex = user.completedQuizzes.findIndex(
      quiz => quiz.quiz.toString() === quizId
    );
    
    if (existingQuizIndex !== -1) {
      // Update existing quiz result
      user.completedQuizzes[existingQuizIndex].score = score;
      user.completedQuizzes[existingQuizIndex].completedAt = new Date();
      user.completedQuizzes[existingQuizIndex].attemptCount += 1;
    } else {
      // Add new quiz result
      user.completedQuizzes.push({
        quiz: quizId,
        score,
        completedAt: new Date(),
        attemptCount: 1
      });
    }
    
    // Update user stats
    user.totalQuizzesTaken += 1;
    user.totalQuestionsAnswered += (correctAnswers + incorrectTopics.length);
    user.correctAnswerRate = (user.correctAnswerRate * (user.totalQuizzesTaken - 1) + score) / user.totalQuizzesTaken;
    
    // Update knowledge gaps
    incorrectTopics.forEach(topic => {
      user.updateKnowledgeGap(topic, Math.max(0, score - 20)); // Lower confidence for incorrect topics
    });
    
    await user.save();
    
    res.status(200).json({
      message: 'Quiz result saved successfully',
      currentLevel: user.currentLevel,
      totalQuizzesTaken: user.totalQuizzesTaken,
      correctAnswerRate: user.correctAnswerRate
    });
  } catch (error) {
    console.error('Save quiz result error:', error);
    res.status(500).json({ message: 'Server error while saving quiz result', error: error.message });
  }
};

// Get user learning statistics
exports.getLearningStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('totalQuizzesTaken totalQuestionsAnswered correctAnswerRate knowledgeGaps currentLevel')
      .populate('completedQuizzes.quiz', 'title difficultyLevel');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate additional statistics
    const quizzesByLevel = {};
    let totalScore = 0;
    
    user.completedQuizzes.forEach(quiz => {
      // Group quizzes by level
      const level = quiz.quiz.difficultyLevel || 1;
      if (!quizzesByLevel[level]) {
        quizzesByLevel[level] = {
          count: 0,
          totalScore: 0
        };
      }
      
      quizzesByLevel[level].count += 1;
      quizzesByLevel[level].totalScore += quiz.score;
      totalScore += quiz.score;
    });
    
    // Calculate average score per level
    Object.keys(quizzesByLevel).forEach(level => {
      quizzesByLevel[level].averageScore = 
        quizzesByLevel[level].totalScore / quizzesByLevel[level].count;
    });
    
    const stats = {
      totalQuizzesTaken: user.totalQuizzesTaken,
      totalQuestionsAnswered: user.totalQuestionsAnswered,
      correctAnswerRate: user.correctAnswerRate,
      currentLevel: user.currentLevel,
      overallAverageScore: user.completedQuizzes.length > 0 ? 
        totalScore / user.completedQuizzes.length : 0,
      performanceByLevel: quizzesByLevel,
      knowledgeGaps: user.knowledgeGaps
    };
    
    res.status(200).json({ stats });
  } catch (error) {
    console.error('Get learning stats error:', error);
    res.status(500).json({ message: 'Server error while getting learning stats', error: error.message });
  }
};

// Favorite a quiz
exports.toggleFavoriteQuiz = async (req, res) => {
  try {
    const { quizId } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if quiz is already favorited
    const quizIndex = user.favoritedQuizzes.indexOf(quizId);
    
    if (quizIndex !== -1) {
      // Remove from favorites
      user.favoritedQuizzes.splice(quizIndex, 1);
      await user.save();
      return res.status(200).json({ 
        message: 'Quiz removed from favorites',
        isFavorited: false
      });
    } else {
      // Add to favorites
      user.favoritedQuizzes.push(quizId);
      await user.save();
      return res.status(200).json({ 
        message: 'Quiz added to favorites',
        isFavorited: true
      });
    }
  } catch (error) {
    console.error('Toggle favorite quiz error:', error);
    res.status(500).json({ message: 'Server error while toggling favorite quiz', error: error.message });
  }
};

// Get favorited quizzes
exports.getFavoritedQuizzes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('favoritedQuizzes', 'title description difficultyLevel language createdAt');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ favoritedQuizzes: user.favoritedQuizzes });
  } catch (error) {
    console.error('Get favorited quizzes error:', error);
    res.status(500).json({ message: 'Server error while getting favorited quizzes', error: error.message });
  }
};