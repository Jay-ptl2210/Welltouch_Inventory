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
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  previousStock: {
    type: Number,
    default: 0,
    min: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique product name + size per user
productSchema.index({ name: 1, size: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
