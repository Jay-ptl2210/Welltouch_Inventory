const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

dotenv.config();

const diagnostic = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        const transactions = await Transaction.find({});

        console.log(`Analyzing ${products.length} products and ${transactions.length} transactions...`);

        const issues = [];

        for (const product of products) {
            // Find ALL transactions that should belong to this product
            const txs = transactions.filter(tx =>
                (tx.product && tx.product.toString() === product._id.toString()) ||
                (tx.productId === product._id.toString()) ||
                (tx.productName === product.name && tx.size === product.size && (tx.productType || 'ST') === (product.type || 'ST'))
            );

            let produced = 0;
            let delivered = 0;

            txs.forEach(tx => {
                const qty = Number(tx.quantityInPcs) || 0;
                if (tx.type === 'produce') produced += qty;
                else if (tx.type === 'delivered') delivered += qty;
            });

            const calculatedRemaining = (Number(product.previousStock) || 0) + produced - delivered;
            const diff = calculatedRemaining - product.quantity;

            if (Math.abs(diff) > 0.01) {
                issues.push({
                    id: product._id,
                    name: product.name,
                    size: product.size,
                    type: product.type,
                    dbQty: product.quantity,
                    prevStock: product.previousStock,
                    produced,
                    delivered,
                    calculated: calculatedRemaining,
                    diff
                });
            }
        }

        if (issues.length === 0) {
            console.log('--- SUCCESS: No calculation conflicts found between DB quantity and Transaction history. ---');
        } else {
            console.log('--- WARNING: Found calculation conflicts! ---');
            issues.forEach(issue => {
                console.log(`Product: ${issue.name} (${issue.size}) [${issue.type}]`);
                console.log(`  ID: ${issue.id}`);
                console.log(`  Initial (prevStock): ${issue.prevStock}`);
                console.log(`  Produced: ${issue.produced}`);
                console.log(`  Delivered: ${issue.delivered}`);
                console.log(`  Calculated Remaining: ${issue.calculated}`);
                console.log(`  DB Stored Quantity: ${issue.dbQty}`);
                console.log(`  Difference: ${issue.diff}`);
                console.log('-----------------------------------');
            });
        }

        // Check for orphaned transactions (txs that don't match any product)
        const orphaned = transactions.filter(tx => {
            const hasMatch = products.some(p =>
                (tx.product && tx.product.toString() === p._id.toString()) ||
                (tx.productId === p._id.toString()) ||
                (tx.productName === p.name && tx.size === p.size && (tx.productType || 'ST') === (p.type || 'ST'))
            );
            return !hasMatch;
        });

        if (orphaned.length > 0) {
            console.log(`--- WARNING: Found ${orphaned.length} orphaned transactions! ---`);
            orphaned.forEach(tx => {
                console.log(`Orphaned TX: ${tx.productName} (${tx.size}) [${tx.productType}] - ${tx.type} ${tx.quantity} ${tx.unit} - Date: ${tx.date}`);
            });
        } else {
            console.log('--- SUCCESS: No orphaned transactions found. ---');
        }

        process.exit(0);
    } catch (error) {
        console.error('Diagnostic failed:', error);
        process.exit(1);
    }
};

diagnostic();
