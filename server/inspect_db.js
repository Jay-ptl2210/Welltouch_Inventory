const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const fs = require('fs');
const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const allProducts = await Product.find({}).lean();

        let output = '--- POTENTIAL PRODUCT CLASHES ---\n';
        const grouped = {};
        allProducts.forEach(p => {
            const key = `${p.name}-${p.size}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });

        Object.keys(grouped).forEach(key => {
            if (grouped[key].length > 1) {
                output += `\nGroup: ${key}\n`;
                grouped[key].forEach(p => {
                    output += `  ID: ${p._id} | Type: ${p.type} | Qty: ${p.quantity}\n`;
                });
            }
        });

        output += '\n--- LAST 50 TRANSACTIONS ---\n';
        const lastTxs = await Transaction.find({}).sort({ createdAt: -1 }).limit(50).lean();
        output += `Found ${lastTxs.length} transactions.\n`;
        for (const t of lastTxs) {
            output += `TX ID: ${t._id} | Name: ${t.productName} | Size: ${t.size} | Type: ${t.productType} | TxType: ${t.type} | Qty: ${t.quantity} | ProdID: ${t.product} | Date: ${t.createdAt}\n`;
        }

        fs.writeFileSync('inspect_results_all.txt', output);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
