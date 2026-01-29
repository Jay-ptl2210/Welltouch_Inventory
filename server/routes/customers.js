const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const customers = await Customer.find({ user: req.user.id }).sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: customers
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @desc    Add a customer
// @route   POST /api/customers
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        req.body.user = req.user.id;
        // Ensure isBoth defaults to false if not provided
        if (req.body.isBoth === undefined) {
            req.body.isBoth = false;
        }
        const customer = await Customer.create(req.body);
        res.status(201).json({
            success: true,
            data: customer
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Customer already exists'
            });
        }
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Make sure user owns customer
        if (customer.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'Customer already exists' });
        }
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        // Make sure user owns customer
        if (customer.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized'
            });
        }

        await customer.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

module.exports = router;
