const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const transactions = await Transaction.find({ user: req.user._id })
      .populate({
        path: 'product',
        select: 'name size',
        strictPopulate: false // Allow populate even if product is deleted
      })
      .sort({ date: -1, createdAt: -1 }); // Sort by date descending, then by createdAt descending (newest first)
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Failed to fetch transactions' 
      : error.message;
    res.status(500).json({ error: 'Failed to fetch transactions', details: errorMessage });
  }
});

// @desc    Add transaction (Produce or Delivered)
// @route   POST /api/transactions
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { productId, productName, size, type, quantity, date, note } = req.body;

    // Log received data for debugging (remove in production if needed)
    console.log('Transaction POST request body:', { productId, productName, size, type, quantity, date, note });

    // More detailed validation
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!size) {
      return res.status(400).json({ error: 'Size is required' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }
    if (quantity === undefined || quantity === null || quantity === '') {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    if (type !== 'produce' && type !== 'delivered') {
      return res.status(400).json({ error: 'Type must be produce or delivered' });
    }

    // Find the product
    const product = await Product.findOne({
      _id: productId,
      user: req.user._id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate delivery quantity
    const parsedQuantity = parseFloat(quantity);
    if (type === 'delivered' && parsedQuantity > product.quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock! Current stock: ${product.quantity.toFixed(2)}, Delivery quantity: ${parsedQuantity.toFixed(2)}` 
      });
    }

    // Update product quantity
    const quantityChange = type === 'produce' ? parsedQuantity : -parsedQuantity;
    product.quantity += quantityChange;

    if (product.quantity < 0) {
      product.quantity = 0; // Prevent negative quantities (shouldn't happen with validation above)
    }

    await product.save();

    // Create transaction record
    const transaction = await Transaction.create({
      product: product._id,
      productId: productId,
      productName,
      size,
      type,
      quantity: parseFloat(quantity),
      date: date ? new Date(date) : new Date(),
      note: note || '',
      user: req.user._id
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('product', 'name size');

    res.status(201).json(populatedTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      error: 'Failed to add transaction',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

module.exports = router;
