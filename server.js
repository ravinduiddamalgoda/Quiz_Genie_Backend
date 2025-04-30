// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fileUploadRoutes = require('./routers/pdfRoutes');
const battleRoutes = require('./routers/battleRoutes');
const userRoutes = require('./routers/userRouters');
const quizRoutes = require('./routers/quizRoutes'); // Add this line

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
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
app.use('/api/quiz', quizRoutes); // Add this line

// Root route
app.get('/', (req, res) => res.send('Hello world'));

// MongoDB connection and server start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`✅ DB connected & Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('❌ DB connection error:', err));