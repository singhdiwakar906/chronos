const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authValidation, validate } = require('../middleware/validate');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authValidation.register, validate, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authValidation.login, validate, login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getProfile);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticate, updateProfile);

/**
 * @route   PUT /api/v1/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', authenticate, changePassword);

module.exports = router;

