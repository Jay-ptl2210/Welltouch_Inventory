const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// @desc    Get all parties
// @route   GET /api/parties
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const parties = await Party.find({ user: req.user._id }).sort({ name: 1 });
        res.json(parties);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch parties' });
    }
});

// @desc    Create a party
// @route   POST /api/parties
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Party name is required' });
        }

        const party = await Party.create({
            name,
            user: req.user._id
        });

        res.status(201).json(party);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Party with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create party' });
    }
});

// @desc    Delete a party
// @route   DELETE /api/parties/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const partyId = req.params.id;

        // Check if any products are associated with this party
        const productCount = await Product.countDocuments({ party: partyId, user: req.user._id });
        if (productCount > 0) {
            return res.status(400).json({ error: 'Cannot delete party associated with products' });
        }

        const party = await Party.findOneAndDelete({
            _id: partyId,
            user: req.user._id
        });

        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete party' });
    }
});

module.exports = router;
