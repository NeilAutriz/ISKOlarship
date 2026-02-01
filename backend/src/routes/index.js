// =============================================================================
// ISKOlarship - Routes Index
// Central export for all route modules
// =============================================================================

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const scholarshipRoutes = require('./scholarship.routes');
const applicationRoutes = require('./application.routes');
const predictionRoutes = require('./prediction.routes');
const statisticsRoutes = require('./statistics.routes');
const trainingRoutes = require('./training.routes');

module.exports = {
  authRoutes,
  userRoutes,
  scholarshipRoutes,
  applicationRoutes,
  predictionRoutes,
  statisticsRoutes,
  trainingRoutes
};
