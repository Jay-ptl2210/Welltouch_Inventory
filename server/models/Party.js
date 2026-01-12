const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a party name'],
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

// Ensure unique party name per user
partySchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Party', partySchema);
