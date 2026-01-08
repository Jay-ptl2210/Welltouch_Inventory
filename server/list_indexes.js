const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        const collection = mongoose.connection.collection('products');
        const indexes = await collection.indexes();
        console.log('INDEX_LIST_START');
        console.log(JSON.stringify(indexes, null, 2));
        console.log('INDEX_LIST_END');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();
