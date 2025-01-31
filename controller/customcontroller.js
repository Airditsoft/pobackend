const mongoose = require("mongoose");
const CustomApproval = require("../models/customapproval");
const customlevel = require("../ApprovalLevels/customLevels");
const POdetails = require("../models/podetails");

const customApproval = async (req, res) => {
    const { approval } = req.body;
    const { PONumberId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { level } = req.authInfo.department;

        // Check if user is admin (only level 0 is authorized)
        if (level !== 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: "Admin Only Authorized", success: false });
        }

        // Find the PO by PONumber within the transaction
        const PO = await POdetails.findOne({ _id: PONumberId }).session(session);
        if (!PO) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "PO not found", success: false });
        }

        // Check if Custom approval already set or not allowed
        if (PO.approvaltype === 1 || PO.currentapprovallevel !== null) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: PO.approvaltype === 1 ? "Custom approval already set" : "Cannot set custom approval",
                success: false,
            });
        }

        console.log("Setting custom approval...");

        // Create a custom approval record within the transaction
        await CustomApproval.create([{ PONumber: PONumberId, approval }], { session });

        // Get approval levels using custom logic
        const approvalLevels = await customlevel(PONumberId);
        console.log("Approval Levels:", approvalLevels);

        // Set the first level in the PO's current approval level
        PO.currentapprovallevel = approvalLevels[0];
        PO.approvaltype = 1; // Mark approval as custom
        await PO.save({ session });

        // Commit the transaction after all updates succeed
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Custom approval created successfully for PO",
            success: true,
        });
    } catch (error) {
        // Rollback transaction in case of any failure
        await session.abortTransaction();
        session.endSession();

        console.error("Error during custom approval:", error);
        return res.status(500).json({
            message: "An error occurred during the custom approval process",
            success: false,
            error: error.message,
        });
    }
};

module.exports = { customApproval };
