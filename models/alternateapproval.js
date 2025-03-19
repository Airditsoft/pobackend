const mongoose = require("mongoose");

const alternateapprovalSchema = new mongoose.Schema({
  createdBy: {
    type: String,
    required: true,
  },
  alternateApprover: {
    type: String,
    required: true,
  },
  fromDate:{
    type: String,
    required: true,
  },
  toDate:{
    type: String,
    required: true,
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }, // Manually add createdAt
});

module.exports = mongoose.model("AlternateApproval", alternateapprovalSchema);
