const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

dotenv.config();

const heal = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const transactions = await Transaction.find({});
        console.log(`Checking ${transactions.length} transactions...`);

        for (const tx of transactions) {
            if (tx.product) {
                const product = await Product.findById(tx.product);
                if (product) {
                    let changed = false;
                    if (tx.productName !== product.name) {
                        tx.productName = product.name;
                        changed = true;
                    }
                    if (tx.size !== product.size) {
                        tx.size = product.size;
                        changed = true;
                    }
                    if (tx.productType !== product.type) {
                        console.log(`Healing Transaction ${tx._id}: changing productType from "${tx.productType}" to "${product.type}" (Matches Product ID)`);
                        tx.productType = product.type;
                        changed = true;
                    }
                    if (changed) {
                        await tx.save();
                    }
                } else {
                    console.log(`Warning: Transaction ${tx._id} points to missing product ID ${tx.product}`);
                }
            } else {
                console.log(`Warning: Transaction ${tx._id} has no product reference.`);
                // Try to find a match by name, size, type
                const pType = tx.productType || 'PPF TF';
                const match = await Product.findOne({
                    name: tx.productName,
                    size: tx.size,
                    type: pType
                });
                if (match) {
                    console.log(`Linking Transaction ${tx._id} to Product ${match._id} based on name/size/type`);
                    tx.product = match._id;
                    tx.productId = match._id.toString();
                    tx.productType = match.type;
                    await tx.save();
                }
            }
        }

        console.log('Healing completed.');
        process.exit(0);
    } catch (error) {
        console.error('Healing failed:', error);
        process.exit(1);
    }
};

heal();
