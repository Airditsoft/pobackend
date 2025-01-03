const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
  key: {
    type : Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Status", statusSchema);


