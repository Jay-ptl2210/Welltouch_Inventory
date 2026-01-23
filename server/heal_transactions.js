const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
const Party = require('./models/Party');

dotenv.config();

const heal = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const transactions = await Transaction.find({});
        console.log(`Checking ${transactions.length} transactions...`);

        for (const tx of transactions) {
            if (tx.product) {
                const product = await Product.findById(tx.product);
                if (product) {
                    let changed = false;
                    if (tx.productName !== product.name) {
                        tx.productName = product.name;
                        changed = true;
                    }
                    if (tx.size !== product.size) {
                        tx.size = product.size;
                        changed = true;
                    }
                    if (tx.productType !== product.type) {
                        console.log(`Healing Transaction ${tx._id}: changing productType from "${tx.productType}" to "${product.type}"`);
                        tx.productType = product.type;
                        changed = true;
                    }
                    if (product.party && (!tx.party || tx.party.toString() !== product.party.toString())) {
                        console.log(`Healing Transaction ${tx._id}: adding party reference ${product.party}`);
                        tx.party = product.party;
                        changed = true;
                    }

                    if (product.party && !tx.partyName) {
                        const partyObj = await Party.findById(product.party);
                        if (partyObj) {
                            console.log(`Healing Transaction ${tx._id}: setting partyName to "${partyObj.name}"`);
                            tx.partyName = partyObj.name;
                            changed = true;
                        }
                    }

                    if (changed) {
                        await tx.save();
                    }
                } else {
                    console.log(`Warning: Transaction ${tx._id} (${tx.productName}) points to missing product ID ${tx.product}. Attempting fallback...`);
                    // Try to find a match by name, size
                    const match = await Product.findOne({
                        name: tx.productName,
                        size: tx.size
                    }).populate('party');

                    if (match) {
                        console.log(`Linking Transaction ${tx._id} to Product ${match._id} based on name/size`);
                        tx.product = match._id;
                        tx.productId = match._id.toString();
                        tx.productType = match.type;
                        tx.party = match.party ? match.party._id : undefined;
                        tx.partyName = match.party ? match.party.name : undefined;
                        await tx.save();
                    }
                }
            } else {
                console.log(`Warning: Transaction ${tx._id} (${tx.productName}) has no product reference. Attempting fallback...`);
                // Try to find a match by name, size
                const match = await Product.findOne({
                    name: tx.productName,
                    size: tx.size
                }).populate('party');
                if (match) {
                    console.log(`Linking Transaction ${tx._id} to Product ${match._id} based on name/size`);
                    tx.product = match._id;
                    tx.productId = match._id.toString();
                    tx.productType = match.type;
                    tx.party = match.party ? match.party._id : undefined;
                    tx.partyName = match.party ? match.party.name : undefined;
                    await tx.save();
                }
            }
        }

        console.log('Healing completed.');
        process.exit(0);
    } catch (error) {
        console.error('Healing failed:', error);
        process.exit(1);
    }
};

heal();
