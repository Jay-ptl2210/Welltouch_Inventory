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
    const products = await Product.find({ user: req.user._id })
      .populate('party', 'name')
      .sort({ createdAt: -1 });
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
      type = 'PPF TF',
      party,
      weight = 0
    } = req.body;

    if (!name || !size || quantity === undefined) {
      return res.status(400).json({ error: 'Name, size, and quantity are required' });
    }

    if (!packetsPerLinear || !pcsPerPacket) {
      return res.status(400).json({ error: 'packetsPerLinear and pcsPerPacket are required' });
    }


    console.log('[Add Product] Searching for existing product:', {
      name,
      size,
      type,
      weight: Number(weight) || 0,
      party: party || undefined,
      user: req.user._id
    });

    const existingProduct = await Product.findOne({
      name,
      size,
      type,
      weight: Number(weight) || 0,
      party: party || undefined,
      user: req.user._id
    }).populate('party', 'name');

    console.log('[Add Product] Existing product found:', existingProduct ? 'YES' : 'NO');


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
        party: existingProduct.party,
        partyName: existingProduct.party ? existingProduct.party.name : undefined,
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
      party,
      weight,
      user: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: `Product with same Name, Size, Type, Weight, and Party already exists` });
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
      type,
      party,
      weight
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
    if (party !== undefined) product.party = party;
    if (weight !== undefined) product.weight = Number(weight);

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
          party: product.party,
          partyName: undefined, // Will be populated below if needed
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

    // If name, size, type, weight or party changed, propagate to related transactions for display consistency
    if (name !== undefined || size !== undefined || type !== undefined || weight !== undefined || party !== undefined) {
      // Reload product to get party name if it was a change
      const updatedProduct = await Product.findById(product._id).populate('party', 'name');

      await Transaction.updateMany(
        { product: product._id, user: req.user._id },
        {
          $set: {
            productName: updatedProduct.name,
            size: updatedProduct.size,
            productType: updatedProduct.type,
            party: updatedProduct.party ? updatedProduct.party._id : undefined,
            partyName: updatedProduct.party ? updatedProduct.party.name : undefined
          }
        }
      );
    }

    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: `Product with same Name, Size, Type, and Weight already exists` });
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
