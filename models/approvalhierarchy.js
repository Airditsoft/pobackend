
const mongoose = require("mongoose");

const ApprovalHierarchySchema = new mongoose.Schema({
  PONumber: { type: mongoose.Schema.Types.ObjectId, ref: "PODetails", required: true },
  approval_hierarchy: [
    {
      type:String,
      required:true,
      index:true
    }
  ],
});

module.exports = mongoose.model("ApprovalHierarchy", ApprovalHierarchySchema);
