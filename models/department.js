const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },

  lastlevel: {
    type: Number,
    required: true,
  }
});

module.exports = mongoose.model("Department", departmentSchema);
