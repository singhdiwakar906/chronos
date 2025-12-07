const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const jobRoutes = require('./jobs');
const monitoringRoutes = require('./monitoring');

// Mount routes
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/monitoring', monitoringRoutes);

// API info route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Chronos Job Scheduler API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        profile: 'GET /api/v1/auth/me',
        updateProfile: 'PUT /api/v1/auth/me',
        changePassword: 'PUT /api/v1/auth/password',
      },
      jobs: {
        create: 'POST /api/v1/jobs',
        list: 'GET /api/v1/jobs',
        get: 'GET /api/v1/jobs/:id',
        update: 'PUT /api/v1/jobs/:id',
        delete: 'DELETE /api/v1/jobs/:id',
        pause: 'POST /api/v1/jobs/:id/pause',
        resume: 'POST /api/v1/jobs/:id/resume',
        cancel: 'POST /api/v1/jobs/:id/cancel',
        reschedule: 'POST /api/v1/jobs/:id/reschedule',
        trigger: 'POST /api/v1/jobs/:id/trigger',
        executions: 'GET /api/v1/jobs/:id/executions',
        logs: 'GET /api/v1/jobs/:id/logs',
        stats: 'GET /api/v1/jobs/:id/stats',
      },
      monitoring: {
        health: 'GET /api/v1/monitoring/health',
        metrics: 'GET /api/v1/monitoring/metrics',
        dashboard: 'GET /api/v1/monitoring/dashboard',
        logs: 'GET /api/v1/monitoring/logs',
      },
    },
  });
});

module.exports = router;

