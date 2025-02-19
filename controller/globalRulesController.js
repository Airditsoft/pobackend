const mongoose = require("mongoose");
const GlobalRule = require("../models/globalrule");

const saveGlobalRules = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("Received Data:", req.body);

    const { rules, levels } = req.body;

    // Validate rules
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid request format. Expected an array of rules." });
    }

    // Validate levels
    if (!Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid request format. Expected an array of levels." });
    }

    // Check if any rule is missing required fields
    const invalidRules = rules.filter(rule => !rule.field || !rule.comparisonType || !rule.ruleType || !rule.value);
    if (invalidRules.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Missing required fields in some rules", invalidRules });
    }

    // Check if any level is missing required fields
    const invalidLevels = levels.filter(level => !level.departmentId || !level.level);
    if (invalidLevels.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Missing required fields in some levels", invalidLevels });
    }

    // Save rules
    const savedRules = [];
    for (const rule of rules) {
      const { field, comparisonType, ruleType, value } = rule;

      // Check if the rule already exists
      const existingRule = await GlobalRule.findOne({ field, comparisonType, ruleType, value }).session(session);
      if (existingRule) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Rule already exists", duplicateRule: rule });
      }

      // Create approval hierarchy
      const approval_hierarchy = levels.map(level => `${level.departmentId} ${level.level}`);

      // Save the new rule
      const newRule = new GlobalRule({ field, comparisonType, ruleType, value, approval_hierarchy });
      await newRule.save({ session });
      savedRules.push(newRule);
    }

    // Commit transaction if all operations succeed
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Rules and levels saved successfully",
      savedRules,
    });

  } catch (error) {
    // Abort transaction in case of failure
    await session.abortTransaction();
    session.endSession();
    console.error("Error saving rules and levels:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

  
  

// ✅ API to Retrieve Saved Global Rules
const getGlobalRules = async (req, res) => {
  try {
    const rules = await GlobalRule.find();

    if (!rules) {
      return res.status(200).json({ success: true, message: "No global rules found", rules: [] });
    }

    return res.status(200).json({ success: true, rules });
  } catch (error) {
    console.error("Error fetching global rules:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const deleteRules = async (req,res) => {
  console.log('came delete')
  try {
    console.log(req.params.ruleId);
    const deletedRule = await GlobalRule.findByIdAndDelete(req.params.ruleId);
    if (!deletedRule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports={saveGlobalRules,getGlobalRules,deleteRules};