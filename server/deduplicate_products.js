const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const deduplicate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const allProducts = await Product.find({}).lean();
        const grouped = {};

        allProducts.forEach(p => {
            const key = `${p.name}-${p.size}-${p.type}-${p.user}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });

        for (const key in grouped) {
            const duplicates = grouped[key];
            if (duplicates.length > 1) {
                console.log(`\nProcessing Cloashes for key: ${key}`);

                // Keep the "best" record (e.g. the one with the most transactions or first created)
                // For simplicity, we'll keep the first one.
                const mainProduct = duplicates[0];
                const others = duplicates.slice(1);

                let totalQuantity = mainProduct.quantity;
                let totalPrevStock = mainProduct.previousStock || 0;

                for (const other of others) {
                    console.log(`  Merging ID ${other._id} into ID ${mainProduct._id}`);

                    totalQuantity += other.quantity;
                    totalPrevStock += (other.previousStock || 0);

                    // Update all transactions pointing to the duplicate product
                    const txResult = await Transaction.updateMany(
                        { product: other._id },
                        { $set: { product: mainProduct._id, productId: mainProduct._id.toString() } }
                    );
                    console.log(`    Updated ${txResult.modifiedCount} transactions`);

                    // Also check transactions pointing by productId string
                    const txStrResult = await Transaction.updateMany(
                        { productId: other._id.toString() },
                        { $set: { product: mainProduct._id, productId: mainProduct._id.toString() } }
                    );
                    if (txStrResult.modifiedCount > 0) {
                        console.log(`    Updated ${txStrResult.modifiedCount} string-linked transactions`);
                    }

                    // Delete the duplicate product
                    await Product.deleteOne({ _id: other._id });
                    console.log(`    Deleted Product ID ${other._id}`);
                }

                // Update the main product with summed quantities
                await Product.updateOne(
                    { _id: mainProduct._id },
                    { $set: { quantity: totalQuantity, previousStock: totalPrevStock } }
                );
                console.log(`  Target ID ${mainProduct._id} updated with total quantity: ${totalQuantity}`);
            }
        }

        console.log('\nDeduplication completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Deduplication failed:', err);
        process.exit(1);
    }
};

deduplicate();
