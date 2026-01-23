const express = require('express');
const router = express.Router();
const Challan = require('../models/Challan');
const { protect } = require('../middleware/auth');

// @desc    Create new challan
// @route   POST /api/challans
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        // Generate sequential challan number
        const lastChallan = await Challan.findOne({ user: req.user.id }).sort({ createdAt: -1 });
        let nextNumber = 1;

        if (lastChallan && lastChallan.challanNumber) {
            const lastNumMatch = lastChallan.challanNumber.match(/\d+/);
            if (lastNumMatch) {
                nextNumber = parseInt(lastNumMatch[0]) + 1;
            }
        }

        const challanNumber = `CH${String(nextNumber).padStart(3, '0')}`;

        const challan = await Challan.create({
            ...req.body,
            challanNumber,
            user: req.user.id
        });
        res.status(201).json({ success: true, data: challan });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Get all challans for user
// @route   GET /api/challans
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const challans = await Challan.find({ user: req.user.id })
            .populate('customer', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: challans.length, data: challans });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Update a challan
// @route   PUT /api/challans/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const challan = await Challan.findOne({ _id: req.params.id, user: req.user.id });

        if (!challan) {
            return res.status(404).json({ success: false, error: 'Challan not found' });
        }

        const updatedChallan = await Challan.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updatedChallan });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Delete a challan
// @route   DELETE /api/challans/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const challan = await Challan.findOne({ _id: req.params.id, user: req.user.id });
        if (!challan) {
            return res.status(404).json({ success: false, error: 'Challan not found' });
        }
        await challan.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
