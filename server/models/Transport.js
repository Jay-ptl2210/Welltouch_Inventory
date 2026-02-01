const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a transport name'],
        trim: true
    },
    vehicles: [{
        type: String,
        trim: true
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Ensure unique transport name per user
transportSchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Transport', transportSchema);
