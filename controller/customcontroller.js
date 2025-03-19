const mongoose = require("mongoose");
const User = require("../models/user");

const getLevels = require("../ApprovalLevels/getLevels");
const FormDetails = require("../models/formdetails");
const Department = require("../models/department");
const {mail} = require("../utils/email");

// const customApproval = async (req, res) => {
//     const { action, approval } = req.body;
//     const { PONumberId } = req.params;

//     console.log("Received Request:", { action, approval, PONumberId });

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { level } = req.authInfo.department;

//         // ✅ Ensure only Admins can perform this action
//         if (level !== 0) {
//             throw new Error("Admin Only Authorized");
//         }

//         // ✅ Find PO inside the transaction
//         const PO = await POdetails.findOne({ _id: PONumberId }).session(session);
//         if (!PO) {
//             throw new Error("PO not found");
//         }

//         // ✅ Ensure Approval is not already set
//         if (PO.approvaltype !== null || PO.currentapprovallevel !== null) {
//             throw new Error("Approval already set or not allowed");
//         }

//         // ✅ Validate `action` type early
//         if (!["custom", "default"].includes(action)) {
//             throw new Error("Invalid action type");
//         }

//         let approvalLevels;

//         if (action === "custom") {
//             console.log("Setting custom approval...");

//             // ✅ Batch Fetch All Departments in one Query
//             const departmentTypes = approval.map((a) => a.type);
//             const departmentMap = await Department.find({ type: { $in: departmentTypes } })
//                 .select("_id type")
//                 .lean();

//             // ✅ Create a map of { type -> _id }
//             const departmentIdMap = Object.fromEntries(
//                 departmentMap.map((d) => [d.type, d._id])
//             );

//             console.log("Department Map:", departmentIdMap);

//             // ✅ Construct approval body
//             const approvalBody = approval.map(({ type, lastlevel }) => {
//                 if (!departmentIdMap[type]) {
//                     throw new Error(`Department '${type}' not found`);
//                 }
//                 return {
//                     departmentId: departmentIdMap[type],
//                     lastlevel
//                 };
//             });

//             console.log("Final Approval Body:", JSON.stringify(approvalBody, null, 2));

//             // ✅ Insert Custom Approval (Ensure transaction is passed)
//             await CustomApproval.create([{ PONumber: PONumberId, approval: approvalBody }], { session });

//             // ✅ Fetch approval levels
//             approvalLevels = await customlevel(PONumberId);
//             PO.approvaltype = 1; // Custom Approval

//         } else {
//             console.log("Setting default approval...");

//             // ✅ Fetch default approval levels
//             approvalLevels = await getLevels(PONumberId);
//             PO.approvaltype = 0; // Default Approval
//         }

//         // ✅ Assign First Approval Level
//         PO.currentapprovallevel = approvalLevels[0];

//         // ✅ Save the PO Update in Transaction
//         await PO.save({ session });

//         // ✅ Commit the Transaction
//         await session.commitTransaction();

//         // ✅ Extract First Approval Level & Fetch User for Notification
//         const [depId, lev] = approvalLevels[0].split(' ');

//         const user = await User.findOne({
//             'department.depId': depId,
//             'department.level': lev
//         }).lean();

//         // ✅ Send Notification Email
//         mail(user, PO); // Run asynchronously

//         return res.status(200).json({
//             message: `Approval set to ${action} successfully for PO`,
//             success: true,
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         console.error("Error during approval:", error.message);

//         return res.status(500).json({
//             message: error.message || "An error occurred during the approval process",
//             success: false,
//         });

//     } finally {
//         session.endSession();
//     }
// };







const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ type: { $ne: "Admin" } }, "_id type lastlevel");

    if (!departments || departments.length === 0) {
      return res.status(404).json({ success: false, message: "No departments found" });
    }

    return res.status(200).json({ success: true,  departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const departmentaction = async (req, res) => {
    try {
        // Fetch all departments except Admin
        const departments = await Department.find({ type: { $ne: "Admin" } }, "_id type lastlevel");

        if (!departments || departments.length === 0) {
            return res.status(404).json({ success: false, message: "No departments found" });
        }

        // Initialize an array to hold the final response
        let response = [];

        // Iterate over each department
        for (let department of departments) {
            // Find users in the current department
            const users = await User.find({ 'department.depId': department._id })
                                   .populate('role', 'name') // Assuming you want to populate role details
                                   .select('name'); // Select only the name field

            // Extract user names
            const userNames = users.map(user => user.name);

            // Push the department and user names to the response array
            response.push({
                type: department.type,
                names: userNames
            });
        }

        // Send the response
        res.status(200).json({ success: true, response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = departmentaction;




module.exports = { getAllDepartments,departmentaction};
