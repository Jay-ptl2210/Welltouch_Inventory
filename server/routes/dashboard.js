const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// @desc    Get dashboard data (products with current quantities)
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id }).populate('party', 'name');

    // Group products by name and size
    const dashboardMap = {};

    products.forEach(product => {
      const type = product.type || 'PPF TF';
      const partyId = product.party?._id?.toString() || 'no-party';
      const key = `${product.name}-${product.size}-${type}-${partyId}-${product.weight || '0'}`;
      if (!dashboardMap[key]) {
        dashboardMap[key] = {
          name: product.name,
          size: product.size,
          type: type,
          weight: product.weight,
          party: product.party,
          quantity: 0,
          packetsPerLinear: product.packetsPerLinear || 0,
          pcsPerPacket: product.pcsPerPacket || 0
        };
      }

      // Sum quantities (already stored in pcs)
      dashboardMap[key].quantity += product.quantity;

      // Prefer a non-zero conversion factor if available
      if (!dashboardMap[key].packetsPerLinear && product.packetsPerLinear) {
        dashboardMap[key].packetsPerLinear = product.packetsPerLinear;
      }
      if (!dashboardMap[key].pcsPerPacket && product.pcsPerPacket) {
        dashboardMap[key].pcsPerPacket = product.pcsPerPacket;
      }
    });

    const dashboard = Object.values(dashboardMap);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
