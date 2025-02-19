
const POItem = require('../models/formitems');
const {getAllApprovalLevelsWithDepartments} = require('./getLevels')



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
    const approvallevel = await getAllApprovalLevelsWithDepartments();

    let defaultLevels=[];

    approvallevel.forEach((data,index)=>{
        const level = data.users;
        const app_level = level.map((app) => `${data.depId} ${app.department.level}`);
        defaultLevels.push(...app_level);
    });
console.log('default',defaultLevels)
    return defaultLevels;
}

module.exports = {quantitywise,defaultlevel,totalPrice,custom}