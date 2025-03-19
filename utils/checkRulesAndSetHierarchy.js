const FormDetails = require('../models/formdetails');
const FormItem = require('../models/formitems');
const GlobalRules = require('../models/globalrule');
const { defaultlevel,totalPrice ,quantitywise} = require('../ApprovalLevels/approvalrules');
const Department = require('../models/department');
const ApprovalHierarchy = require ('../models/approvalhierarchy')


// Fields that should be **summed** if present in multiple PO Items
const summableFields = ["Price", "Quantity", "TotalPrice", "OrderQuantity"];

async function checkRulesAndSetHierarchy(PONumberId, session = null) {
    try {
        let matchedHierarchies = [];

        console.log('came')
            // ✅ Fetch all Global Rules
            const globalRules = await GlobalRules.find().session(session).lean();
            console.log(globalRules)
            if(!globalRules){
                const hierarchy = await defaultlevel();
                matchedHierarchies.push(...hierarchy);
                return;
            }

        // ✅ Fetch PO and Items
        const po = await FormDetails.findById(PONumberId).session(session);
        const poItems = await FormItem.find({ PONumber: PONumberId }).session(session).lean();

        for (const rule of globalRules) {
            const { field, comparisonType, ruleType, value } = rule;
            let isRulePassed = false;
            let val = value;
            if(comparisonType === 'Field'){
                if(po[value] !== undefined) val = po[value];
                else if (poItems[0][value] !== undefined){
                    if (summableFields.includes(value)) {
                        // ✅ Summing up specific numeric fields before checking
                        const totalValue = poItems.reduce((acc, item) => acc + (parseFloat(item[value]) || 0), 0);
                        val = totalValue;
                    }
                    else {
                        val = poItems[0][value];
                    }
                }  
            }

            // ✅ Step 1: Check in PO first
            if (po[field] !== undefined) {
                isRulePassed = evaluateCondition(po[field], ruleType, val, comparisonType, po);
            }

            // ✅ Step 2: If rule not passed yet, check PO Items
            if (!isRulePassed && poItems.length > 0) {
                if (summableFields.includes(field)) {
                    // ✅ Summing up specific numeric fields before checking
                    const totalValue = poItems.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
                    isRulePassed = evaluateCondition(totalValue, ruleType, val, comparisonType, po);
                } else {
                    // ✅ Check individual PO items one by one
                    for (const item of poItems) {
                        if (item[field] !== undefined) {
                            isRulePassed = evaluateCondition(item[field], ruleType, val, comparisonType, item);
                            if (isRulePassed) break; // Stop once one item passes
                        }
                    }
                }
            }

            // ✅ If rule is passed, fetch approval hierarchy
            if (isRulePassed) {
                const hierarchy = await getApprovalHierarchy(rule.field, rule.value,val,PONumberId);
                console.log('hierarchyssssss',hierarchy)

                matchedHierarchies=hierarchy;
                // if(matchedHierarchies.length === 0) {
                //     console.log(hierarchy)
                //     matchedHierarchies.push(...hierarchy)
                // }else {
                //     let levels = mergeHierarchies(matchedHierarchies,hierarchy);
                //     console.log('levels',hierarchy)
                //     matchedHierarchies=levels;
                // }
                
            }

            
        }

        if (matchedHierarchies.length == 0 ){
            const hierarchy = await defaultlevel();
            console.log('defaultssss',hierarchy)
            matchedHierarchies.push(...hierarchy);
        }

     console.log('.............................')

    // Save Approval Hierarchy
       
    await ApprovalHierarchy.create([{ PONumber: PONumberId, approval_hierarchy: matchedHierarchies }], { session });

    console.log("Approval Hierarchy Saved Successfully:", { PONumber: PONumberId, approval_hierarchy: matchedHierarchies });
            po.currentapprovallevel = matchedHierarchies[0];
            await po.save({ session });
        

    } catch (error) {
        console.error("Error in checkRulesAndSetHierarchy:", error.message);
    }
}


function evaluateCondition(fieldValue, ruleType, compareValue, comparisonType, data) {

        
        if (ruleType === "contains") {
            return String(fieldValue).includes(String(compareValue));
        } else if (ruleType === "not contains") {
            return !String(fieldValue).includes(String(compareValue));
        }    
        // ✅ Compare two fields from the same PO or PO Item
       else{
            return `${fieldValue} ${ruleType} ${compareValue}`
       }
  
}


async function getApprovalHierarchy(field,value,val,PONumberId){
        if(field === 'TotalPrice'){
            let app = await totalPrice(PONumberId,val);
            console.log('...........',app);
            return app;
        }

        if(field === 'OrderQuantity'){
            let app =  await quantitywise(PONumberId,val)
            console.log('...........',app);
            return app;
        }
        else {
            let app =  await defaultlevel();
            return app;
        };

        
}
 


async function mergeHierarchies(matched, result) {

    console.log('mergeHierarchies',matched,result)
    const departments = await Department.find({'lastlevel': { $ne: 0 }},"_id").lean();
    const hierarchyMap = {};

    const processEntry = (entry) => {
        const [depId, level] = entry.split(" ");
        const levelInt = parseInt(level, 10);

        if (!hierarchyMap[depId]) {
            hierarchyMap[depId] = new Set();
        }
        hierarchyMap[depId].add(levelInt);
    };

    // Process both arrays
    matched.forEach(processEntry);
    result.forEach(processEntry);

    // Convert to sorted array following department order
    const finalHierarchy = departments
        .filter(depId => hierarchyMap[depId]) // Only include existing depIds
        .flatMap(depId =>
            [...hierarchyMap[depId]]
                .sort((a, b) => a - b)
                .map(level => `${depId} ${level}`)
        );

    return finalHierarchy;
};

module.exports = {checkRulesAndSetHierarchy};