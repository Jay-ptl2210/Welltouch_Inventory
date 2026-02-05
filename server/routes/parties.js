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
        const parties = await Party.find({}).sort({ name: 1 });
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
        const { name, gst, phone, address, isBoth } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Party name is required' });
        }

        const party = await Party.create({
            name,
            gst,
            phone,
            address,
            isBoth: isBoth || false,
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

// @desc    Update a party
// @route   PUT /api/parties/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, gst, phone, address, isBoth } = req.body;
        const party = await Party.findById(req.params.id);

        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        party.name = name || party.name;
        party.gst = gst !== undefined ? gst : party.gst;
        party.phone = phone !== undefined ? phone : party.phone;
        party.address = address !== undefined ? address : party.address;
        party.isBoth = isBoth !== undefined ? isBoth : party.isBoth;

        const updatedParty = await party.save();
        res.json(updatedParty);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Party with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to update party' });
    }
});

// @desc    Delete a party
// @route   DELETE /api/parties/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const partyId = req.params.id;

        // Check if any products are associated with this party
        const productCount = await Product.countDocuments({ party: partyId });
        if (productCount > 0) {
            return res.status(400).json({ error: 'Cannot delete party associated with products' });
        }

        const party = await Party.findByIdAndDelete(partyId);

        if (!party) {
            return res.status(404).json({ error: 'Party not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete party' });
    }
});

module.exports = router;
