const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// @desc    Add new product
// @route   POST /api/products
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, size, quantity, previousStock = 0 } = req.body;

    if (!name || !size || quantity === undefined) {
      return res.status(400).json({ error: 'Name, size, and quantity are required' });
    }

    // Check if product with same name and size exists
    const existingProduct = await Product.findOne({
      name,
      size,
      user: req.user._id
    });

    if (existingProduct) {
      // Update existing product quantity instead of creating duplicate
      existingProduct.quantity += parseFloat(quantity);
      existingProduct.previousStock = parseFloat(previousStock || existingProduct.previousStock);
      await existingProduct.save();
      return res.status(200).json(existingProduct);
    }

    const product = await Product.create({
      name,
      size,
      quantity: parseFloat(quantity),
      previousStock: parseFloat(previousStock || 0),
      user: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Product with this name and size already exists' });
    }
    res.status(500).json({ error: 'Failed to add product' });
  }
});

module.exports = router;
