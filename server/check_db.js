const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config();

const Product = require('./models/Product');

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) throw new Error('No URI found in env');

        console.log('Connecting...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('products');
        const indexes = await collection.indexes();
        console.log('CURRENT INDEXES:');
        indexes.forEach(idx => {
            console.log(` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${idx.unique})`);
        });

        const oldIndexName = 'name_1_size_1_user_1';
        const hasOld = indexes.some(idx => idx.name === oldIndexName);

        if (hasOld) {
            console.log(`Dropping ${oldIndexName}...`);
            await collection.dropIndex(oldIndexName);
            console.log('Dropped.');
        } else {
            console.log('Old index not found by name.');
            // Try to find it by key
            const oldKey = { name: 1, size: 1, user: 1 };
            const foundByKey = indexes.find(idx => JSON.stringify(idx.key) === JSON.stringify(oldKey));
            if (foundByKey) {
                console.log(`Found index by key: ${foundByKey.name}. Dropping it...`);
                await collection.dropIndex(foundByKey.name);
                console.log('Dropped.');
            }
        }

        console.log('Ensuring new index: { name: 1, size: 1, type: 1, user: 1 }');
        await collection.createIndex({ name: 1, size: 1, type: 1, user: 1 }, { unique: true });
        console.log('Done.');

        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err);
        process.exit(1);
    }
};

run();
