const express = require('express'); // Triggering restart
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(async () => {
  try {
    const mongoose = require('mongoose');
    const Product = require('./models/Product');
    const collection = mongoose.connection.collection('products');
    const indexes = await collection.indexes();

    console.log('[Migration] Current indexes:', indexes.map(i => i.name));

    // Drop old indexes that don't include weight
    const oldIndexNames = [
      'name_1_size_1_user_1',
      'name_1_size_1_type_1_user_1',
      'name_1_size_1_type_1_party_1_user_1'
    ];

    for (const oldIndexName of oldIndexNames) {
      if (indexes.some(i => i.name === oldIndexName)) {
        console.log(`[Migration] Dropping old index ${oldIndexName}...`);
        await collection.dropIndex(oldIndexName);
        console.log(`[Migration] Old index ${oldIndexName} dropped.`);
      }
    }

    console.log('[Migration] Index migration complete.');
  } catch (err) {
    console.error('[Migration] Index check failed:', err.message);
  }
});

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/parties', require('./routes/parties'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});