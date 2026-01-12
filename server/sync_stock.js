const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

dotenv.config();

const syncImproved = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        const transactions = await Transaction.find({});
        console.log(`Found ${products.length} products and ${transactions.length} transactions to sync.`);

        for (const product of products) {
            // Use BROAD matching identical to Reports.jsx
            const txs = transactions.filter(tx =>
                (tx.product && tx.product.toString() === product._id.toString()) ||
                (tx.productId === product._id.toString()) ||
                (tx.productName === product.name && tx.size === product.size && (tx.productType || 'PPF TF') === (product.type || 'PPF TF'))
            );

            let produced = 0;
            let delivered = 0;

            txs.forEach(tx => {
                const qty = Number(tx.quantityInPcs) || 0;
                if (tx.type === 'produce') produced += qty;
                else if (tx.type === 'delivered') delivered += qty;
            });

            // previousStock + Produced - Delivered = Current Quantity
            // previousStock = Current Quantity - Produced + Delivered
            const targetPreviousStock = product.quantity - produced + delivered;

            console.log(`Product: ${product.name} (${product.size}) [${product.type || 'PPF TF'}]`);
            console.log(`  Current Qty: ${product.quantity}`);
            console.log(`  Total Produced: ${produced}`);
            console.log(`  Total Delivered: ${delivered}`);

            if (Math.abs(product.previousStock - targetPreviousStock) > 0.01) {
                console.log(`  updating previousStock: ${product.previousStock} -> ${targetPreviousStock}`);
                product.previousStock = targetPreviousStock;
                await product.save();
            } else {
                console.log('  already in sync.');
            }
        }

        console.log('Sync completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
};

syncImproved();
