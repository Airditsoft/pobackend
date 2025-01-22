const Customapproval = require('../models/customapproval');
const Department = require('../models/department');

const customapproval = async (PONumberId) => {
  try {
    // Fetch all departments (retrieve all department IDs and additional details if needed)
    const departments = await Department.find({ lastlevel: { $ne: 0 } }, '_id type lastlevel').lean();

    if (!departments || departments.length === 0) {
      throw new Error('No valid departments found');
    }

    // Fetch the custom approval document by PONumber
    const approvalDocument = await Customapproval.findOne({ PONumber: PONumberId });
    if (!approvalDocument) {
      throw new Error('Custom approval record not found');
    }

    const result = [];

    // Iterate over each department and find matches in the approval array
    for (const department of departments) {
      // Find the corresponding approval entry for this department
      const approvalEntry = approvalDocument.approval.find(
        (approval) => approval.departmentId.toString() === department._id.toString()
      );

      if (approvalEntry) {
        // Add levels for the matched department
        for (let i = 1; i <= approvalEntry.lastlevel; i++) {
          result.push(`${approvalEntry.departmentId} ${i}`);
        }
      }
    }

    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Error in customapproval function:', error);
    throw error; // Propagate the error to the calling function
  }
};

module.exports = customapproval;
