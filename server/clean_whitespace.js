const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

dotenv.config();

const cleanWhitespace = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        for (const p of products) {
            const trimmedName = p.name.trim();
            const trimmedSize = p.size.trim();
            if (p.name !== trimmedName || p.size !== trimmedSize) {
                console.log(`Cleaning Product: "${p.name}" -> "${trimmedName}", "${p.size}" -> "${trimmedSize}"`);
                p.name = trimmedName;
                p.size = trimmedSize;
                await p.save();
            }
        }

        const transactions = await Transaction.find({});
        for (const tx of transactions) {
            const trimmedName = tx.productName ? tx.productName.trim() : '';
            const trimmedSize = tx.size ? tx.size.trim() : '';
            if (tx.productName !== trimmedName || tx.size !== trimmedSize) {
                console.log(`Cleaning Transaction: "${tx.productName}" -> "${trimmedName}", "${tx.size}" -> "${trimmedSize}"`);
                tx.productName = trimmedName;
                tx.size = trimmedSize;
                await tx.save();
            }
        }

        console.log('Cleanup completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
};

cleanWhitespace();
