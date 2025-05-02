// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Route imports
const fileUploadRoutes = require('./routers/pdfRoutes');
const battleRoutes = require('./routers/battleRoutes');
const userRoutes = require('./routers/userRouters');
const scoreRoutes = require('./routers/scoreRoutes');
const reviewRoutes = require('./routers/reviewRoutes');
const quizRoutes = require('./routers/quizRoutes');
const leaderboardRoutes = require('./routers/leaderboardRoutes');
const quizGeneratorRoutes = require('./routers/quizGeneratorRoutes')


const app = express();

// CORS configuration
app.use(cors({
  origin:process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Optional: Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

console.log('Loading .env from:', __dirname);
console.log('AWS_REGION:', process.env.AWS_REGION);
// Routes
app.use('/api/user', userRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/files', fileUploadRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/quiz-generator', quizGeneratorRoutes);

// Root route
app.get('/', (req, res) => res.send('Quiz Genie API'));

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`✅ DB connected & Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('❌ DB connection error:', err));
