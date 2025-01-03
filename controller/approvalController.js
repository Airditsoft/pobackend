const fs = require('fs');
const path = require('path');

const PODetails = require('../models/podetails');
const logger = require('../logger/logger');
const User = require('../models/user');
const Approval = require('../models/approval');
const POItem = require('../models/poitems');
const Status = require('../models/status');
const {approvalSchema} = require('../validation/validator');
const getLevels = require('../ApprovalLevels/getLevels');
const CustomLevels = require('../ApprovalLevels/customLevels');




const getApprovalHistory = async (req, res) => {


  try {
    // Fetch all approvals with populated PODetails
    const approvals = await Approval.find({})
      .populate({
        path: "PONumber",
        model: "Podetails", // Reference the PODetails model
        select: "PONumber", // Include desired fields from PODetails
      })
      .populate({
        path: "approval_hierarchy.departmentId",
        select: "type", // Include department type
      })
      .lean();

    if (!approvals || approvals.length === 0) {
      return res.status(404).json({ message: "No approval records found", success: false });
    }

    // Iterate over each approval record
    const allHistories = await Promise.all(
      approvals.map(async (approval) => {
        // Map through the approval hierarchy to fetch comments, actions, and user details
        const history = await Promise.all(
          approval.approval_hierarchy.map(async (approvalItem) => {
            // Fetch user based on departmentId and level
            const user = await User.findOne({
              "department.depId": approvalItem.departmentId._id,
              "department.level": approvalItem.level,
            })
              .select("name")
              .lean();

            return {
              comment: approvalItem.comment,
              action: approvalItem.action,
              createdAt: approvalItem.createdAt,
              department: approvalItem.departmentId.type, // Include department type
              level: approvalItem.level,
              username: user ? user.name : "Unknown User", // Include username or default to "Unknown User"
            };
          })
        );

        return {
          PONumber: approval.PONumber.PONumber, // Include PONumber details
          history,
        };
      })
    );

    res.status(200).json({
      message: "Approval histories fetched successfully",
      success: true,
      data: allHistories,
    });
  } catch (error) {
    console.error("Error fetching approval histories:", error.message);
    return res.status(500).json({ message: "An error occurred", success: false });
  }
};



const handleApprovalOrRejection = async (req, res) => {
  const { PONumberId } = req.params;
  const { action, comment } = req.body;

  try {
    // Validate the request body against the approval schema
    const { error } = approvalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation Error',
        details: error.details.map((err) => err.message.replace(/"/g, '')),
        success: false,
      });
    }
  } catch (err) {
    return res.status(500).json({
      message: 'An error occurred during validation',
      success: false,
    });
  }

  try {
    console.log(PONumberId);
    const app_level = `${req.authInfo.department.depId} ${req.authInfo.department.level}`;
    const PO = await PODetails.findOne({ _id: PONumberId });

    if (!PO) {
      return res.status(404).json({ message: 'PO not found', success: false });
    }

    // Fetch both pending and approved statuses in a single query
    const statuses = await Status.find({ key: { $in: [200, 202] } }, '-_id key').lean();
    const approvedStatus = statuses.find((status) => status.key === 200);
    const rejectedStatus = statuses.find((status) => status.key === 202);

    if (!rejectedStatus || !approvedStatus) {
      return res.status(400).json({
        message: 'Required statuses (Rejected or Approved) not configured',
        success: false,
      });
    }

    if (
      PO.ApprovalStatus === rejectedStatus.key ||
      PO.ApprovalStatus === approvedStatus.key
    ) {
      return res.status(400).json({
        message: `Permission denied. Cannot ${
          action === 'approve' ? 'Approve' : 'Reject'
        } PO ${PO.PONumber} as it is already ${
          PO.ApprovalStatus === approvedStatus.key ? 'Approved' : 'Rejected'
        }`,
        success: false,
      });
    }

    let approvalLevels;
    if (PO.approvaltype === 0) {
      approvalLevels = await getLevels(PONumberId);
    } else {
      approvalLevels = await CustomLevels(PONumberId);
    }

    // Check if current approval level matches or is null
    if (PO.currentapprovallevel === null) {
      if (approvalLevels[0] !== app_level) {
        return res.status(400).json({
          message: `Approval failed by ${req.authInfo.name} due to insufficient approval level`,
          success: false,
        });
      }
    } else {
      if (PO.currentapprovallevel !== app_level) {
        return res.status(400).json({
          message: `Approval failed by ${req.authInfo.name} due to insufficient approval level`,
          success: false,
        });
      }
    }

    // Update data for approval hierarchy
    const approvalEntry = {
      departmentId: req.authInfo.department.depId,
      level: req.authInfo.department.level,
      comment: comment || null,
      action,
      createdAt: new Date(),
    };

    // Handle "approve" action
    if (action === 'approve') {
      if (approvalLevels.indexOf(app_level) === approvalLevels.length - 1) {
        PO.ApprovalStatus = approvedStatus.key;
        PO.currentapprovallevel = null;
      } else {
        const nextLevel = approvalLevels[approvalLevels.indexOf(app_level) + 1];
        PO.currentapprovallevel = nextLevel;
      }
      await PO.save();
    }

    // Handle "reject" action
    if (action === 'reject') {
      if (approvalLevels.indexOf(app_level) === 0) {
        PO.ApprovalStatus = rejectedStatus.key;
        PO.currentapprovallevel = null;
      } else {
        const prevLevel = approvalLevels[approvalLevels.indexOf(app_level) - 1];
        PO.currentapprovallevel = prevLevel;
      }
      await PO.save();
    }

    // Check if the PO exists in the Approval table
    const poApproval = await Approval.findOne({ PONumber: PONumberId });

    if (!poApproval) {
      // Create a new approval document
      const newApprovalData = {
        PONumber: PONumberId,
        approval_hierarchy: [approvalEntry],
      };
      await Approval.create(newApprovalData);
    } else {
      // Update the existing approval document
      await Approval.findOneAndUpdate(
        { PONumber: PONumberId },
        { $push: { approval_hierarchy: approvalEntry } },
        { new: true }
      );
    }

    res.status(200).json({
      message: `${action === 'approve' ? 'Approved' : 'Rejected'} PO ${PO.PONumber} by ${req.authInfo.name}`,
      success: true,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'An error occurred', success: false });
  }
};





 

