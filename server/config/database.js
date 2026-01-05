const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB Atlas connection string should be in format:
    // mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
