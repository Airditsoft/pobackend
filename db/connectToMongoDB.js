// db/connectToMongoDB.js
const mongoose = require("mongoose");

const connectToMongoDB = async (url) => {
  try {
    // Check if already connected (or in the process of connecting)
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      console.log("MongoDB is already connected or connecting");
      return;
    }

    // Otherwise, connect to MongoDB
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;
