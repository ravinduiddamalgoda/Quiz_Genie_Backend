// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Route imports
const fileUploadRoutes = require('./routers/pdfRoutes');
const battleRoutes = require('./routers/battleRoutes');
const userRoutes = require('./routers/userRouters');
const scoreRoutes = require('./routers/scoreRoutes');
const reviewRoutes = require('./routers/reviewRoutes');
const quizRoutes = require('./routers/quizRoutes');
const leaderboardRoutes = require('./routers/leaderboardRoutes');

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
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

// Routes
app.use('/api/user', userRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/files', fileUploadRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Root route
app.get('/', (req, res) => res.send('Hello world'));

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`✅ DB connected & Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('❌ DB connection error:', err));
