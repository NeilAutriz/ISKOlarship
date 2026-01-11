// =============================================================================
// ISKOlarship Backend Server
// Express.js server with MongoDB connection
// =============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const scholarshipRoutes = require('./routes/scholarship.routes');
const applicationRoutes = require('./routes/application.routes');
const predictionRoutes = require('./routes/prediction.routes');
const statisticsRoutes = require('./routes/statistics.routes');

// Initialize Express App
const app = express();

// =============================================================================
// Middleware Configuration
// =============================================================================

// CORS - Allow frontend requests
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Parse JSON bodies with increased limit for file uploads (base64)
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies with increased limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =============================================================================
// Database Connection
// =============================================================================

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolaship';
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    console.log('✅ MongoDB Connected Successfully');
    return true;
  } catch (error) {
    console.error('⚠️  MongoDB Connection Error:', error.message);
    console.log('📝 Server will start without database connection.');
    console.log('   Some features may not work until MongoDB is available.');
    return false;
  }
};

// =============================================================================
// API Routes
// =============================================================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ISKOlarship API is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// User Routes (Student & Admin profiles)
app.use('/api/users', userRoutes);

// Scholarship Routes
app.use('/api/scholarships', scholarshipRoutes);

// Application Routes
app.use('/api/applications', applicationRoutes);

// Prediction Routes (Logistic Regression)
app.use('/api/predictions', predictionRoutes);

// Statistics Routes (Analytics & Reports)
app.use('/api/statistics', statisticsRoutes);

// =============================================================================
// Error Handling Middleware
// =============================================================================

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================================================
// Start Server
// =============================================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const dbConnected = await connectDB();
  
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    ISKOlarship API                        ║
║                                                           ║
║  🚀 Server running on port ${PORT}                          ║
║  📊 MongoDB: ${dbConnected ? 'Connected' : 'Not Connected'}                             ║
║  🔗 API: http://localhost:${PORT}/api                       ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();

module.exports = app;
