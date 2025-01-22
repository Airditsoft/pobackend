const CustomApproval = require("../models/customapproval");
const customlevel = require('../ApprovalLevels/customLevels');
const POdetails = require('../models/podetails');


const customApproval = async (req, res) => {
    const { approval } = req.body;
    const { PONumberId } = req.params;
  
    try {
      const { level } = req.authInfo.department;

      
  
      // Check if user is admin (case-insensitive comparison)
      if (level !== 0) {
        return res.status(404).json({ message: 'Admin Only authorised', success: false });
      }
  
      // Find the PO by PONumber
      const PO = await POdetails.findOne({ _id: PONumberId });
      if (!PO) {
        return res.status(400).json({ 
          message: `PO not found`,
          success: false 
        });
      }
  
      if (PO.approvaltype === 1 || PO.currentapprovallevel !== null) {
        return res.status(400).json({ 
          message: PO.approvaltype === 1 ? `Custom approval already set` : `Cannot set custom approval`,
          success: false 
        });
      }
  
    console.log('camehere')
  
      // Create a custom approval record
      await CustomApproval.create({
        PONumber: PONumberId,
        approval,
      });


        // Get approval levels
        const approvalLevels = await customlevel(PONumberId);
        console.log('Approval Levels:', approvalLevels);
    
        // Set the first level in the PO's current approval level
        PO.currentapprovallevel = approvalLevels[0];
      
  
      // Update the PO's approvaltype to 'custom'
      PO.approvaltype = 1;
      await PO.save();
  
      return res.status(200).json({
        message: `Custom approval created successfully for PO`,
        success: true,
      });
    } catch (error) {
      console.error('Error during custom approval:', error);
      return res.status(500).json({
        message: 'An error occurred during the custom approval process',
        success: false,
        error: error.message,
      });
    }
  };
  
  module.exports = { customApproval };
  