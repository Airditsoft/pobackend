const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const PODetails = require('../models/formdetails');
const User = require('../models/user');
const Approval = require('../models/approval');
const POItem = require('../models/formitems');
const Status = require('../models/status');
const {approvalSchema} = require('../validation/validator');
const Attachment = require('../models/attachment');
const {mail} = require('../utils/email');
const ApprovalHierarchy = require('../models/approvalhierarchy');
const AlternateApproval = require('../models/alternateapproval');
const {isTodayWithinRange}= require('../utils/parseddata');
const { v4: uuidv4 } = require("uuid"); // Import uuid



// 453226

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

        const alternate = await AlternateApproval.findOne({createdBy:i})
        console.log('alternate',alternate)

        let withinRange =false;
        let alternateuser;
        let alternatemail;
        if(alternate){
          withinRange = isTodayWithinRange(alternate.fromDate,alternate.toDate);
        }
        if(withinRange) {
          const [departmentId, level] = alternate.alternateApprover.split(" ");
          const user = await User.findOne({
            "department.depId": departmentId,
            "department.level": level,
          });
          alternateuser = user.name;
          alternatemail = user.email;
        }
        console.log(alternate)

        if (user) {
          logs.push({
            username:withinRange ? alternateuser : user.name,
            email:withinRange ? alternatemail:user.email,
            status: "pending",
            alternateapprovercreatedby:withinRange ? user.name : null,
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
                status: i.action === "approve" ? "approved" : i.action === 'reject'? "rejected":i.action==='forward'?'forwarded':i.action==='alternate'?'alternate':'pending',
                comment: i.comment,
                createdAt: i.createdAt,
                approvercreatedby:i.approvercreatedby
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

  
         
             
        const alternate = await AlternateApproval.findOne({createdBy:approvalLevels[i]})
        console.log(alternate)
        let withinRange =false;
        let alternateuser;
        let alternatemail;
        if(alternate){
          withinRange = isTodayWithinRange(alternate.fromDate,alternate.toDate);
        }
        if(withinRange) {
          const [departmentId, level] = alternate.alternateApprover.split(" ");
          const user = await User.findOne({
            "department.depId": departmentId,
            "department.level": level,
          });
          alternateuser = user.name;
          alternatemail = user.email;
        }
        console.log(alternate)

        if (user) {
          logs.push({
            username:withinRange ? alternateuser : user.name,
            email:withinRange ? alternatemail:user.email,
            status: "pending",
            alternateapprovercreatedby:withinRange ? user.name : null,
            comment: null,
            createdAt: null,
          });
        }
          
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
    let app_level = `${req.authInfo.department.depId} ${req.authInfo.department.level}`;
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
    const alternates = await AlternateApproval.findOne({
                      alternateApprover: app_level,
                      createdBy:PO.currentapprovallevel
    }).lean();

  let withinRange = false 
  if(alternates){
      const today = new Date();
      const start = new Date(alternates.fromDate);
      const end = new Date(alternates.toDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (today >= start && today <= end) {
        console.log('createdby',alternates.createdBy)
        withinRange=true;
      }
  }
      
console.log(alternates,withinRange)
    const [depid , lev ] = PO.currentapprovallevel.split(' ')

    const user = await User.findOne({'department.depId' : depid, 'department.level':lev}).select('name').lean();


      //check the approval level correctly matched or not .
        if (withinRange ? 
          PO.currentapprovallevel!== alternates.createdAt && app_level !== alternates.alternateApprover :
           PO.currentapprovallevel !== app_level) {
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
      approvercreatedby:PO.currentapprovallevel === app_level ?  'null' : user.name,
      comment: comment || null,
      action,
      createdAt: new Date(),
    };

    console.log(approvalEntry)
   
    // Handle "approve" action
    let userNotification;
    if (action === "approve") {
      const currentLevel = withinRange ? alternates.createdBy : app_level;
      if (approvalLevels.indexOf(currentLevel) === approvalLevels.length - 1) {
        PO.ApprovalStatus = approvedStatus.key;
        PO.currentapprovallevel = null;
      } else {
        const nextLevel = approvalLevels[approvalLevels.indexOf(currentLevel) + 1];
        console.log(nextLevel)
        PO.currentapprovallevel = nextLevel;
        console.log('NextLevel:', nextLevel);
        userNotification=nextLevel;
      }
      await PO.save({ session });

    }

    // Handle "reject" action
    if (action === "reject") {
      const currentLevel = withinRange ? alternates.createdBy : app_level;
      if (approvalLevels.indexOf(app_level) === 0) {
        PO.ApprovalStatus = rejectedStatus.key;
        PO.currentapprovallevel = null;
      } else {
        const prevLevel = approvalLevels[approvalLevels.indexOf(currentLevel) - 1];
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
 
    const user = await User.findOne({
                    'department.depId': depId,
                    'department.level':lev
                });
                console.log('User:', user);

    // mail(user,PO);//runasynchronously
    
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




const sapLogs = async (req, res) => {
  const { PONumber } = req.params;
 
  try {
    const PO = await PODetails.findOne({PONumber});
    if (!PO) {
      return res.status(404).json({ message: "PO not found", success: false }); 
    };
    
   

    const status = await Status.find({ key: PO.ApprovalStatus }, "status").lean();
    const POStatus = status[0].status;


    const appr = await ApprovalHierarchy.findOne({ PONumber: PO._id })
                              .select('approval_hierarchy')
                              console.log(appr)
                              
    const approvalLevels = appr.approval_hierarchy;

    

    const logs = [];
    const approval = await Approval.findOne({ PONumber: PO._id });

    if (!approval) {
      // If approval is not present, assume all levels are pending
      for (let i of approvalLevels) {
        const [departmentId, level] = i.split(" ");
        const user = await User.findOne({
          "department.depId": departmentId,
          "department.level": level,
        });

        const alternate = await AlternateApproval.findOne({createdBy:i})

        let withinRange =false;
        let alternateuser;
        let alternatemail;
        if(alternate){
          withinRange = isTodayWithinRange(alternate.fromDate,alternate.toDate);
        }
        if(withinRange) {
          const [departmentId, level] = alternate.alternateApprover.split(" ");
          const user = await User.findOne({
            "department.depId": departmentId,
            "department.level": level,
          });
          alternateuser = user.name;
          alternatemail = user.email;
        }
        console.log(alternate)

        if (user) {
          logs.push({
            username: user.name,
            email:user.email,
            status: "pending",
            alternateapprover:withinRange ? alternateuser : null,
            alternatemail:withinRange ? alternatemail : null,
            comment: null,
            createdAt: null,
          });
        }
      }

      let sequenceCounter = 1;

      const transformedLogs = logs.reduce((acc, log) => {
        if (log.alternateapprover!==null && log.alternatemail!==null && status == 'pending') {
          // Add the original user
          acc.push({
            id: uuidv4(), // Generate a unique ID using uuid
            username: log.username,
            email: log.email,
            status: log.status,
            comment: log.comment,
            createdAt: log.createdAt,
            sequence: sequenceCounter,
          });
      
          // Add the alternate approver
          acc.push({
            id: uuidv4(), // Generate another unique ID
            username: log.alternateapprover,
            email: log.alternatemail,
            status: log.status,
            comment: log.comment,
            createdAt: log.createdAt,
            sequence: sequenceCounter,
          });
      
          sequenceCounter++; // Increment sequence for the next set
        } else {
          // Add the original user with incremented sequence
          acc.push({
            id: uuidv4(), // Generate a unique ID
            username: log.username,
            email: log.email,
            status: log.status,
            comment: log.comment,
            createdAt: log.createdAt,
            sequence: sequenceCounter,
          });
      
          sequenceCounter++; // Increment sequence for the next entry
        }
      
        return acc;
      }, []);
      
      console.log(transformedLogs);
      

      return res.status(200).json({PONumber, Approval:POStatus,transformedLogs, success: true });
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
                email:user.email,
                status: i.action === "approve" ? "approved" : i.action === 'reject'? "rejected":i.action==='forward'?'forwarded':i.action==='alternate'?'alternate':'pending',
                comment: i.comment,
                createdAt: i.createdAt,
                alternateapprover:i.approvercreatedby
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
  
         
             
        const alternate = await AlternateApproval.findOne({createdBy:approvalLevels[i]});
        console.log(i,user,alternate)

        let withinRange =false;
        let alternateuser;
        let alternatemail;
        if(alternate){
          withinRange = isTodayWithinRange(alternate.fromDate,alternate.toDate);
        }
        if(withinRange) {
          const [departmentId, level] = alternate.alternateApprover.split(" ");
          const user = await User.findOne({
            "department.depId": departmentId,
            "department.level": level,
          });
          alternateuser = user.name;
          alternatemail = user.email;
        }
        console.log(alternate)

        if (user) {
          logs.push({
            username: user.name,
            email:user.email,
            status: "pending",
            alternateapprover:withinRange ? alternateuser : null,
            alternatapproveremail:withinRange ? alternatemail : null,
            comment: null,
            createdAt: null,
          });
        }
      }
         }  


         let sequenceCounter = 1;

         const transformedLogs = logs.reduce((acc, log) => {
           if (log.alternateapprover!==null && log.alternatemail!==null && status == 'pending') {
             // Add the original user
             acc.push({
               id: uuidv4(), // Generate a unique ID using uuid
               username: log.username,
               email: log.email,
               status: log.status,
               comment: log.comment,
               createdAt: log.createdAt,
               sequence: sequenceCounter,
             });
         
             // Add the alternate approver
             acc.push({
               id: uuidv4(), // Generate another unique ID
               username: log.alternateapprover,
               email: log.alternatemail,
               status: log.status,
               comment: log.comment,
               createdAt: log.createdAt,
               sequence: sequenceCounter,
             });
         
             sequenceCounter++; // Increment sequence for the next set
           } else {
             // Add the original user with incremented sequence
             acc.push({
               id: uuidv4(), // Generate a unique ID
               username: log.username,
               email: log.email,
               status: log.status,
               comment: log.comment,
               createdAt: log.createdAt,
               sequence: sequenceCounter,
             });
         
             sequenceCounter++; // Increment sequence for the next entry
           }
         
           return acc;
         }, []);
         
         console.log(transformedLogs);


      
      return res.status(200).json({ PONumber,Approval:POStatus, transformedLogs, success: true });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};


const poActions = async (req, res) => {

  console.log(req.body)
  const payload = req.body;
  const { PONumberId } = req.params;
  console.log(payload,PONumberId)

  try {
    // Find the PO by ID
    const PO = await PODetails.findById(PONumberId);
    if (!PO) {
      return res.status(400).json({ message: 'PO Not Found', success: false });
    }

    const currentapprovallevel = `${req.authInfo.department.depId} ${req.authInfo.department.level}`;
    console.log('current',currentapprovallevel)
    let alternate ;
    if(PO.currentapprovallevel !== currentapprovallevel){
      alternate = await AlternateApproval.findOne({createdBy:PO.currentapprovallevel});
      if(!alternate){
        return res.status(404).json({message:'Cant forward Try again',success:false})
      }
    }

    

    let withinRange =false;
    let alternateuser;
    let alternatemail;
    if(alternate){
      withinRange = isTodayWithinRange(alternate.fromDate,alternate.toDate);
    }
    if(withinRange) {
      const [departmentId, level] = alternate.createdBy.split(" ");
      const user = await User.findOne({
        "department.depId": departmentId,
        "department.level": level,
      });
      console.log('user',user)
      alternateuser = user.name;
      alternatemail = user.email;
    }
    console.log(alternate,withinRange)

    // Find the approval hierarchy for the PO
    const approval = await ApprovalHierarchy.findOne({ PONumber: PONumberId });
    if (!approval) {
      return res.status(400).json({ message: 'Approval not set. Check Again', success: false });
    }

    // Find the user by name
    const user = await User.findOne({ name: payload.name });
    if (!user) {
      return res.status(400).json({ message: `${payload.name} not found in users`, success: false });
    }


    // Get the current user's index in the approval hierarchy
    const index = approval.approval_hierarchy.indexOf(PO.currentapprovallevel);

    // Check if the new approver already exists in the hierarchy
    const existingApprover = approval.approval_hierarchy.includes(`${user.department.depId} ${user.department.level}`);
    let existingApproverIndex;
    if (existingApprover) {
      existingApproverIndex = approval.approval_hierarchy.indexOf(`${user.department.depId} ${user.department.level}`);
      if (existingApproverIndex === index) {
        return res.status(400).json({ message: `Denied! ${data.name} is already an approver.`, success: false });
      }
    }

    // Define the new approval level
    const approvalLevel = `${user.department.depId} ${user.department.level}`;

    // Remove the existing approver if they exist
    if (existingApprover) {
      approval.approval_hierarchy.splice(existingApproverIndex, 1);
    }

    // Add the new approver after the current user's index
    approval.approval_hierarchy.splice(index + 1, 0, approvalLevel);

    // Update the approval hierarchy in the database
    await approval.save();

    
    // Update the PO's current approval level
    PO.currentapprovallevel = approvalLevel;
    PO.Read = 0 ;
    await PO.save();

    
console.log(alternateuser)
   
    // Define the new approval action
    const newApprovalAction = {
      departmentId: req.authInfo.department.depId,
      level: req.authInfo.department.level,
      comment: null,
      action: payload.action,
      approvercreatedby : withinRange? alternateuser : null,
      createdAt: new Date(),
    };

    console.log('---------------------------->',alternateuser,newApprovalAction)

    // Update or create the Approval document
    const updatedApproval = await Approval.findOneAndUpdate(
      { PONumber: PONumberId }, // Query to find the document
      {
        $push: { approval_hierarchy: newApprovalAction }, // Push the new action
      },
      {
        upsert: true, // Create the document if it doesn't exist
        new: true, // Return the updated document
      }
    );

    // Return success response
    return res.status(200).json({ message: `${payload.action} updated successfully`, success: true });
  } catch (error) {
    console.error('Error in poActions:', error);
    return res.status(500).json({ message: 'Internal Server Error', success: false });
  }
};


const alternateAction = async (req, res) => {
  const payload = req.body;

  try {
      // Find the user by name
      const user = await User.findOne({ name: payload.name });
      if (!user) {
          return res.status(400).json({ message: `${payload.name} not found in users`, success: false });
      }

      // Define the new approval level
      const alternateApprover = `${user.department.depId} ${user.department.level}`;

      // Data to be updated or inserted
      const updateData = {
          $set: {
              alternateApprover,
              createdBy: `${req.authInfo.department.depId} ${req.authInfo.department.level}`,
              fromDate: payload.fromDate,
              toDate: payload.toDate
          }
      };

      // Update or create the Approval document
      const updatedApproval = await AlternateApproval.findOneAndUpdate(
          { createdBy: `${req.authInfo.department.depId} ${req.authInfo.department.level}` }, // Query to find the document
          updateData,
          {
              upsert: true, // Create the document if it doesn't exist
              new: true // Return the updated document
          }
      );

      // Return success response
      return res.status(200).json({ message: `Alternate approval updated successfully`, success: true });
  } catch (error) {
      console.error('Error in AlternateAction:', error);
      return res.status(500).json({ message: 'Internal Server Error', success: false });
  }
};


module.exports = { 
          
                    handleApprovalOrRejection,
                    getApprovalHistory,
                    getAnalytics,
                    getPOComments,
                    addComments,
                    showLogs,
                    sapLogs,
                    poActions,
                    alternateAction
                  
                  };






