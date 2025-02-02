const Customapproval = require('../models/customapproval');
const Department = require('../models/department');

const customapproval = async (PONumberId, session = null) => {
  try {
    // ✅ Fetch the custom approval document using session
    const approvalQuery = Customapproval.findOne({ PONumber: PONumberId });
    if (session) approvalQuery.session(session); // ✅ Include session if provided
    const approvalDocument = await approvalQuery.lean();

    if (!approvalDocument) {
      throw new Error('Custom approval record not found');
    }

    const result = [];

    // ✅ Iterate over the stored approval in its original order
    for (const approvalEntry of approvalDocument.approval) {
      for (let i = 1; i <= approvalEntry.lastlevel; i++) {
        result.push(`${approvalEntry.departmentId} ${i}`);
      }
    }

    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Error in customapproval function:', error);
    throw error;
  }
};

module.exports = customapproval;
