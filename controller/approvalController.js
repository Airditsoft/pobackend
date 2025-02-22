const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const PODetails = require('../models/formdetails');
const logger = require('../logger/logger');
const User = require('../models/user');
const Approval = require('../models/approval');
const POItem = require('../models/formitems');
const Status = require('../models/status');
const {approvalSchema} = require('../validation/validator');
const {getLevels} = require('../ApprovalLevels/getLevels');
const CustomLevels = require('../ApprovalLevels/customLevels');
const Attachment = require('../models/attachment');
const {mail} = require('../utils/email');
const ApprovalHierarchy = require('../models/approvalhierarchy');





const showLogs = async (req, res) => {
  const { PONumberId } = req.params;
 
  try {
    const PO = await PODetails.findOne({ _id: PONumberId });
    if (!PO) {
      return res.status(404).json({ message: "PO not found", success: false }); 
    } 

    const status = await Status.find({ key: PO.ApprovalStatus }, "status").lean();
    const POStatus = status[0].status;

   



    const appr = await ApprovalHierarchy.findOne({ PONumber: PONumberId })
                              .select('approval_hierarchy')
                              console.log(appr)
                              
    const approvalLevels = appr.approval_hierarchy;

    

    const logs = [];
    const approval = await Approval.findOne({ PONumber: PONumberId });

    if (!approval) {
      // If approval is not present, assume all levels are pending
      for (let i of approvalLevels) {
        const [departmentId, level] = i.split(" ");
        const user = await User.findOne({
          "department.depId": departmentId,
          "department.level": level,
        });

        if (user) {
          logs.push({
            username: user.name,
            status: "pending",
            comment: null,
            createdAt: null,
          });
        }
      }

      

      return res.status(200).json({ Approval:POStatus,logs, success: true });
    } else {

        // if(PO.ApprovalStatus === 202 && PO.currentapprovallevel === null){
        //   return res.status(200).json({ status: PO.ApprovalStatus, logs, success: true });
        // }

          for(let i of approval.approval_hierarchy){
            const user = await User.findOne({
              "department.depId": i.departmentId,
              "department.level": i.level,
            });
            if (user) {
              logs.push({
                username: user ? user.name : "Unknown User",
                status: i.action === "approve" ? "approved" : "rejected",
                comment: i.comment,
                createdAt: i.createdAt,
              });
            }

          }
          
            const currentLevel = approvalLevels.indexOf(PO.currentapprovallevel);
            
    if(currentLevel !== -1){
        // If approval is present, iterate through approval levels
        for (let i = currentLevel; i < approvalLevels.length; i++) {
          const [departmentId, level] = approvalLevels[i].split(" ");
          const user = await User.findOne({
            "department.depId": departmentId,
            "department.level": level,
          });
  
         
              // If not in the approval hierarchy, mark it as pending
              logs.push({
                username: user.name,
                status: "pending",
                comment: null,
                createdAt:null
              });
          
        }
      
         }  
      return res.status(200).json({ Approval:POStatus, logs, success: true });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};



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

  // Start a Mongoose session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate the request body
    const { error } = approvalSchema.validate(req.body);
    if (error) {
      await session.abortTransaction(); // Abort transaction on validation failure
      session.endSession();
      return res.status(400).json({
        message: "Validation Error",
        details: error.details.map((err) => err.message.replace(/"/g, "")),
        success: false,
      });
    }

    // // Fetch the PO details within the transaction
    const app_level = `${req.authInfo.department.depId} ${req.authInfo.department.level}`;
    const PO = await PODetails.findOne({ _id: PONumberId }).session(session);

    // if (!PO) {
    //   await session.abortTransaction();
    //   session.endSession();
    //   return res.status(404).json({ message: "PO not found", success: false });
    // }

    const appr = await ApprovalHierarchy.findOne({ PONumber: PONumberId })
                              .select('approval_hierarchy')
                              .session(session);

                  let approvalLevels =appr.approval_hierarchy;

    if(!approvalLevels){
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "ApprovalHierarchy not found", success: false });
    }

    // Update the 'Read' field to 1 inside the transaction
    await PODetails.updateOne({ _id: PONumberId }, { $set: { Read: 0 } }).session(session);

    // Fetch both pending and approved statuses in a single query
    const statuses = await Status.find({ key: { $in: [200, 202] } }, "-_id key").lean();
    const approvedStatus = statuses.find((status) => status.key === 200);
    const rejectedStatus = statuses.find((status) => status.key === 202);

    if (!rejectedStatus || !approvedStatus) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Required statuses (Rejected or Approved) not configured",
        success: false,
      });
    }

    // Check if PO is already Approved or Rejected
    if (PO.ApprovalStatus === rejectedStatus.key || PO.ApprovalStatus === approvedStatus.key) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Permission denied. Cannot ${
          action === "approve" ? "Approve" : "Reject"
        } PO ${PO.PONumber} as it is already ${
          PO.ApprovalStatus === approvedStatus.key ? "Approved" : "Rejected"
        }`,
        success: false,
      });
    }

    // let approvalLevels;
    // if (PO.approvaltype === 0) {
    //   approvalLevels = await getLevels(PONumberId);
    // } else {
    //   approvalLevels = await CustomLevels(PONumberId);
    // }

    // // Check if the user has sufficient approval level
    // if (PO.currentapprovallevel === null) {
    //   if (approvalLevels[0] !== app_level) {
    //     await session.abortTransaction();
    //     session.endSession();
    //     return res.status(400).json({
    //       message: `Approval failed by ${req.authInfo.name} due to insufficient approval level`,
    //       success: false,
    //     });
    //   }
    // } else {
    //   if (PO.currentapprovallevel !== app_level) {
    //     await session.abortTransaction();
    //     session.endSession();
    //     return res.status(400).json({
    //       message: `Approval failed by ${req.authInfo.name} due to insufficient approval level`,
    //       success: false,
    //     });
    //   }
    // }

      //check the approval level correctly matched or not .
        if (PO.currentapprovallevel !== app_level) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Approval failed by ${req.authInfo.name} due to insufficient approval level`,
          success: false,
        });
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
    let userNotification;
    if (action === "approve") {
      if (approvalLevels.indexOf(app_level) === approvalLevels.length - 1) {
        PO.ApprovalStatus = approvedStatus.key;
        PO.currentapprovallevel = null;
      } else {
        const nextLevel = approvalLevels[approvalLevels.indexOf(app_level) + 1];
        PO.currentapprovallevel = nextLevel;
        console.log('NextLevel:', nextLevel);
        userNotification=nextLevel;
      }
      await PO.save({ session });

    }

    // Handle "reject" action
    if (action === "reject") {
      if (approvalLevels.indexOf(app_level) === 0) {
        PO.ApprovalStatus = rejectedStatus.key;
        PO.currentapprovallevel = null;
      } else {
        const prevLevel = approvalLevels[approvalLevels.indexOf(app_level) - 1];
        PO.currentapprovallevel = prevLevel;
        console.log('PrevLevel:', prevLevel);
        userNotification=prevLevel;
        
      }
      await PO.save({ session });
    
    }

    // Check if the PO exists in the Approval table
    const poApproval = await Approval.findOne({ PONumber: PONumberId }).session(session);

    if (!poApproval) {
      // Create a new approval document
      const newApprovalData = {
        PONumber: PONumberId,
        approval_hierarchy: [approvalEntry],
      };
      await Approval.create([newApprovalData], { session });
    } else {
      // Update the existing approval document
      await Approval.findOneAndUpdate(
        { PONumber: PONumberId },
        { $push: { approval_hierarchy: approvalEntry } },
        { new: true, session }
      );
    }

    // ✅ Commit the transaction (Save all changes)
 
    console.log('UserNotification:', userNotification);

 if(userNotification){   const [depId, lev] = userNotification.split(' ');
    console.log('DepId:', depId);
    console.log('Level:', lev); 
    const user = await User.findOne({
                    'department.depId': depId,
                    'department.level':lev
                });
                console.log('User:', user);

    mail(user,PO);//runasynchronously
    
  }  
    
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: `${action === "approve" ? "Approved" : "Rejected"} PO ${PO.PONumber} by ${req.authInfo.name}`,
      success: true,
    });

  } catch (error) {
    // ❌ Rollback transaction if an error occurs
    await session.abortTransaction();
    session.endSession();

    console.error("Transaction Error:", error.message);
    res.status(500).json({ message: "An error occurred", success: false });
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
    const approval = await Attachment.findOne({ PONumber: PONumberId })
      .populate({
        path: "pocomments.departmentId",
        select: "type", // Include department type for additional information
      })
      .lean();
      console.log('approval',approval)

    if (!approval || approval.pocomments.length === 0) {
      return res.status(200).json({ 
        message: "No Approval and comments found for the given PO",
        data:[],
        success: true 
      });
    }

    // Map through the approval hierarchy to fetch comments, actions, and user details
    const commentsWithUser = await Promise.all(
      approval.pocomments.map(async (approvalItem) => {
        const user = await User.findOne({
          "department.depId": approvalItem.departmentId._id,
          "department.level": approvalItem.level,
        }).select("name").lean();

        return {
          comment: approvalItem.comment,
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


const addComments = async (req, res) => {
  const { comment} = req.body; // Accept `comment` and `action` from the request body
  const { PONumberId } = req.params; // Get the PONumber ID from the request params

  try {
    // Check if the PO exists
    const PO = await PODetails.findById(PONumberId);
    if (!PO) {
      return res.status(404).json({ message: `PO not found`, success: false });
    }

    // Add comment to the approval hierarchy
    const updatedApproval = await Attachment.findOneAndUpdate(
      { PONumber: PONumberId }, // Match the specific PONumber
      {
        $push: {
          pocomments: {
            departmentId: req.authInfo.department.depId, // Assuming you have department ID in `req.authInfo`
            level: req.authInfo.department.level,       // Assuming `level` is available in `req.authInfo`
            comment,                                   // Add the comment
            createdAt: new Date(),                      // Add the current date
          },
        },
      },
      { new: true, upsert: true } // Create a new document if it doesn't exist
    );

    if (!updatedApproval) {
      return res.status(400).json({ message: `Failed to add comment`, success: false });
    }

    return res.status(200).json({
      message: `Comment added successfully`,
      success: true,
      data: updatedApproval, // Return the updated approval hierarchy
    });
  } catch (error) {
    console.error(`Error adding comment: ${error.message}`);
    return res.status(500).json({
      message: `An error occurred while adding the comment`,
      success: false,
      error: error.message,
    });
  }
};





module.exports = { 
          
                    handleApprovalOrRejection,
                    getApprovalHistory,
                    getAnalytics,
                    getPOComments,
                    addComments,
                    showLogs
                  
                  };






