const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a customer name'],
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Ensure unique customer name per user
customerSchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
