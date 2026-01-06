const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
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

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// @desc    Add new product
// @route   POST /api/products
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      name,
      size,
      quantity,
      quantityUnit = 'linear',
      packetsPerLinear,
      pcsPerPacket
    } = req.body;

    if (!name || !size || quantity === undefined) {
      return res.status(400).json({ error: 'Name, size, and quantity are required' });
    }

    if (!packetsPerLinear || !pcsPerPacket) {
      return res.status(400).json({ error: 'packetsPerLinear and pcsPerPacket are required' });
    }

    // Check if product with same name and size exists
    const existingProduct = await Product.findOne({
      name,
      size,
      user: req.user._id
    });

    const incomingPcs = toPcs(quantity, quantityUnit, { packetsPerLinear, pcsPerPacket });

    if (existingProduct) {
      existingProduct.quantity += incomingPcs;
      existingProduct.previousStock = existingProduct.quantity;
      existingProduct.packetsPerLinear = packetsPerLinear;
      existingProduct.pcsPerPacket = pcsPerPacket;
      await existingProduct.save();
      return res.status(200).json(existingProduct);
    }

    const product = await Product.create({
      name,
      size,
      quantity: incomingPcs,
      previousStock: incomingPcs,
      packetsPerLinear,
      pcsPerPacket,
      user: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Product with this name and size already exists' });
    }
    const msg = error.message || 'Failed to add product';
    res.status(500).json({ error: msg });
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      name,
      size,
      quantity,
      quantityUnit = 'pcs',
      packetsPerLinear,
      pcsPerPacket,
      previousStock
    } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (name !== undefined) product.name = name;
    if (size !== undefined) product.size = size;
    if (packetsPerLinear !== undefined) product.packetsPerLinear = Number(packetsPerLinear);
    if (pcsPerPacket !== undefined) product.pcsPerPacket = Number(pcsPerPacket);

    if (quantity !== undefined) {
      product.quantity = toPcs(quantity, quantityUnit, {
        packetsPerLinear: product.packetsPerLinear,
        pcsPerPacket: product.pcsPerPacket
      });
    }

    if (previousStock !== undefined) {
      product.previousStock = toPcs(previousStock, quantityUnit, {
        packetsPerLinear: product.packetsPerLinear,
        pcsPerPacket: product.pcsPerPacket
      });
    }

    await product.save();

    // If name or size changed, propagate to related transactions for display consistency
    if (name !== undefined || size !== undefined) {
      await Transaction.updateMany(
        { product: product._id, user: req.user._id },
        {
          $set: {
            productName: product.name,
            size: product.size
          }
        }
      );
    }

    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Product with this name and size already exists' });
    }
    const msg = error.message || 'Failed to update product';
    res.status(500).json({ error: msg });
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
