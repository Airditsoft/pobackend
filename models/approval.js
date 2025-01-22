
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const approvalSchema = new mongoose.Schema({
    PONumber:{
      type: Schema.Types.ObjectId,  // Corrected to ObjectId
      required: true,
      ref: "Podetails"
    },
    approval_hierarchy: {
      type: [
        {
          departmentId: { 
            type: Schema.Types.ObjectId,  // Corrected to ObjectId
            required: true,
            ref: "Department"
          },
          level: { 
            type: Number, 
            required: true 
          },
          comment: { 
            type: String 
          },
          action: { 
            type: String
           },
          createdAt: { 
            type: Date, 
            default: Date.now 
          }, // Manually add createdAt

    }
    ],

    _id: false, // Disables the `_id` field for subdocuments in this array
    default: []

  }   
  });
  

  module.exports = mongoose.model('Approval', approvalSchema);