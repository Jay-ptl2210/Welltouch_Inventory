const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        const Product = require('./models/Product');
        const products = await Product.find({ name: /Confortime/i });
        products.forEach(p => {
            console.log(`FOUND: Name:[${p.name}] Size:[${p.size}] Type:[${p.type}] ID:[${p._id}]`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();
