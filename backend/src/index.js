require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const activityRoutes = require('./routes/activity');
const reportRoutes = require('./routes/reports');
const apiKeysRoutes = require('./routes/apiKeys');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/api-keys', apiKeysRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// Global error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ProjectFlow API running on port ${PORT}`);
  });
}

module.exports = app;