const getAnalytics = async (req, res) => {
  try {
    // Overall statistics
    const totalPOs = await PODetails.countDocuments();
    const totalItems = await POItem.countDocuments();

    const totalPOValueResult = await POItem.aggregate([
      { $group: { _id: null, totalValue: { $sum: "$TotalPrice" } } }
    ]);
    const totalPOValue = totalPOValueResult[0]?.totalValue || 0;

    const pendingPOs = await PODetails.countDocuments({ Approval: "Pending" });
    const approvedPOs = await PODetails.countDocuments({ Approval: "Approved" });
    const rejectedPOs = await PODetails.countDocuments({ Approval: "Rejected" });

    // Insights
    const topSuppliers = await PODetails.aggregate([
      { $group: { _id: "$SupplierName", totalValue: { $sum: "$TotalPrice" } } },
      { $sort: { totalValue: -1 } },
      { $limit: 5 }
    ]);

    const monthlyPOs = await PODetails.aggregate([
      {
        $group: {
          _id: { $month: "$CreatedOn" },
          poCount: { $sum: 1 },
          totalValue: { $sum: "$TotalPrice" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);


    // Item analytics
    const itemAnalytics = await POItem.aggregate([
      {
        $group: {
          _id: "$ItemDescription",
          totalValue: { $sum: "$TotalPrice" },
          totalQuantity: { $sum: "$OrderQuantity" }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 }
    ]);

    const uomDistribution = await POItem.aggregate([
      { $group: { _id: "$UOM", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Final response
    res.status(200).json({
      overallStatistics: {
        totalPOs,
        totalItems,
        totalPOValue,
        pendingPOs,
        approvedPOs,
        rejectedPOs
      },
      poInsights: {
        topSuppliers,
        monthlyPOs
      },
      itemAnalytics: {
        topItems: itemAnalytics,
        uomDistribution
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error.message);
    res.status(500).json({ message: "An error occurred", success: false });
  }
};


const getPOComments = async (req, res) => {
  const { PONumberId } = req.params;

  try {

    const PO = await PODetails.findOne({ _id: PONumberId });
    console.log(PO)
    if(!PO){
      return res.status(400).json({message:`PO not Found`,success:false})
    }
    // Find the approval document for the given PONumberId
    const approval = await Approval.findOne({ PONumber: PONumberId })
      .populate({
        path: "approval_hierarchy.departmentId",
        select: "type", // Include department type for additional information
      })
      .lean();

    if (!approval || approval.approval_hierarchy.length === 0) {
      return res.status(404).json({ message: "No Approval and comments found for the given PO", success: false });
    }

    // Map through the approval hierarchy to fetch comments, actions, and user details
    const commentsWithUser = await Promise.all(
      approval.approval_hierarchy.map(async (approvalItem) => {
        const user = await User.findOne({
          "department.depId": approvalItem.departmentId._id,
          "department.level": approvalItem.level,
        }).select("name").lean();

        return {
          comment: approvalItem.comment,
          action: approvalItem.action,
          createdAt: approvalItem.createdAt,
          department: approvalItem.departmentId.type, // Include department type
          level: approvalItem.level,
          username: user ? user.name : "Unknown User", // Include username or default to "Unknown User"
        };
      })
    );

    return res.status(200).json({
      message: "Comments fetched successfully",
      success: true,
      data: commentsWithUser,
    });
  } catch (error) {
    console.error("Error fetching comments:", error.message);
    return res.status(500).json({ message: "An error occurred", success: false });
  }
};




module.exports = { 
          
                    handleApprovalOrRejection,
                    getApprovalHistory,
                    getAnalytics,
                    getPOComments,
                  
                  };






