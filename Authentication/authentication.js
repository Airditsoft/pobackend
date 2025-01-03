
const PODetails = require('../models/podetails');
const User = require('../models/user');


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
            { email: req.authInfo.email, 'approval_level.level': 0 }
        );
      


        if (isAdmin) {
            // Step 2: Fetch all PO details if user is admin
            const poDetails = await PODetails.find().select('-_id');
            return res.status(200).json({ podetails: poDetails, success: true });
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
  