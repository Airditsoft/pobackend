const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// ApprovalProcess Schema (storing users and their roles/levels)
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phonenumber: {
    type: String,
    required: true,
  },
  role: {
    type: Schema.Types.ObjectId,  // Corrected to ObjectId
    required: true,
    ref: "Role",  // Assuming you have a Role collection
  },
  department: {

    depId:{
      type: Schema.Types.ObjectId,  // Corrected to ObjectId
      required: true,
      ref: "Department",  // Referencing Department model
    },
    level: {
      type: Number,
      required: true,
      index: true, // Level within the role, such as level 1, 2, 3
    }
    
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
