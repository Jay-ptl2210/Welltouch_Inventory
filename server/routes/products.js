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
      pcsPerPacket,
      type = 'ST'
    } = req.body;

    if (!name || !size || quantity === undefined) {
      return res.status(400).json({ error: 'Name, size, and quantity are required' });
    }

    if (!packetsPerLinear || !pcsPerPacket) {
      return res.status(400).json({ error: 'packetsPerLinear and pcsPerPacket are required' });
    }

    // Check if product with same name, size and type exists
    const existingProduct = await Product.findOne({
      name,
      size,
      type,
      user: req.user._id
    });

    const incomingPcs = toPcs(quantity, quantityUnit, { packetsPerLinear, pcsPerPacket });

    if (existingProduct) {
      existingProduct.quantity += incomingPcs;
      // We don't update previousStock here to keep the original "Initial" stock fixed
      // existingProduct.previousStock remains the same
      existingProduct.packetsPerLinear = packetsPerLinear;
      existingProduct.pcsPerPacket = pcsPerPacket;
      if (type) existingProduct.type = type;
      await existingProduct.save();

      // Create a "produce" transaction for this manual addition so history matches
      await Transaction.create({
        product: existingProduct._id,
        productId: existingProduct._id,
        productName: name,
        size: size,
        type: 'produce',
        unit: quantityUnit,
        quantity: Number(quantity),
        quantityInPcs: incomingPcs,
        date: new Date(),
        note: 'Manual stock addition (Add Product form)',
        productType: type,
        user: req.user._id
      });

      return res.status(200).json(existingProduct);
    }

    const product = await Product.create({
      name,
      size,
      quantity: incomingPcs,
      previousStock: incomingPcs,
      packetsPerLinear,
      pcsPerPacket,
      type,
      user: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: `Product with name "${name}", size "${size}" and type "${type}" already exists` });
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
      previousStock,
      type
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
    if (type !== undefined) product.type = type;

    if (quantity !== undefined) {
      const newPcs = toPcs(quantity, quantityUnit || 'pcs', {
        packetsPerLinear: product.packetsPerLinear,
        pcsPerPacket: product.pcsPerPacket
      });

      const diff = newPcs - product.quantity;
      if (diff !== 0) {
        // Create an audit transaction for this manual adjustment
        await Transaction.create({
          product: product._id,
          productId: product._id,
          productName: product.name,
          size: product.size,
          type: diff > 0 ? 'produce' : 'delivered',
          unit: 'pcs',
          quantity: Math.abs(diff),
          quantityInPcs: Math.abs(diff),
          date: new Date(),
          note: `Manual stock adjustment from ${product.quantity} to ${newPcs} pcs`,
          productType: product.type,
          user: req.user._id
        });
        product.quantity = newPcs;
      }
    }

    if (previousStock !== undefined) {
      product.previousStock = toPcs(previousStock, quantityUnit, {
        packetsPerLinear: product.packetsPerLinear,
        pcsPerPacket: product.pcsPerPacket
      });
    }

    await product.save();

    // If name, size or type changed, propagate to related transactions for display consistency
    if (name !== undefined || size !== undefined || type !== undefined) {
      await Transaction.updateMany(
        { product: product._id, user: req.user._id },
        {
          $set: {
            productName: product.name,
            size: product.size,
            productType: product.type
          }
        }
      );
    }

    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: `Product with name "${name}", size "${size}" and type "${type}" already exists` });
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
