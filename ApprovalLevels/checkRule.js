const moment = require('moment'); // Assuming you're using moment.js for date manipulation
const GlobalRules = require('../models/globalrule');
const FormDetails = require ('../models/formdetails')
const FormItem = require('../models/formitems')
const ApprovalHierarchy = require('../models/approvalhierarchy');
const { defaultlevel} = require('../ApprovalLevels/approvalrules');

async function checkRulesAndSetHierarchy(PONumberId, session = null) {
    try {
        // ✅ Fetch all Global Rules
        const globalRules = await GlobalRules.find().session(session).lean();
        if (!globalRules || globalRules.length === 0) {
            // If no global rules exist, set default approval hierarchy
            const approval_hierarchy = await defaultlevel();
            await ApprovalHierarchy.create([{ PONumber: PONumberId, approval_hierarchy: approval_hierarchy }], { session });
            return; // Exit the function early
        }

        // ✅ Fetch PO and Items
        const po = await FormDetails.findById(PONumberId).session(session);
        const poItems = await FormItem.find({ PONumber: PONumberId }).session(session).lean();

        // ✅ Check each global rule
        let isAnyRulePassed = false; // Flag to check if any rule has passed
        for (const rule of globalRules) {
            const { field, comparisonType, ruleType, value, approval_hierarchy } = rule;
            let isRulePassed = false;
            let compareValue;
            let savedField;

            let totalValue = 0; // Initialize totalValue to store the sum of item fields

            // ✅ Determine the value to compare against
            if (comparisonType === 'Field') {
                if (po[value] !== undefined) {
                    compareValue = po[value];
                } else {
                    // Handle special cases like 'totalitems' or summing up item fields
                    if (value.toLowerCase() === 'totalitems') {
                        compareValue = poItems.length;
                    } else {
                        // Sum up specific numeric fields from items
                        totalValue = poItems.reduce((acc, item) => acc + (parseFloat(item[value]) || 0));
                        compareValue = totalValue;
                    }
                }
            } else {
                compareValue = value; // Direct comparison value
            }

            // ✅ Step 1: Check in PO first
            if (po[field] !== undefined) {
                isRulePassed = evaluateCondition(po[field], ruleType, compareValue, field);
            }

            // ✅ Step 2: If rule not passed yet, check PO Items
            if (!isRulePassed && poItems.length > 0) {
                if (field.toLowerCase() === 'totalitems') {
                    isRulePassed = evaluateCondition(poItems.length, ruleType, compareValue, field);
                    savedField = poItems.length; // Update the field in the PO with the totalItems count
                } else {
                    // Sum up specific numeric fields from items
                    totalValue = poItems.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
                    isRulePassed = evaluateCondition(totalValue, ruleType, compareValue, field);
                    savedField = totalValue; // Update the field in the PO with the totalValue
                }
            }

            // ✅ If rule is passed, set the approval hierarchy and save the totalValue in the PO
            if (isRulePassed) {
                await ApprovalHierarchy.create([{ PONumber: PONumberId, approval_hierarchy: approval_hierarchy }], { session });
                po[field] = savedField; // Update the field in the PO document
                po.currentapprovallevel = approval_hierarchy[0]; // Set the current approval level
                await po.save({ session }); // Save the updated PO document
                isAnyRulePassed = true; // Set the flag to true
                break; // Exit the loop after setting the hierarchy and saving the PO
            }
        }

        // ✅ If no rules are passed, set the default approval hierarchy
        if (!isAnyRulePassed) {
            const approval = await defaultlevel();
            await ApprovalHierarchy.create([{ PONumber: PONumberId, approval_hierarchy: approval }], { session });
            po.currentapprovallevel = approval[0]; // Set the current approval level
            await po.save({ session }); // Save the updated PO document
        }

    } catch (error) {
        console.error('Error in checkRulesAndSetHierarchy:', error);
        throw error; // Re-throw the error for further handling
    }
}

// Helper function to evaluate the condition based on the rule type
function evaluateCondition(fieldValue, ruleType, compareValue, field) {
    // Handle date fields separately
    if (field.toLowerCase() === 'createdon') {
        const fieldDate = moment(fieldValue).format('DD/MM/YYYY'); // Convert to the same format as compareValue
        const compareDate = moment(compareValue, 'DD/MM/YYYY').format('DD/MM/YYYY'); // Ensure compareValue is in the correct format

        fieldValue = fieldDate;
        compareValue = compareDate;
    } else {
        fieldValue = String(fieldValue).toLowerCase();
        compareValue = String(compareValue).toLowerCase();
    }

    switch (ruleType) {
        case "contains":
            return fieldValue.includes(compareValue);
        case "not contains":
            return !fieldValue.includes(compareValue);
        case "equals":
            return fieldValue == compareValue;
        case "not equals":
            return fieldValue != compareValue;
        case "greater than":
            return parseFloat(fieldValue) > parseFloat(compareValue);
        case "less than":
            return parseFloat(fieldValue) < parseFloat(compareValue);
        case "greater than or equals":
            return parseFloat(fieldValue) >= parseFloat(compareValue);
        case "less than or equals":
            return parseFloat(fieldValue) <= parseFloat(compareValue);
        default:
            throw new Error(`Unsupported rule type: ${ruleType}`);
    }
}

module.exports = { checkRulesAndSetHierarchy };