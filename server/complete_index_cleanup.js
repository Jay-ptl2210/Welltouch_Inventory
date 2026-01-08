const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        const collection = mongoose.connection.collection('products');
        const indexes = await collection.indexes();

        console.log('Current indexes:', indexes.map(i => i.name));

        for (const idx of indexes) {
            if (idx.name !== '_id_') {
                console.log(`Dropping index: ${idx.name}`);
                await collection.dropIndex(idx.name);
            }
        }

        console.log('Creating new unique index on {name, size, type, user}...');
        await collection.createIndex({ name: 1, size: 1, type: 1, user: 1 }, { unique: true });

        console.log('Final Index List:');
        const finalIndexes = await collection.indexes();
        console.log(JSON.stringify(finalIndexes, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
};
run();
