const mongoose = require('mongoose');

const challanItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: String,
    size: String,
    type: String,
    weight: Number,
    quantity: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['packet', 'linear', 'pcs']
    },
    quantityInPcs: Number,
    packetsPerLinear: Number,
    pcsPerPacket: Number
});

const challanSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: String,
    shipName: String,
    shipAddress: String,
    transport: String,
    vehicleNumber: String,
    dispatchThrough: String,
    termsOfDelivery: String,
    notes: String,
    challanNumber: {
        type: String,
        unique: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    items: [challanItemSchema],
    totalLinear: Number,
    totalPackets: Number,
    totalPieces: Number
}, {
    timestamps: true
});

module.exports = mongoose.model('Challan', challanSchema);
