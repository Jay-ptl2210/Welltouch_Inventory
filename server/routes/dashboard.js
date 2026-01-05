const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// @desc    Get dashboard data (products with current quantities)
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id });

    // Group products by name and size
    const dashboardMap = {};

    products.forEach(product => {
      const key = `${product.name}-${product.size}`;
      if (!dashboardMap[key]) {
        dashboardMap[key] = {
          name: product.name,
          size: product.size,
          quantity: 0
        };
      }
      dashboardMap[key].quantity += product.quantity;
    });

    const dashboard = Object.values(dashboardMap);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
