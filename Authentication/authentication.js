
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

            const { filter, sortBy, page = 1, limit = 10, search} = req.query; // Added search parameter
            const skip = (page - 1) * limit; // Calculate skip value
        
            console.log(filter, sortBy, `Page: ${page}`, `Limit: ${limit}`);
                // Fetch the pending status key from the Status collection
                const pendingStatus = await Status.findOne({ key: 201 }, '-_id key').lean();
                if (!pendingStatus) {
                  return res.status(400).json({ message: 'Pending status not configured', success: false });
                }
            
               
                   let readFilter = {};
                   if (filter === "Unread") {
                     readFilter = { Read: 0 };
                   } else if (filter === "Read") {
                     readFilter = { Read: 1 };
                   }
               
                   // Build the base query
                   const baseQuery = {
                     ApprovalStatus: pendingStatus.key,
                     ...readFilter,
                   };
               
                   // Add search functionality if search term is provided
                   if (search && search.trim().replace(/[^a-zA-Z0-9]/g, "") !== "") {
                     const searchQuery = { $regex: search, $options: "i" }; // Case-insensitive regex
                     const excludedFields = ['ApprovalStatus', 'currentapprovallevel', 'Read'];
                     const stringFields = Object.keys(PODetails.schema.paths).filter(
                       (field) => PODetails.schema.paths[field].instance === "String" && !excludedFields.includes(field)
                     );
               
                     baseQuery.$and = baseQuery.$and || [];
                     baseQuery.$and.push({
                       $or: stringFields.map((field) => ({ [field]: searchQuery })),
                     });
                   }
            
                let poDetails = [];
            
                
            
                 if (sortBy === "priority") {
                      poDetails = await PODetailsDetails.aggregate([
                        {
                          $match: baseQuery,
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
                        { $sort: { priorityValue: -1 } },
                        { $skip: skip },
                        { $limit: +limit },
                        { $project: { priorityValue: 0 } }
                      ]);
                    } else { // sortBy "date" or default case
                      poDetails = await PODetails.find(baseQuery)
                        .sort({ CreatedOn: -1 })
                        .skip(skip)
                        .limit(+limit)
                        .lean();
                    };
                 const totalCount = await PODetails.countDocuments(baseQuery);
                    
                    const Unread = await PODetails.find({
                      ApprovalStatus: pendingStatus.key,
                      Read: 0
                    }).countDocuments();  // Count unread POs
           
               if (!poDetails || poDetails.length === 0) {
                 return res.status(200).json({
                  data: {
                   poWithItems:[],
                   poDetailsCount: 0,
                   isAdmin: true,
                   success: false,
                   totalCount,
                   totalUnread: Unread,
                   totalPages: Math.ceil(totalCount / limit),
                  },
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
                    totalCount,
                    totalUnread: Unread,
                    totalPages: Math.ceil(totalCount / limit),
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
  