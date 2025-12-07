const express = require('express');
const router = express.Router();
const {
  getHealth,
  getMetrics,
  getDashboard,
  getLogs,
} = require('../controllers/monitoringController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/v1/monitoring/health
 * @desc    Get system health status
 * @access  Public
 */
router.get('/health', getHealth);

/**
 * @route   GET /api/v1/monitoring/metrics
 * @desc    Get detailed system metrics
 * @access  Private (Admin only)
 */
router.get('/metrics', authenticate, authorize('admin'), getMetrics);

/**
 * @route   GET /api/v1/monitoring/dashboard
 * @desc    Get dashboard statistics for current user
 * @access  Private
 */
router.get('/dashboard', authenticate, getDashboard);

/**
 * @route   GET /api/v1/monitoring/logs
 * @desc    Get recent logs
 * @access  Private (Admin only)
 */
router.get('/logs', authenticate, authorize('admin'), getLogs);

module.exports = router;

