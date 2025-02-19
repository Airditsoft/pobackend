const FormDetails = require('../models/formdetails');
const FormItem = require('../models/formitems');
const GlobalRules = require('../models/globalrule');
const {defaultlevel} = require('../ApprovalLevels/approvalrules')



async function checkRulesAndSetHierarchy(PONumberId, session = null) {
    try{

        let matchedHierarchies = [];
        // ✅ Fetch all Global Rules
        const globalRules = await GlobalRules.find().session(session).lean();
        if(!globalRules){
            const hierarchy = await defaultlevel();
            matchedHierarchies.push(...hierarchy);
            return;
        }

         // ✅ Fetch PO and Items
                const po = await FormDetails.findById(PONumberId).session(session);
                const poItems = await FormItem.find({ PONumber: PONumberId }).session(session).lean();
        

        //checking the rules 
        for (const rule of globalRules) {
            const { field, comparisonType, ruleType, value , approval_hierarchy } = rule;
            let isRulePassed = false;
            let val;
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
                isRulePassed = evaluateCondition(po[field], ruleType, value, comparisonType, po);
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

    }catch{

    }
}