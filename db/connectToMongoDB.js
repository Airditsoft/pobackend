const mongoose = require("mongoose");

const connectToMongoDB = async (url) => {
  try {
    await mongoose.connect(url);
    console.log("connected to mongodb");
  } catch (error) {
    console.log("Failed to connect mongodb", error.message);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;
