// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    // Basic user information
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: 'default-profile.png'
    },
    
    // User preferences
    preferredLanguage: {
        type: String,
        enum: ['english', 'sinhala','tamil'],
        default: 'english'
    },
    
    // Learning profile
    currentLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    
    // Progress tracking
    completedQuizzes: [{
        quiz: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz'
        },
        score: Number,
        completedAt: Date,
        attemptCount: {
            type: Number,
            default: 1
        }
    }],
    
    // Knowledge metrics for personalized learning
    knowledgeGaps: [{
        topic: String,
        confidenceScore: {
            type: Number,
            min: 0,
            max: 100
        },
        lastAssessed: Date
    }],
    
    // Learning history for AI recommendations
    learningHistory: [{
        category: String,
        timeSpent: Number, // in minutes
        lastAccessed: Date
    }],
    
    // User engagement metrics
    totalQuizzesTaken: {
        type: Number,
        default: 0
    },
    totalQuestionsAnswered: {
        type: Number,
        default: 0
    },
    correctAnswerRate: {
        type: Number,
        default: 0
    },
    
    // // Saved and favorited content
    // savedDocuments: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Document'
    // }],
    // favoritedQuizzes: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Quiz'
    // }],
    
    // Custom learning paths
    learningPaths: [{
        name: String,
        description: String,
        quizzes: [{
            type: Schema.Types.ObjectId,
            ref: 'Quiz'
        }],
        currentQuizIndex: {
            type: Number,
            default: 0
        },
        progress: {
            type: Number, // percentage
            default: 0
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // User roles and permissions
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    
    // Account status
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Session tracking
    lastLogin: Date,
    loginCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Methods
userSchema.methods.updateKnowledgeGap = function(topic, score) {
    const existingTopic = this.knowledgeGaps.find(gap => gap.topic === topic);
    
    if (existingTopic) {
        existingTopic.confidenceScore = score;
        existingTopic.lastAssessed = new Date();
    } else {
        this.knowledgeGaps.push({
            topic,
            confidenceScore: score,
            lastAssessed: new Date()
        });
    }
};

userSchema.methods.calculateOverallProgress = function() {
    if (this.completedQuizzes.length === 0) return 0;
    
    const totalScore = this.completedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0);
    return totalScore / this.completedQuizzes.length;
};

userSchema.methods.incrementLoginCount = function() {
    this.loginCount += 1;
    this.lastLogin = new Date();
};

// Virtual for full name (if needed later)
userSchema.virtual('fullName').get(function() {
    return `${this.name}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        
        // Hash the password along with the new salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);