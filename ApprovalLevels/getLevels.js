const mongoose = require('mongoose');
const User = require('../models/user'); // Assuming User model is imported
const POItem = require('../models/formitems');
const Department = require('../models/department') // Assuming POItem model is imported

// Threshold values
const approvalLevel1Threshold = 500;
const approvalLevel2Threshold = 1000;

// Function to fetch distinct approval levels (Excludes approval level 0)
const getDistinctApprovalLevels = async () => {
  const approvalLevels = await User.aggregate([
    { $group: { _id: "$approval_level" } },
    { $sort: { _id: 1 } }
  ]);

  console.log('getDistinctApprovalLevels', approvalLevels);

  return approvalLevels.reduce((acc, data) => {
    if (data._id !== 0) acc.push(data._id);
    return acc;
  }, []);
};

// Function to fetch levels for all approval levels in one query
const getAllApprovalLevelsWithDepartments = async () => {

    // Fetch all departments
    const departments = await Department.find({'lastlevel': { $ne: 0 }},"_id").lean();

    // Map over each department to fetch and group users
    const groupedUsers = await Promise.all(
      departments.map(async (department) => {
        // Fetch users belonging to the current department
        const users = await User.find({ "department.depId": department._id },'-_id department.level')
          .sort({ "department.level": 1 }) // Sort users by level within the department
          .lean();

        return {
          depId: department._id, // Department ID
          users // Users grouped under the department, sorted by level
        };
      })
    );

    return groupedUsers;
v  
  };
  


// Function to determine the levels based on the PO total amount
const getLevels = async (PONumber) => {
  // Fetch POItems and calculate the total amount
  const poItems = await POItem.find({ PONumber });
  const totalAmount = poItems.reduce((sum, item) => sum + item.TotalPrice, 0);

  // Fetch all approval levels and their associated levels dynamically
  const approvalLevelsData = await getAllApprovalLevelsWithDepartments();

  console.log('approvalLevelsData',approvalLevelsData)


  
  console.log('approvalLevelsData:', JSON.stringify(approvalLevelsData));

  
  let levelsToInclude = [];

  // For each approval level, determine which levels to include based on the threshold
   approvalLevelsData.forEach((data, index) => {
    const levels = data.users;

    // Construct the full level string "department level"
    const fullLevels = levels.map((app) => `${data.depId} ${app.department.level}`);
    console.log('Full Levels:', fullLevels);

    // Determine the levels to include based on the threshold
    if (totalAmount <= approvalLevel1Threshold) {
      // Threshold <= 500: Only Level 1 for each approval level
      levelsToInclude.push(fullLevels[0]); // Only push the first level (e.g., "HR 1")
    }

    else if (totalAmount > approvalLevel1Threshold && totalAmount <= approvalLevel2Threshold) {
       // Include levels dynamically based on department index
    if (index === 0) {
      // First department: Include 2 levels
      levelsToInclude.push(...fullLevels.slice(0, 2));
    } else if (index === 1) {
      // Second department: Include 2 levels
      levelsToInclude.push(...fullLevels.slice(0, 2));
    } else if (index === 2) {
      // Third department: Include 3 levels
      levelsToInclude.push(...fullLevels.slice(0, 3));
    }
    else {
      // Threshold > 1000: All levels for all approval levels
      levelsToInclude.push(...fullLevels.slice(0, index-1));
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

module.exports = {getLevels,getAllApprovalLevelsWithDepartments};

