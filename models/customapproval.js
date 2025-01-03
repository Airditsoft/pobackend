const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define schema for custom approval
const customapprovalSchema = new mongoose.Schema({
  PONumber: {
    type: Schema.Types.ObjectId, // Corrected to ObjectId
    required: true,
    ref: "Podetails"
  },
  approval: {
    type: [
      {
        departmentId: {
          type: Schema.Types.ObjectId, // Corrected to ObjectId
          required: true,
          ref: "Department"
        },
        lastlevel: {
          type: Number, // The last level for the approval (e.g., 1, 2, 3)
          required: true
        }
      }
    ],
    _id: false // Ensure subdocuments in the array do not get their own _id
  }
});

// Export the model
const CustomApproval = mongoose.model('CustomApproval', customapprovalSchema);
module.exports = CustomApproval;
