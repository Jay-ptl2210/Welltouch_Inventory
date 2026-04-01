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
        let nextNumber = 1;
        let challanNumber = '';
        
        const challanDate = req.body.date ? new Date(req.body.date) : new Date();
        const isNewFinancialSystem = (challanDate.getFullYear() > 2026) || (challanDate.getFullYear() === 2026 && challanDate.getMonth() >= 3);

        if (isNewFinancialSystem) {
            const year = challanDate.getFullYear();
            const month = challanDate.getMonth();
            let startYear, endYear;
            if (month >= 3) {
                startYear = year;
                endYear = year + 1;
            } else {
                startYear = year - 1;
                endYear = year;
            }
            const yearSuffix = `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
            const suffixRegex = `/${yearSuffix}$`;

            const lastChallan = await Challan.findOne(
                { challanNumber: { $regex: new RegExp(`^WT\\d+${suffixRegex}`, 'i') } }
            ).sort({ createdAt: -1 });

            if (lastChallan && lastChallan.challanNumber) {
                const match = lastChallan.challanNumber.match(/^WT(\d+)\//i);
                if (match && match[1]) {
                    const parsedNumber = parseInt(match[1], 10);
                    if (!isNaN(parsedNumber)) {
                        nextNumber = parsedNumber + 1;
                    }
                }
            }
            challanNumber = `WT${String(nextNumber).padStart(3, '0')}/${yearSuffix}`;
        } else {
            const lastChallan = await Challan.findOne(
                { challanNumber: { $not: /_/ } }
            ).sort({ createdAt: -1 });

            if (lastChallan && lastChallan.challanNumber) {
                const lastNumMatch = lastChallan.challanNumber.match(/\d+/);
                if (lastNumMatch) {
                    nextNumber = parseInt(lastNumMatch[0]) + 1;
                }
            }
            challanNumber = `CH${String(nextNumber).padStart(3, '0')}`;
        }

        const challan = await Challan.create({
            ...req.body,
            challanNumber,
            user: req.user.id
        });

        // Create transactions and update stock for each item
        const Transaction = require('../models/Transaction');
        const Product = require('../models/Product');

        for (const item of challan.items) {
            const product = await Product.findById(item.product);
            if (product) {
                const qtyPcs = item.quantityInPcs;
                product.quantity -= qtyPcs;
                if (product.quantity < 0) product.quantity = 0; // Prevent negative stock on dashboard
                await product.save();

                await Transaction.create({
                    product: product._id,
                    productId: product._id.toString(),
                    productName: product.name,
                    size: product.size,
                    type: 'delivered',
                    unit: item.unit,
                    quantity: item.quantity,
                    quantityInPcs: qtyPcs,
                    date: challan.date,
                    note: `Challan No# ${challanNumber} - Veh: ${challan.vehicleNumber || 'N/A'}`,
                    productType: product.type,
                    party: product.party,
                    challanId: challan._id,
                    user: req.user.id
                });
            }
        }

        res.status(201).json({ success: true, data: challan });
    } catch (err) {
        console.error('Error creating challan:', err);
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

        const Transaction = require('../models/Transaction');
        const Product = require('../models/Product');

        // 1. Revert stock for existing transactions linked to this challan
        const oldTransactions = await Transaction.find({ challanId: challan._id });
        for (const tx of oldTransactions) {
            const product = await Product.findById(tx.product);
            if (product) {
                product.quantity += tx.quantityInPcs;
                await product.save();
            }
        }
        // Delete old transactions
        await Transaction.deleteMany({ challanId: challan._id });

        // 2. Update the challan record
        const updatedChallan = await Challan.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        // 3. Create new transactions and update stock for newest items
        const nextChallanNumber = updatedChallan.challanNumber;

        for (const item of updatedChallan.items) {
            const product = await Product.findById(item.product);
            if (product) {
                const qtyPcs = item.quantityInPcs;
                product.quantity -= qtyPcs;
                if (product.quantity < 0) product.quantity = 0;
                await product.save();

                await Transaction.create({
                    product: product._id,
                    productId: product._id.toString(),
                    productName: product.name,
                    size: product.size,
                    type: 'delivered',
                    unit: item.unit,
                    quantity: item.quantity,
                    quantityInPcs: qtyPcs,
                    date: updatedChallan.date,
                    note: `Challan No# ${nextChallanNumber} - Veh: ${updatedChallan.vehicleNumber || 'N/A'}`,
                    productType: product.type,
                    party: product.party,
                    challanId: updatedChallan._id,
                    user: req.user.id
                });
            }
        }

        res.status(200).json({ success: true, data: updatedChallan });
    } catch (err) {
        console.error('Error updating challan:', err);
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

        const Transaction = require('../models/Transaction');
        const Product = require('../models/Product');

        // Find linked transactions
        const transactions = await Transaction.find({ challanId: challan._id });

        // Revert stock for each transaction
        for (const tx of transactions) {
            const product = await Product.findById(tx.product);
            if (product) {
                product.quantity += tx.quantityInPcs;
                await product.save();
            }
        }

        // Delete linked transactions
        await Transaction.deleteMany({ challanId: challan._id });

        // Delete the challan
        await challan.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.error('Error deleting challan:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
