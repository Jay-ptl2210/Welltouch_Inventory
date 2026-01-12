const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
const Party = require('./models/Party');
const User = require('./models/User');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            console.log(`Processing user: ${user.email}`);

            // 1. Create Default Party if not exists
            let defaultParty = await Party.findOne({ name: 'Default', user: user._id });
            if (!defaultParty) {
                defaultParty = await Party.create({ name: 'Default', user: user._id });
                console.log(`  Created 'Default' party for ${user.email}`);
            } else {
                console.log(`  'Default' party already exists for ${user.email}`);
            }

            // 2. Assign products to Default Party
            const productsToUpdate = await Product.find({
                user: user._id,
                $or: [{ party: null }, { party: { $exists: false } }]
            });

            if (productsToUpdate.length > 0) {
                const productIds = productsToUpdate.map(p => p._id);
                const result = await Product.updateMany(
                    { _id: { $in: productIds } },
                    { $set: { party: defaultParty._id } }
                );
                console.log(`  Updated ${result.modifiedCount} products for ${user.email}`);

                // 3. Update transactions for these products
                const txResult = await Transaction.updateMany(
                    {
                        userId: user._id,
                        productId: { $in: productIds },
                        $or: [{ party: null }, { party: { $exists: false } }]
                    },
                    {
                        $set: {
                            party: defaultParty._id,
                            partyName: defaultParty.name
                        }
                    }
                );
                console.log(`  Updated ${txResult.modifiedCount} transactions for ${user.email}`);
            } else {
                console.log(`  No products to update for ${user.email}`);
            }
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
