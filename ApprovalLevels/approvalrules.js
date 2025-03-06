
const POItem = require('../models/formitems');
const {getAllApprovalLevelsWithDepartments} = require('./getLevels');
const Form = require('../models/form');
const DefaultRules = require('../models/defaultlevels');



// // Threshold values
// const approvalLevel1Threshold = 500;
// const approvalLevel2Threshold = 1000;




const custom = async (PONumber) => {
  // Fetch POItems and calculate the total amount
   const poItems = await POItem.find({ PONumber });
   const totalAmount = poItems.reduce((sum, item) => sum + item.TotalPrice, 0);


 let costwiseLevels = [];
     // const approvalLevels = await getAllApprovalLevelsWithDepartments();
     let levelsToInclude = [];

// For each approval level, determine which levels to include based on the threshold
approvalLevels.forEach((data, index) => {
 const levels = data.users;

 // Construct the full level string "department level"
 const fullLevels = levels.map((app) => `${data.depId} ${app.department.level}`);


 // Determine the levels to include based on the threshold
 if (totalAmount <= approvalLevel1Threshold) {
   // Threshold <= 500: Only Level 1 for each approval level
   levelsToInclude.push(fullLevels[0]); // Only push the first level (e.g., "HR 1")
 }

 else if (totalAmount > approvalLevel1Threshold && totalAmount <= approvalLevel2Threshold) {
    // Include levels dynamically based on department index
 if (index === 0) {
   // First department: Include 1 levels
   levelsToInclude.push(...fullLevels.slice(0, 1));
 } else if (index === 1) {
   // Second department: Include 2 levels
   levelsToInclude.push(...fullLevels.slice(0, 2));
 } else if (index === 2) {
   // Third department: Include 3 levels
   levelsToInclude.push(...fullLevels.slice(0, 3));
 }
 else {
   // Threshold > 1000: All levels for all approval levels
   levelsToInclude.push(...fullLevels.slice(0, index+1));
 }
}

 else {
   // Threshold > 1000: All levels for all approval levels
   levelsToInclude.push(...fullLevels);
 }


});

console.log('levelsToInclude', levelsToInclude);
return levelsToInclude;
};





const totalPrice = async (PONumberId,val)  => {
  const approvalLevels = await getAllApprovalLevelsWithDepartments();
  let levelsToInclude = [];

  approvalLevels.forEach((data, index) => {
    const levels = data.users;

    // Construct the full level string "department level"
    const fullLevels = levels.map((app) => `${data.depId} ${app.department.level}`);
   

    if(val<=2000){
      if (index === 0) {
        // First department: Include 1 levels
        levelsToInclude.push(...fullLevels.slice(0, 1));
      } else if (index === 1) {
        // Second department: Include 2 levels
        levelsToInclude.push(...fullLevels.slice(0, 2));
      } else if (index === 2) {
        // Third department: Include 3 levels
        levelsToInclude.push(...fullLevels.slice(0, 3));
      }
      else {
        // Threshold > 1000: All levels for all approval levels
        levelsToInclude.push(...fullLevels.slice(0, index+1));
      }
    }

    else {

      if(index>=2){
        levelsToInclude.push(...fullLevels)
      }
      else{
        levelsToInclude.push(...fullLevels.slice(0, 1));
      }
    }


  });
  console.log('levelsToInclude',levelsToInclude)
  return levelsToInclude;
}



const quantitywise = async (PONumber,val) => {
  const approvalLevels = await getAllApprovalLevelsWithDepartments();
  let levelsToInclude = [];

  approvalLevels.forEach((data, index) => {
    const levels = data.users;

    // Construct the full level string "department level"
    const fullLevels = levels.map((app) => `${data.depId} ${app.department.level}`);
   

    if(val<=20){
      //Include 1 levels
        levelsToInclude.push(...fullLevels.slice(0, 1));
    }
      else {
        if(index>=1){
          levelsToInclude.push(...fullLevels)
        }
        else{
          levelsToInclude.push(...fullLevels.slice(0, 1));
        }
      }

  });
  console.log('Quantity',levelsToInclude)

  return levelsToInclude;
};


       

const defaultlevel = async () => {
  try {
    // Find all forms of type 'po'
    const form = await Form.findOne({ type: 'po' }).lean();
    console.log(form)

    // Check if forms were found
    if (!form) {
      throw new Error('No forms found');
    }

    let defaultLevels = [];

    // Iterate over each form to find the corresponding approval hierarchy
  
      const approvallevel = await DefaultRules.findOne({ formID: form._id }).lean();
      console.log(approvallevel)
      // console.log(approvallevel.approval_hierarchy)

      // Check if approval level was found for the form
      if (approvallevel && approvallevel.approval_hierarchy) {
        defaultLevels.push(...approvallevel.approval_hierarchy);
   
    }

    console.log('DefaultLevels:', defaultLevels);
    return defaultLevels;
  } catch (error) {
    console.error('Error in defaultlevel function:', error);
    throw error; // Re-throw the error to handle it in the calling function
  }
};

module.exports = {quantitywise,defaultlevel,totalPrice,custom}