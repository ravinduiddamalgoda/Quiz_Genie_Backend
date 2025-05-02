// controllers/quizGeneratorController.js
const mongoose = require('mongoose');
const PdfModel = require('../models/pdfModel');
const { Quiz, QuizAttempt } = require('../models/quiz');
const User = require('../models/userModel');
const { 
  performSimilaritySearch, 
  searchMultipleCollections 
} = require('../utils/embeddingUtils');
const { 
  generateMCQQuiz, 
  analyzeUserPerformance, 
  generatePersonalizedSuggestions 
} = require('../utils/quizGenerationUtils');

/**
 * Generate a quiz based on user prompt and PDF content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.generateQuiz = async (req, res) => {
  try {
    const { prompt,pdfIds, numQuestions = 10, language = 'english' } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!prompt) {
      return res.status(400).json({ status: 'error', message: 'Quiz prompt is required' });
    }

    if (!pdfIds || !Array.isArray(pdfIds) || pdfIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'At least one PDF ID is required' });
    }

    // 1. Retrieve PDF documents
    const pdfs = await PdfModel.find({ _id: { $in: pdfIds } });
    
    if (pdfs.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No valid PDFs found' });
    }
    
    // 2. Get vector collection names
    const collectionNames = pdfs
      .filter(pdf => pdf.vectorCollection)
      .map(pdf => pdf.vectorCollection);
    
    if (collectionNames.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'None of the selected PDFs have been indexed for search' 
      });
    }
    
    // // 3. Perform similarity search across all collections
    // const retrievedDocuments = await searchMultipleCollections(prompt, collectionNames, 15);
    
    // if (retrievedDocuments.length === 0) {
    //   return res.status(404).json({ 
    //     status: 'error', 
    //     message: 'No relevant content found for the given prompt' 
    //   });
    // }
    
    // 3. Generate quiz questions
    const quizQuestions = await generateMCQQuiz(
      prompt, 
      numQuestions, 
      language,
      userId
    );
    
    console.log('Generated quiz questions:', quizQuestions);
    // 5. Create quiz record in database
    const newQuiz = await Quiz.create({
      title: `Quiz on ${prompt}`,
      description: `Generated quiz on "${prompt}" from ${pdfs.length} PDFs`,
      language: quizQuestions[0]?.language || 'en',
      questions: quizQuestions.map(q => ({
        text: q.question,
        type: 'multiple-choice',
        options: Object.entries(q.options).map(([key, value]) => ({
          text: value,
          isCorrect: key === q.correct_answer
        })),
        difficultyLevel: q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 3 : 5,
        explanation: '',
        tags: pdfs.map(pdf => pdf.subject)
      })),
      // Set difficulty level based on average of questions
      difficultyLevel: Math.round(
        quizQuestions.reduce((sum, q) => {
          return sum + (q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 3 : 5);
        }, 0) / quizQuestions.length
      ) || 3,
      // Track which PDFs were used
      topics: [...new Set(pdfs.map(pdf => pdf.subject))],
      // Creator if authenticated
      creator: userId
    });
    
    // 6. Update PDFs with quiz count
    await Promise.all(
      pdfs.map(pdf => 
        PdfModel.findByIdAndUpdate(pdf._id, { $inc: { quizCount: 1 } })
      )
    );
    
    // 7. Return the generated quiz
    res.status(200).json({
      status: 'success',
      data: {
        quiz: {
          id: newQuiz._id,
          title: newQuiz.title,
          questions: quizQuestions.map((q, index) => ({
            id: index + 1,
            text: q.question,
            options: Object.values(q.options).map((option, i) => ({
              id: Object.keys(q.options)[i],
              text: option
            })),
            correctAnswer: q.correct_answer,
            difficulty: q.difficulty,
            language: q.language
          })),
          totalQuestions: quizQuestions.length
        }
      }
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'An error occurred while generating the quiz' 
    });
  }
};

/**
 * Submit a quiz attempt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.submitQuizAttempt = async (req, res) => {
  try {
    const { quizId, responses } = req.body;
    const userId = req.user.id; // Authentication required
    
    // 1. Retrieve the quiz
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    
    // 2. Calculate score and track incorrect topics
    let correctAnswers = 0;
    const incorrectTopics = new Set();
    const userResponses = [];
    
    quiz.questions.forEach((question, index) => {
      const userAnswer = responses[index];
      const correctOption = question.options.findIndex(opt => opt.isCorrect);
      const isCorrect = userAnswer === correctOption;
      
      userResponses.push({
        question: question._id,
        selectedOptions: [userAnswer.toString()],
        isCorrect
      });
      
      if (isCorrect) {
        correctAnswers++;
      } else {
        // Track topics from incorrect questions
        question.tags.forEach(tag => incorrectTopics.add(tag));
      }
    });
    
    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    
    // 3. Create quiz attempt record
    const attempt = await QuizAttempt.create({
      user: userId,
      quiz: quizId,
      responses: userResponses,
      score,
      timeTaken: req.body.timeTaken || null,
      incorrectTopics: Array.from(incorrectTopics),
      completedAt: new Date()
    });
    
    // 4. Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        totalQuizzesTaken: 1,
        totalQuestionsAnswered: quiz.questions.length
      },
      $push: {
        completedQuizzes: {
          quiz: quizId,
          score,
          completedAt: new Date(),
          attemptCount: 1
        }
      }
    });
    
    // 5. Return the results
    res.status(200).json({
      status: 'success',
      data: {
        attemptId: attempt._id,
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        incorrectTopics: Array.from(incorrectTopics),
        message: 'Quiz attempt recorded successfully'
      }
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'An error occurred while submitting quiz attempt' 
    });
  }
};

/**
 * Get personalized quiz recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getQuizRecommendations = async (req, res) => {
  try {
    const userId = req.user.id; // Authentication required
    
    // 1. Get user's quiz attempts
    const quizAttempts = await QuizAttempt.find({ user: userId })
      .sort({ completedAt: -1 })
      .limit(20)
      .populate('quiz', 'title topics');
    
    if (quizAttempts.length === 0) {
      // No previous attempts, provide general recommendations
      return res.status(200).json({
        status: 'success',
        data: {
          recommendations: {
            suggestedPrompts: ["General knowledge quiz"],
            reason: "Try our general knowledge quiz to get started",
            level: "beginner"
          }
        }
      });
    }
    
    // 2. Analyze user performance to identify weak areas
    const weakAreas = await analyzeUserPerformance(quizAttempts);
    
    // 3. Get all available PDF collections
    const pdfs = await PdfModel.find({ vectorCollection: { $exists: true, $ne: null } })
      .select('_id title subject vectorCollection');
    
    const collectionNames = pdfs
      .filter(pdf => pdf.vectorCollection)
      .map(pdf => pdf.vectorCollection);
    
    // 4. Generate personalized quiz suggestions
    const recommendations = await generatePersonalizedSuggestions(
      weakAreas,
      collectionNames
    );
    
    // 5. Determine current knowledge level based on recent performance
    const recentAttempts = quizAttempts.slice(0, 5); // Consider last 5 attempts
    const avgRecentScore = recentAttempts.reduce((sum, attempt) => 
      sum + attempt.score, 0) / recentAttempts.length;
    
    let level;
    if (avgRecentScore < 50) {
      level = "beginner";
    } else if (avgRecentScore < 70) {
      level = "intermediate";
    } else if (avgRecentScore < 85) {
      level = "advanced";
    } else {
      level = "expert";
    }
    
    // 6. Return recommendations
    res.status(200).json({
      status: 'success',
      data: {
        recommendations: {
          ...recommendations,
          level,
          weakAreas: weakAreas.slice(0, 5), // Return top 5 weak areas
          averageScore: avgRecentScore.toFixed(1)
        }
      }
    });
  } catch (error) {
    console.error('Error generating quiz recommendations:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'An error occurred while generating recommendations' 
    });
  }
};

// module.exports = {
//   generateQuiz,
//   submitQuizAttempt,
//   getQuizRecommendations
// };