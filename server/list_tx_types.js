const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Transaction = require('./models/Transaction');

dotenv.config();

const listTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const types = await Transaction.distinct('type');
        console.log('Unique Transaction Types found:', types);

        const counts = {};
        for (const type of types) {
            counts[type] = await Transaction.countDocuments({ type });
        }
        console.log('Counts per type:', counts);

        process.exit(0);
    } catch (error) {
        console.error('Failed to list types:', error);
        process.exit(1);
    }
};

listTypes();
