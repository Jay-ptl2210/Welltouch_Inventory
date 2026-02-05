const path = require('path');
const dotenv = require('dotenv');

// Load env vars from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

const migrateSuperUser = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to database');

        // Find the existing super user
        console.log('\n🔍 Looking for welltouch@gmail.com...');
        const oldUser = await User.findOne({ email: 'welltouch@gmail.com' });

        if (!oldUser) {
            console.log('❌ User welltouch@gmail.com not found!');
            console.log('ℹ️  Creating new super user admin@welltouch.com...');

            // Create new super user if old one doesn't exist
            const newUser = await User.create({
                name: 'Welltouch Admin',
                email: 'admin@welltouch.com',
                password: '161278',
                role: 'super_user',
                permissions: {
                    dashboard: 'edit',
                    production: 'edit',
                    challan: 'edit',
                    products: 'edit',
                    delivery: 'edit',
                    transactions: 'edit',
                    reports: 'edit',
                    deliveryReport: 'edit',
                    entities: 'edit',
                    transports: 'edit'
                }
            });

            console.log('✅ New super user created successfully!');
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Role: ${newUser.role}`);
        } else {
            console.log('✅ Found user:', oldUser.email);
            console.log(`   Current role: ${oldUser.role}`);
            console.log(`   Current name: ${oldUser.name}`);

            // Update the user
            console.log('\n🔄 Updating user details...');
            oldUser.email = 'admin@welltouch.com';
            oldUser.password = '161278';
            oldUser.role = 'super_user';

            // Ensure all permissions are set to edit
            oldUser.permissions = {
                dashboard: 'edit',
                production: 'edit',
                challan: 'edit',
                products: 'edit',
                delivery: 'edit',
                transactions: 'edit',
                reports: 'edit',
                deliveryReport: 'edit',
                entities: 'edit',
                transports: 'edit'
            };

            await oldUser.save();

            console.log('✅ User updated successfully!');
            console.log(`   New email: ${oldUser.email}`);
            console.log(`   Role: ${oldUser.role}`);
            console.log(`   Password: Set to 161278`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Login with: admin@welltouch.com / 161278');
        console.log('   2. Verify all data is accessible');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

migrateSuperUser();
