const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

dotenv.config();

const dump = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        console.log('--- PRODUCTS ---');
        products.forEach(p => {
            console.log(`ID: ${p._id}, Name: "${p.name}", Size: "${p.size}", Type: "${p.type}", Qty: ${p.quantity}, Prev: ${p.previousStock}, User: ${p.user}`);
        });

        const transactions = await Transaction.find({});
        console.log('--- TRANSACTIONS ---');
        transactions.forEach(t => {
            console.log(`ID: ${t._id}, ProdRef: ${t.product}, ProdName: "${t.productName}", Size: "${t.size}", ProdType: "${t.productType}", Type: "${t.type}", Qty: ${t.quantity}, Pcs: ${t.quantityInPcs}, Date: ${t.date}, User: ${t.user}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Dump failed:', error);
        process.exit(1);
    }
};

dump();
