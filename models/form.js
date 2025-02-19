const mongoose = require("mongoose");

const FormSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // "PO"
});

module.exports = mongoose.model("Form", FormSchema);
