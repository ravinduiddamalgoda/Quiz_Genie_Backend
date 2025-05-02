const { PGVectorStore } = require('@langchain/community/vectorstores/pgvector');
const { OpenAI } = require('openai');
const { detectLanguage } = require('./embeddingUtils');
const { performSimilaritySearch } = require('./embeddingUtils'); // Assuming you have this function

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Language-specific prompt templates
const LANGUAGE_INSTRUCTIONS = {
  "si": `Generate the question and all options in Sinhala language. Use Sinhala script and terminology appropriate for legal/constitutional context.`,
  "ta": `Generate the question and all options in Tamil language. Use Tamil script and terminology appropriate for legal/constitutional context.`,
  "en": "Generate the question and all options in English language."
};

/**
 * Create an MCQ quiz based on the retrieved context
 * @param {string} userPrompt - User's quiz topic or query
 * @param {Array<Object>} collectionNames - The collections of documents to search in
 * @param {number} numQuestions - Number of questions to generate
 * @param {string} targetLanguage - Force specific language (optional)
 * @returns {Promise<Array<Object>>} - Generated quiz questions
 */
const generateMCQQuiz = async (userPrompt, numQuestions = 10, targetLanguage = 'english', UserId) => {
  try {
    // First perform similarity search with userPrompt
    const similarDocuments = await performSimilaritySearch(userPrompt, numQuestions ,UserId );

    // if (!similarDocuments || similarDocuments.length === 0) {
    //   return { status: 'error', message: 'No relevant Information found for the quiz generation.' };
    // }

    // Determine language for question generation
    let language;
    if (targetLanguage) {
      language = targetLanguage;
    } else {
      let combinedText;
      if(!similarDocuments || similarDocuments.length === 0) {
      const contentTexts = similarDocuments.map(doc => doc.pageContent);
       combinedText = contentTexts.join(' ');
      }
      if (combinedText.length > 0) {
        language = detectLanguage(combinedText);
      } else {
        language = detectLanguage(userPrompt); // Fallback to detecting language from the prompt
      }
    }
    let combinedContext = userPrompt; // Fallback to user prompt if no documents found
    // Create combined context from retrieved documents
    if(!similarDocuments || similarDocuments.length === 0) {
       combinedContext = similarDocuments.map(doc => doc.pageContent).join('\n\n');
    }


    // Distribute questions among difficulty levels
    const easyCount = Math.floor(numQuestions / 3);
    const mediumCount = Math.floor(numQuestions / 3);
    const hardCount = numQuestions - easyCount - mediumCount;

    const difficulties = [
      ...Array(easyCount).fill('easy'),
      ...Array(mediumCount).fill('medium'),
      ...Array(hardCount).fill('hard')
    ];

    // Get language-specific instructions
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en;

    // Generate questions for each difficulty
    const generationPromises = difficulties.map(async (difficulty) => {
      const prompt = `
        Based on the following context, generate an MCQ question of ${difficulty} difficulty level.

        ${languageInstruction}

        CONTEXT:
        ${combinedContext}

        Generate a question with 4 answer options (A, B, C, D), and indicate the correct answer.
        The question should test understanding of specific details in the context.

        For ${difficulty} difficulty:
        - Easy: Basic factual questions that can be directly found in the text
        - Medium: Questions requiring understanding of concepts or indirect references
        - Hard: Questions requiring deeper analysis, comparing multiple sections, or understanding implications

        Format your response as a JSON object with the following structure (no explanation, just the JSON):
        {
          "question": "The question text",
          "options": {
            "A": "First option",
            "B": "Second option",
            "C": "Third option",
            "D": "Fourth option"
          },
          "correct_answer": "The letter of the correct option (A, B, C, or D)",
          "difficulty": "${difficulty}"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "system", content: "You are a helpful assistant that generates quiz questions." }, 
                  { role: "user", content: prompt }],
        temperature: 0.7,
      });

      const responseText = response.choices[0].message.content.trim();

      try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/({[\s\S]*})/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText;

        const questionData = JSON.parse(jsonString);

        // Add language info
        questionData.language = language;

        return questionData;
      } catch (parseError) {
        console.error('Error parsing question JSON:', parseError);
        // Try to fix malformed JSON using another API call
        return repairQuestionJson(responseText, difficulty, language);
      }
    });

    // Wait for all questions to be generated
    const questions = await Promise.all(generationPromises);

    // Filter out any null results (failed generation attempts)
    return questions.filter(q => q !== null);
  } catch (error) {
    console.error('Error generating MCQ quiz:', error);
    throw error;
  }
};






/**
 * Repair malformed JSON from quiz generation
 * @param {string} malformedJson - The broken JSON string
 * @param {string} difficulty - Question difficulty
 * @param {string} language - Question language
 * @returns {Promise<Object|null>} - Fixed question object or null
 */
const repairQuestionJson = async (malformedJson, difficulty, language) => {
  try {
    const prompt = `
      Fix this malformed JSON for a quiz question:
      
      ${malformedJson}
      
      The format should be:
      {
        "question": "The question text",
        "options": {
          "A": "First option",
          "B": "Second option",
          "C": "Third option",
          "D": "Fourth option"
        },
        "correct_answer": "The letter of the correct option (A, B, C, or D)",
        "difficulty": "${difficulty}"
      }
      
      Return ONLY the fixed JSON with no additional text or explanation.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "You are a helpful assistant that fixes JSON." }, 
                { role: "user", content: prompt }],
      temperature: 0.2,
    });
    
    const responseText = response.choices[0].message.content.trim();
    
    try {
      const questionData = JSON.parse(responseText);
      questionData.language = language;
      return questionData;
    } catch (parseError) {
      console.error('Failed to repair JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error repairing question JSON:', error);
    return null;
  }
};

