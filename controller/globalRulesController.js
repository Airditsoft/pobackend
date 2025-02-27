const mongoose = require("mongoose");
const GlobalRule = require("../models/globalrule");
const DefaultLevel = require("../models/defaultlevels");
const Form = require('../models/form')

const saveGlobalRules = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("Received Data:", req.body);

    const { rules, levels,action } = req.body;

    if (action === 'default') {
      const result = await defaultlevels(levels, session);

      if (!result.success) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: result.message,
          result,
        });
      }

      await session.commitTransaction();
      session.endSession();
      return res.status(201).json({
        success: true,
        message: "Default  levels set successfully",
        result,
      });
    }

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
    const approval_hierarchy = createApprovalHierarchy(levels);


      

      // Save the new rule
      const newRule = new GlobalRule({ field, comparisonType, ruleType, value,approval_hierarchy:approval_hierarchy });
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

const defaultlevels = async (levels, session = null) => {
  try {
    const form = await Form.findOne({ type: "po" }).session(session);

    console.log("Form:", form);

    // Check if default levels already exist
    const defaultlevel = await DefaultLevel.findOne({ formID: form._id }).session(session);
    console.log("Default Level:", defaultlevel);
    if (defaultlevel) {
      return { success: false, message: "Default levels already exist" };
    }

    // Check if any level is missing required fields
    const invalidLevels = levels.filter(level => !level.departmentId || !level.level);
    if (invalidLevels.length > 0) {
      return { success: false, message: "Missing required fields in some levels", invalidLevels };
    }

   
    // Create approval hierarchy
    const approval_hierarchy = createApprovalHierarchy(levels);
    console.log(approval_hierarchy);
    

    // Save the new rule
    const newRule = new DefaultLevel({ formID: form._id, approval_hierarchy: approval_hierarchy });
    await newRule.save({ session });

    return { success: true, message: "Default levels set successfully" };
  } catch (error) {
    console.error("Error uploading default levels:", error);
    return { success: false, message: "Internal Server Error" };
  }
};


const createApprovalHierarchy = (levels) => {
  let approval_hierarchy = [];
  for (const i of levels) {
    for (let j = 1; j <= i.level; j++) {
      approval_hierarchy.push(`${i.departmentId} ${j}`);
    }
  }
  return approval_hierarchy;
};



const getdefaultlevels = async (req, res) => {
  const {type} = req.query;
  try {
    const form = await Form.findOne({ type});

    const defaultlevel = await DefaultLevel.findOne({ formID: form._id });
    if (!defaultlevel) {
      return res.status(400).json({ message: 'No default levels found' });
    } else {
      return res.status(200).json({ defaultlevel });
    }

  } catch (error) {
    console.error('Get default levels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

const updateDefaultLevel = async (req, res) => {
  const {type} = req.query;
  const { levels } = req.body; 
  console.log('levels:', levels);
  console.log('type:', type);
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const form = await Form.findOne({ type }).session(session);
    const defaultlevel = await DefaultLevel.findOne({ formID: form._id }).session(session);
    if (!defaultlevel) {
      return res.status(400).json({ message: 'No default levels found' });
    }
 
    // Check if any level is missing required fields
    const invalidLevels = levels.filter(level => !level.departmentId || !level.level);
    if (invalidLevels.length > 0) {
      return { success: false, message: "Missing required fields in some levels", invalidLevels };
    }

    // Create approval hierarchy    
    const approval_hierarchy = createApprovalHierarchy(levels);
    console.log(approval_hierarchy);


    defaultlevel.approval_hierarchy = approval_hierarchy;
    await defaultlevel.save({ session });     
    await session.commitTransaction();
    session.endSession();


    return res.status(201).json({ success: true, message: "Default levels updated successfully" });

  }
    catch(error){
      console.error('Update default levels error:', error);
      res.status(500).json({ message: 'Server error' });
    }

  }

module.exports={saveGlobalRules,getGlobalRules,deleteRules,getdefaultlevels,updateDefaultLevel};