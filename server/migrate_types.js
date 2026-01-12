const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Migrate Products
        console.log('Migrating Products...');
        const products = await Product.find({});
        for (const p of products) {
            let changed = false;
            if (p.type === 'TF') { p.type = 'PPF TF'; changed = true; }
            else if (p.type === 'ST') { p.type = 'PPF ST'; changed = true; }
            else if (!p.type) { p.type = 'PPF TF'; changed = true; }

            if (changed) {
                console.log(`Updating Product ${p._id}: ${p.name} | ${p.size} -> Type: ${p.type}`);
                await p.save();
            }
        }

        // Migrate Transactions
        console.log('\nMigrating Transactions...');
        const txs = await Transaction.find({});
        for (const t of txs) {
            let changed = false;
            if (t.productType === 'TF') { t.productType = 'PPF TF'; changed = true; }
            else if (t.productType === 'ST') { t.productType = 'PPF ST'; changed = true; }
            else if (!t.productType) { t.productType = 'PPF TF'; changed = true; }

            if (changed) {
                console.log(`Updating Transaction ${t._id}: Type: ${t.productType}`);
                await t.save();
            }
        }

        console.log('\nMigration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
