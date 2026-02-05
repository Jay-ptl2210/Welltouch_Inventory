const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, generateRefreshToken, protect } = require('../middleware/auth');
const { isSuperUser } = require('../middleware/rbac');

// @desc    Register user (Only Super User can register others now, or keep public if needed)
// @route   POST /api/auth/register
// @access  Public (or Private)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

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
      password,
      role: role || 'user',
      permissions: permissions || {
        dashboard: 'none',
        production: 'none',
        challan: 'none',
        products: 'none',
        delivery: 'none',
        transactions: 'none',
        reports: 'none',
        deliveryReport: 'none',
        entities: 'none',
        transports: 'none'
      }
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
        email: user.email,
        role: user.role,
        permissions: user.permissions
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

    // Promote welltouch@gmail.com to super_user if not already
    if (user.email === 'welltouch@gmail.com' && user.role !== 'super_user') {
      user.role = 'super_user';
      // Give full permissions just in case middleware checks them
      const modules = ['dashboard', 'production', 'challan', 'products', 'delivery', 'transactions', 'reports', 'deliveryReport', 'entities', 'transports'];
      modules.forEach(m => {
        if (!user.permissions) user.permissions = {};
        user.permissions[m] = 'edit';
      });
      await user.save({ validateBeforeSave: false });
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
    const userWithTokens = await User.findById(user._id).select('+refreshTokens');
    userWithTokens.refreshTokens = userWithTokens.refreshTokens || [];
    userWithTokens.refreshTokens.push(refreshToken);

    // Optional: Limit number of devices
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
        email: user.email,
        role: user.role,
        permissions: user.permissions
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
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Super User only)
router.get('/users', protect, isSuperUser, async (req, res) => {
  try {
    const users = await User.find({ email: { $ne: 'welltouch@gmail.com' } });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private (Super User only)
router.put('/users/:id', protect, isSuperUser, async (req, res) => {
  try {
    const { name, email, role, permissions } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent modifying the super user itself from this route
    if (user.email === 'welltouch@gmail.com') {
      return res.status(403).json({ error: 'Cannot modify primary Super User' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.permissions = permissions || user.permissions;

    await user.save({ validateBeforeSave: false });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Super User only)
router.delete('/users/:id', protect, isSuperUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email === 'welltouch@gmail.com') {
      return res.status(403).json({ error: 'Cannot delete primary Super User' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'User deleted' });
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
