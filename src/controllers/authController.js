const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    name,
  });

  // Generate tokens
  const tokens = generateTokens(user.id);

  logger.info('User registered successfully', { userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toSafeObject(),
      ...tokens,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated. Please contact support.');
  }

  // Verify password
  const isValidPassword = await user.verifyPassword(password);
  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate tokens
  const tokens = generateTokens(user.id);

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toSafeObject(),
      ...tokens,
    },
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(token, config.jwt.refreshSecret);

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Refresh token has expired. Please login again.');
    }
    throw new ApiError(401, 'Invalid refresh token');
  }
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user.toSafeObject(),
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, notificationPreferences } = req.body;
  const user = req.user;

  if (name) {
    user.name = name;
  }

  if (notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...notificationPreferences,
    };
  }

  await user.save();

  logger.info('User profile updated', { userId: user.id });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user.toSafeObject(),
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  // Verify current password
  const isValidPassword = await user.verifyPassword(currentPassword);
  if (!isValidPassword) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info('User password changed', { userId: user.id });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
};

