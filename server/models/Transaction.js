const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productType: {
    type: String,
    required: true,
    default: 'PPF TF'
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: false
  },
  partyName: {
    type: String,
    trim: true
  },
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['linear', 'packet', 'pcs'],
    default: 'pcs'
  },
  type: {
    type: String,
    required: true,
    enum: ['produce', 'delivered']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  quantityInPcs: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  challanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challan',
    required: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