/**
 * Analyze user's quiz performance to identify weak areas
 * @param {Array<Object>} quizAttempts - User's previous quiz attempts
 * @returns {Promise<Array<Object>>} - Array of weak areas with scores
 */
const analyzeUserPerformance = async (quizAttempts) => {
  try {
    // Track topics and their scores
    const topicScores = {};
    
    quizAttempts.forEach(attempt => {
      // Process incorrect answers
      if (attempt.incorrectTopics && Array.isArray(attempt.incorrectTopics)) {
        attempt.incorrectTopics.forEach(topic => {
          if (!topicScores[topic]) {
            topicScores[topic] = { totalScore: 0, count: 0 };
          }
          // Weight incorrect topics more heavily
          topicScores[topic].totalScore += (attempt.score * 0.7);
          topicScores[topic].count += 1;
        });
      }
      
      // Process all topics from the quiz
      if (attempt.quiz && attempt.quiz.topics && Array.isArray(attempt.quiz.topics)) {
        attempt.quiz.topics.forEach(topic => {
          if (!topicScores[topic]) {
            topicScores[topic] = { totalScore: 0, count: 0 };
          }
          topicScores[topic].totalScore += attempt.score;
          topicScores[topic].count += 1;
        });
      }
    });
    
    // Calculate average score per topic
    const weakAreas = [];
    const threshold = 70; // Score below which a topic is considered weak
    
    Object.entries(topicScores).forEach(([topic, data]) => {
      const avgScore = data.totalScore / data.count;
      if (avgScore < threshold) {
        weakAreas.push({
          topic,
          avgScore,
          priority: threshold - avgScore // Higher priority for lower scores
        });
      }
    });
    
    // Sort weak areas by priority (higher number = higher priority)
    weakAreas.sort((a, b) => b.priority - a.priority);
    
    return weakAreas;
  } catch (error) {
    console.error('Error analyzing user performance:', error);
    throw error;
  }
};

/**
 * Generate personalized quiz suggestions based on user's weak areas
 * @param {Array<Object>} weakAreas - User's weak areas
 * @param {Array<string>} collectionNames - Available PDF collections
 * @param {number} numQuestions - Number of questions to suggest
 * @returns {Promise<Object>} - Personalized quiz suggestions
 */
const generatePersonalizedSuggestions = async (weakAreas, collectionNames, numQuestions = 10) => {
  try {
    // Use OpenAI to generate personalized quiz prompts based on weak areas
    if (weakAreas.length === 0) {
      return {
        suggestedPrompts: ["General knowledge quiz"],
        reason: "No specific weak areas identified."
      };
    }
    
    // Extract top weak topics
    const weakTopics = weakAreas.slice(0, 5).map(area => area.topic);
    
    const prompt = `
      Based on the user's weak areas in these topics: ${weakTopics.join(', ')},
      generate ${Math.min(5, weakTopics.length + 1)} specific quiz prompts that would help them improve.
      
      Each prompt should be focused and specific, targeting one or more of these weak areas.
      
      Return your response as a JSON array of strings, with each string being a quiz prompt.
      Example format: ["Prompt 1", "Prompt 2", "Prompt 3"]
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "You are a helpful educational assistant." }, 
                { role: "user", content: prompt }],
      temperature: 0.7,
    });
    
    let suggestedPrompts = [];
    try {
      const jsonMatch = response.choices[0].message.content.match(/(\[[\s\S]*\])/);
      const jsonString = jsonMatch ? jsonMatch[0] : response.choices[0].message.content;
      suggestedPrompts = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing suggested prompts:', parseError);
      // Fallback to simple extraction
      suggestedPrompts = response.choices[0].message.content
        .split('\n')
        .filter(line => line.trim().startsWith('"') || line.trim().startsWith('- '))
        .map(line => line.replace(/^-\s*"|"$|^"/, '').trim())
        .filter(line => line.length > 0);
    }
    
    return {
      suggestedPrompts: suggestedPrompts.slice(0, 5),
      reason: `These prompts are suggested to help improve your understanding of: ${weakTopics.join(', ')}`
    };
  } catch (error) {
    console.error('Error generating personalized suggestions:', error);
    return {
      suggestedPrompts: ["General knowledge quiz"],
      reason: "Could not generate personalized suggestions."
    };
  }
};

module.exports = {
  generateMCQQuiz,
  analyzeUserPerformance,
  generatePersonalizedSuggestions
};