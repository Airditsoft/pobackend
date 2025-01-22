const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
  key: {
    type : String,
    required: true,
  },
  type: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Status", statusSchema);
