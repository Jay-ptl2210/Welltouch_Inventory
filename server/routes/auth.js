const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, generateRefreshToken, protect } = require('../middleware/auth');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Add refresh token to array (multi-device support)
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });


    res.status(201).json({
      success: true,
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Add refresh token to array (multi-device support)
    // Select refreshTokens first since it's hidden by default
    const userWithTokens = await User.findById(user._id).select('+refreshTokens');
    userWithTokens.refreshTokens = userWithTokens.refreshTokens || [];
    userWithTokens.refreshTokens.push(refreshToken);

    // Optional: Limit number of devices (e.g., keep last 5)
    if (userWithTokens.refreshTokens.length > 5) {
      userWithTokens.refreshTokens.shift();
    }

    await userWithTokens.save({ validateBeforeSave: false });


    res.json({
      success: true,
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if user exists and token is in their allowed list
    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate tokens: remove old one, add new one
    user.refreshTokens = user.refreshTokens.filter(rt => rt !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const user = await User.findById(req.user._id).select('+refreshTokens');

    if (refreshToken) {
      // Remove specific token (current device)
      user.refreshTokens = user.refreshTokens.filter(rt => rt !== refreshToken);
    } else {
      // If no token provided, we can't be sure which one to remove
      // In a strict setup, you might require it. 
      // For now, we'll just return success to clear frontend state, 
      // or we could clear ALL if we want (not multi-device friendly)
    }

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
