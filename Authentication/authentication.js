
const PODetails = require('../models/formdetails');
const User = require('../models/user');
const Status = require('../models/status');
const POItem = require('../models/formitems');


const  isAuthenticated = async(req, res, next) =>{

    if (!req.authInfo) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }

    // const existingUser= await User.findOne({
    //     email: { $regex: new RegExp(email, "i") },
    //   });
    

    // if (!existingUser) {
    //     logger.error("User not registered.");
    //     return res.status(400).json({ message: "Not Registered User" });
    //   }
    next();
  };



  const isAdmin = async (req, res, next) => {
    try {
      
        // Step 1: Fetch user with admin-level access
        const isAdmin = await User.findOne(
            { email: req.authInfo.email, 'department.level': 0 }
        );
      


        if (isAdmin) {
            // Step 2: Fetch PO details for admin-level access

              const { filter, sortBy } = req.query; // Get filter & sort options from query params
                console.log(filter,sortBy)
                // Fetch the pending status key from the Status collection
                const pendingStatus = await Status.findOne({ key: 201 }, '-_id key').lean();
                if (!pendingStatus) {
                  return res.status(400).json({ message: 'Pending status not configured', success: false });
                }
            
                // Build filter condition for Read status
                let readFilter = {};
                if (filter === "Unread") {
                  readFilter = { Read: 0 };
                } else if (filter === "Read") {
                  readFilter = { Read: 1 };
                }
            
                let poDetails = [];
            
                
            
                if (sortBy === "priority") {
                  // ✅ Sorting by Priority using Aggregation
                  poDetails = await PODetails.aggregate([
                    {
                      $match: {
                        ApprovalStatus: pendingStatus.key,
                        ...readFilter
                      }
                    },
                    {
                      $addFields: {
                        priorityValue: {
                          $switch: {
                            branches: [
                              { case: { $eq: ["$priority", "High"] }, then: 3 },
                              { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                              { case: { $eq: ["$priority", "Low"] }, then: 1 }
                            ],
                            default: 0
                          }
                        }
                      }
                    },
                    { $sort: { priorityValue: -1 } }, // Sort High → Medium → Low
                    { $project: { priorityValue: 0 } } // Remove extra field from output
                  ]);
                } else if (sortBy === "date") {
                  // ✅ Sorting by Date (Newest First)
                  poDetails = await PODetails.find({
                    $and: [
                      { ApprovalStatus: pendingStatus.key },
                      { ...readFilter }
                    ]
                  })
                  .sort({ CreatedOn: -1 }) // Sort Newest First
                  .lean();
                }
            
                if (!poDetails || poDetails.length === 0) {
                  return res.status(200).json({
                    poWithItems:[],
                    poDetailsCount: 0,
                    isAdmin: true,
                    success: false,
                  });
                }
            
                // Fetch associated items for each PO
                const poWithItems = await Promise.all(
                  poDetails.map(async (po) => {
                    const items = await POItem.find({ PONumber: po._id }, '-PONumber -__v').lean();
                    return { ...po, items };
                  })
                );
            
                return res.status(200).json({
                  data: {
                    poDetailsCount: poDetails.length,
                    poWithItems,
                    isAdmin:true,
                  },
                  success: true,
                });
        }

        // Step 3: Proceed to next middleware if not admin
        return next();
    } catch (error) {
        // Step 4: Log error details for debugging
        console.error('Error in isAdmin middleware:', error.message);
        console.error(error.stack);

        // Return error response
        return res.status(500).json({ message: 'An error occurred while fetching PO details.' });
    }
};

  
  module.exports={isAuthenticated,isAdmin}
  