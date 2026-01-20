const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const collection = mongoose.connection.collection('products');
        const indexes = await collection.indexes();

        console.log('\nCurrent indexes:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
        });

        // Drop old indexes that don't include weight
        const oldIndexNames = [
            'name_1_size_1_user_1',
            'name_1_size_1_type_1_party_1_user_1'
        ];

        for (const oldIndexName of oldIndexNames) {
            if (indexes.some(i => i.name === oldIndexName)) {
                console.log(`\nDropping old index: ${oldIndexName}...`);
                await collection.dropIndex(oldIndexName);
                console.log(`✓ Dropped ${oldIndexName}`);
            }
        }

        // Show final indexes
        const finalIndexes = await collection.indexes();
        console.log('\nFinal indexes:');
        finalIndexes.forEach(idx => {
            console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
        });

        console.log('\n✓ Index migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixIndexes();
