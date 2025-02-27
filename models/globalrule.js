const mongoose = require("mongoose");

const GlobalRuleSchema = new mongoose.Schema({
  field: { type: String, required: true  }, // Field name to compare 
  comparisonType: { type: String, enum: ["Field", "Value"], required: true}, // Field or Value
  ruleType: { type: String, required: true }, // Example: '>', '<', '=', 'contains'
  value: { type: String, required: true }, // Can be a field name or a direct value
  approval_hierarchy:[
    {
      type:String,
      required:true,
      index:true
    }
  ],
});

const GlobalRule = mongoose.model("GlobalRule", GlobalRuleSchema);

module.exports = GlobalRule;
