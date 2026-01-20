const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true
  },
  size: {
    type: String,
    required: [true, 'Please add a size'],
    trim: true
  },
  quantity: {
    // Stored in pieces as the base unit
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  previousStock: {
    // Stored in pieces
    type: Number,
    default: 0,
    min: 0
  },
  packetsPerLinear: {
    type: Number,
    required: true,
    min: 0
  },
  pcsPerPacket: {
    type: Number,
    required: true,
    min: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    default: 'PPF TF'
  },
  weight: {
    type: Number,
    default: 0
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: false // Optional for migration, will enforce in routes later
  }
}, {
  timestamps: true
});

// Compound index to ensure unique product name + size + type + weight + party per user
productSchema.index({ name: 1, size: 1, type: 1, weight: 1, party: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
