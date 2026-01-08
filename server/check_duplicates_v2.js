const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const findDuplicatesAggressive = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        const map = {};
        const duplicates = [];

        products.forEach(p => {
            const type = p.type || 'ST';
            const user = p.user ? p.user.toString() : 'guest';
            const key = `${p.name}|${p.size}|${type}|${user}`;

            if (!map[key]) {
                map[key] = [];
            }
            map[key].push(p);
        });

        for (const key in map) {
            if (map[key].length > 1) {
                duplicates.push({
                    key,
                    products: map[key].map(p => ({
                        id: p._id,
                        qty: p.quantity,
                        prevStock: p.previousStock,
                        type: p.type
                    }))
                });
            }
        }

        if (duplicates.length === 0) {
            console.log('No duplicates found (even with aggressive check).');
        } else {
            console.log(`Found ${duplicates.length} sets of duplicates:`);
            duplicates.forEach(d => {
                console.log(`Key: ${d.key}`);
                d.products.forEach(p => {
                    console.log(`  ID: ${p.id}, Qty: ${p.qty}, prevStock: ${p.prevStock}, storedType: ${p.type}`);
                });
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Failed to find duplicates:', error);
        process.exit(1);
    }
};

findDuplicatesAggressive();
