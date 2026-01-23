const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const toPcs = (quantity, unit, productLike) => {
  const packetsPerLinear = Number(productLike.packetsPerLinear);
  const pcsPerPacket = Number(productLike.pcsPerPacket);

  if (packetsPerLinear <= 0 || pcsPerPacket <= 0) {
    throw new Error('Invalid conversion factors (packetsPerLinear or pcsPerPacket)');
  }

  const q = Number(quantity);
  if (Number.isNaN(q) || q < 0) {
    throw new Error('Quantity must be a positive number');
  }

  if (unit === 'linear') return q * packetsPerLinear * pcsPerPacket;
  if (unit === 'packet') return q * pcsPerPacket;
  return q; // pcs
};

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
        select: 'name size weight',
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
    const { productId, productName, size, type, quantity, unit = 'pcs', date, note } = req.body;

    // Validation
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
    }).populate('party', 'name');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Convert to base pcs
    const deltaPcs = toPcs(quantity, unit, product);

    // Validate delivery quantity
    if (type === 'delivered' && deltaPcs > product.quantity) {
      return res.status(400).json({
        error: `Insufficient stock! Current stock: ${product.quantity.toFixed(2)}, Delivery quantity: ${deltaPcs.toFixed(2)}`
      });
    }

    // Update product quantity (stored as pcs)
    const quantityChange = type === 'produce' ? deltaPcs : -deltaPcs;
    product.quantity += quantityChange;

    if (product.quantity < 0) {
      product.quantity = 0; // Prevent negative quantities
    }

    await product.save();

    // Create transaction record
    const transaction = await Transaction.create({
      product: product._id,
      productId: productId,
      productName,
      size,
      type,
      unit,
      quantity: Number(quantity),
      quantityInPcs: deltaPcs,
      date: date ? new Date(date) : new Date(),
      note: note || '',
      productType: product.type,
      party: product.party ? product.party._id : undefined,
      partyName: product.party ? product.party.name : undefined,
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

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { productId, productName, size, type, quantity, unit = 'pcs', date, note } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Find the original product affected by this transaction
    const originalProduct = await Product.findOne({
      _id: transaction.product,
      user: req.user._id
    });

    if (!originalProduct) {
      return res.status(404).json({ error: 'Original product not found for this transaction' });
    }

    // Revert the original transaction effect on stock (quantity stored as pcs)
    const originalChange =
      transaction.type === 'produce'
        ? parseFloat(transaction.quantityInPcs)
        : -parseFloat(transaction.quantityInPcs);

    originalProduct.quantity -= originalChange;
    if (originalProduct.quantity < 0) {
      originalProduct.quantity = 0;
    }

    await originalProduct.save();

    // Determine the new product (can be same or different)
    const targetProductId = productId || transaction.product.toString();

    const newProduct = await Product.findOne({
      _id: targetProductId,
      user: req.user._id
    }).populate('party', 'name');

    if (!newProduct) {
      return res.status(404).json({ error: 'Target product not found' });
    }

    // Validate and apply new change
    const parsedQuantity = quantity !== undefined ? parseFloat(quantity) : parseFloat(transaction.quantity);
    const newType = type || transaction.type;
    const newUnit = unit || transaction.unit || 'pcs';

    if (newType !== 'produce' && newType !== 'delivered') {
      return res.status(400).json({ error: 'Type must be produce or delivered' });
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const deltaPcs = toPcs(parsedQuantity, newUnit, newProduct);

    if (newType === 'delivered' && deltaPcs > newProduct.quantity) {
      return res.status(400).json({
        error: `Insufficient stock! Current stock: ${newProduct.quantity.toFixed(
          2
        )}, Delivery quantity: ${deltaPcs.toFixed(2)}`
      });
    }

    const newChange = newType === 'produce' ? deltaPcs : -deltaPcs;
    newProduct.quantity += newChange;

    if (newProduct.quantity < 0) {
      newProduct.quantity = 0;
    }

    await newProduct.save();

    // Update transaction fields
    transaction.product = newProduct._id;
    transaction.productId = targetProductId;
    if (productName !== undefined) transaction.productName = productName;
    if (size !== undefined) transaction.size = size;
    transaction.type = newType;
    transaction.unit = newUnit;
    transaction.quantity = parsedQuantity;
    transaction.quantityInPcs = deltaPcs;
    if (date !== undefined) {
      transaction.date = date ? new Date(date) : new Date();
    }
    if (note !== undefined) transaction.note = note;

    transaction.productType = newProduct.type;
    transaction.party = newProduct.party ? newProduct.party._id : undefined;
    transaction.partyName = newProduct.party ? newProduct.party.name : undefined;

    await transaction.save();

    const populatedTransaction = await Transaction.findById(transaction._id).populate(
      'product',
      'name size'
    );

    res.json(populatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      error: 'Failed to update transaction',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const product = await Product.findOne({
      _id: transaction.product,
      user: req.user._id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found for this transaction' });
    }

    // Revert the transaction effect on stock (stored as pcs)
    const quantityChange =
      transaction.type === 'produce'
        ? parseFloat(transaction.quantityInPcs)
        : -parseFloat(transaction.quantityInPcs);

    product.quantity -= quantityChange;
    if (product.quantity < 0) {
      product.quantity = 0;
    }

    await product.save();
    await transaction.deleteOne();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      error: 'Failed to delete transaction',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

module.exports = router;
