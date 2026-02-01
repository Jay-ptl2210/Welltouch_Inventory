const express = require('express');
const router = express.Router();
const Transport = require('../models/Transport');
const { protect } = require('../middleware/auth');

// @desc    Get all transports for a user
// @route   GET /api/transports
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const transports = await Transport.find({ user: req.user._id }).sort({ name: 1 });
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transports' });
    }
});

// @desc    Create a new transport
// @route   POST /api/transports
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, vehicles } = req.body;
        const transport = await Transport.create({
            name,
            vehicles: vehicles || [],
            user: req.user._id
        });
        res.status(201).json(transport);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Transport name already exists' });
        }
        res.status(400).json({ error: error.message || 'Failed to create transport' });
    }
});

// @desc    Update a transport
// @route   PUT /api/transports/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const transport = await Transport.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!transport) {
            return res.status(404).json({ error: 'Transport not found' });
        }

        res.json(transport);
    } catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update transport' });
    }
});

// @desc    Delete a transport
// @route   DELETE /api/transports/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const transport = await Transport.findOneAndDelete({ _id: req.params.id, user: req.user._id });

        if (!transport) {
            return res.status(404).json({ error: 'Transport not found' });
        }

        res.json({ message: 'Transport deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete transport' });
    }
});

module.exports = router;
