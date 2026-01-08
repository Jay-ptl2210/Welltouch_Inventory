const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const findDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const duplicates = await Product.aggregate([
            {
                $group: {
                    _id: { name: "$name", size: "$size", type: "$type", user: "$user" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('No duplicates found.');
        } else {
            console.log(`Found ${duplicates.length} sets of duplicates:`);
            duplicates.forEach(d => {
                console.log(`Name: ${d._id.name}, Size: ${d._id.size}, Type: ${d._id.type}, Count: ${d.count}`);
                console.log(`  IDs: ${d.ids.join(', ')}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Failed to find duplicates:', error);
        process.exit(1);
    }
};

findDuplicates();
