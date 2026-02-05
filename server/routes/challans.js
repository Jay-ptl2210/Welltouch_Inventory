const express = require('express');
const router = express.Router();
const Challan = require('../models/Challan');
const Party = require('../models/Party');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

// @desc    Create new challan
// @route   POST /api/challans
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        // Generate sequential challan number
        const lastChallan = await Challan.findOne({}).sort({ createdAt: -1 });
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
        const challans = await Challan.find({})
            .sort({ createdAt: -1 });

        // Robust manual population for Both-Party support
        const updatedChallans = await Promise.all(challans.map(async (c) => {
            const challanObj = c.toObject();
            if (challanObj.customer) {
                const customerId = challanObj.customer._id || challanObj.customer;

                // 1. Try Customer collection first
                let entity = await Customer.findById(customerId);

                // 2. Fallback to Party collection (for isBoth entities)
                if (!entity) {
                    entity = await Party.findById(customerId);
                }

                if (entity) {
                    challanObj.customer = {
                        _id: entity._id,
                        name: entity.name,
                        address: entity.address,
                        gst: entity.gst,
                        phone: entity.phone
                    };
                } else {
                    challanObj.customer = { _id: customerId, name: 'Unknown' };
                }
            }
            return challanObj;
        }));

        res.status(200).json({ success: true, count: updatedChallans.length, data: updatedChallans });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Update a challan
// @route   PUT /api/challans/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const challan = await Challan.findById(req.params.id);

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
        const challan = await Challan.findById(req.params.id);
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
