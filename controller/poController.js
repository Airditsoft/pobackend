require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Imports
const PODetails = require('../models/podetails');
const POItem = require('../models/poitems');
const { parseODataDate } = require('../utils/parseddata');
const User = require('../models/user');
const Department = require('../models/department');
const Status = require('../models/status');




//Sap Config
const SAP_API_BASE_URL_PO = process.env.SAP_API_BASE_URL_PO;
const SAP_API_BASE_URL_POITEM = process.env.SAP_API_BASE_URL_POITEM;
const SAP_USERNAME = process.env.SAP_USERNAME;
const SAP_PASSWORD = process.env.SAP_PASSWORD;

const authorization = 'Basic ' + Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64');


// Function to save all PO data (PO Details & PO Items)
const saveAllPOData = async (req, res) => {
  try {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Fetch data from the `PO Details` API
    const poDetailsResponse = await axios.get(SAP_API_BASE_URL_PO, {
      headers: {
        Authorization: authorization,
      },
      httpsAgent,
    });

    // Fetch data from the `PO Item` API
    const poItemResponse = await axios.get(SAP_API_BASE_URL_POITEM, {
      headers: {
        Authorization: authorization,
      },
      httpsAgent,
    });

    // Check if both responses contain data
    if (!poDetailsResponse.data || !poItemResponse.data) {
      return res.status(400).json({ message: 'No PO Data found' });
    }

    // Transform `PO Details` data
    const poDetails = poDetailsResponse.data.d.results.map((item) => {
      const { __metadata, to_items, CreatedOn,Approval, ...filteredItem } = item;
      return {
        ...filteredItem,
        CreatedOn: parseODataDate(CreatedOn),
        ApprovalStatus: Approval === 'Pending' ? 201 : 202// Convert OData date format
      };
    });

    // Transform `PO Items` data
    const poItems = poItemResponse.data.d.results.map((item) => {
      const { __metadata, to_POHeader, DeliveryDate, ...filteredItem } = item;
      return {
        ...filteredItem,
        DeliveryDate: DeliveryDate ? parseODataDate(DeliveryDate) : null, // Set to null if DeliveryDate is missing or null
      };
    });

    // Save `PO Details` to MongoDB and get the inserted documents' ObjectIds
    const existingPODetails = await PODetails.find(
      { PONumber: { $in: poDetails.map((item) => item.PONumber) } },
      { PONumber: 1 }
    ).lean();
    const existingPODetailsNumbers = new Set(existingPODetails.map((record) => record.PONumber));
    const newPODetails = poDetails.filter((item) => !existingPODetailsNumbers.has(item.PONumber));

    let insertedPODetails = [];
    if (newPODetails.length > 0) {
      insertedPODetails = await PODetails.insertMany(newPODetails);
    }

    // Now we need to map the PONumber in POItems to the ObjectId from PODetails
    const poItemsWithObjectId = poItems.map((item) => {
      // Find the corresponding ObjectId for the PONumber
      const podetail = insertedPODetails.find((podetail) => podetail.PONumber === item.PONumber);
      if (podetail) {
        item.PONumber = podetail._id; // Set the PONumber as ObjectId
      } else {
        // If not found, log and skip or handle as needed
        console.error(`No PODetail found for PONumber: ${item.PONumber}`);
      }
      return item;
    });

    // Save `PO Items` to MongoDB
    const existingPOItems = await POItem.find(
      { PONumber: { $in: poItemsWithObjectId.map((item) => item.PONumber) } },
      { PONumber: 1 }
    ).lean();
    const existingPOItemNumbers = new Set(existingPOItems.map((record) => record.PONumber));
    const newPOItems = poItemsWithObjectId.filter((item) => !existingPOItemNumbers.has(item.PONumber));

    if (newPOItems.length > 0) {
      await POItem.insertMany(newPOItems);
    }

    // Send response
    return res.status(200).json({
      message: 'PO Details and PO Items fetched and saved successfully',
      savedPODetailsCount: newPODetails.length,
      savedPOItemsCount: newPOItems.length,
    });
  } catch (error) {
    console.error('Error saving PO Data:', error.message);
    res.status(500).json({ message: error.message });
  }
};








const getPOdetails = async (req, res) => {
  try {
    const { depId, level } = req.authInfo.department;
    const appLevel = `${depId} ${level}`;

    // Fetch the pending status key from the Status collection
    const pendingStatus = await Status.findOne({ key: 201 }, '-_id key').lean();
    if (!pendingStatus) {
      return res.status(400).json({ message: 'Pending status not configured', success: false });
    }

    // Fetch the first approval level's department
    const department = await Department.findOne({ 'department.level': { $ne: 0 } }).sort().lean();
    if (!department) {
      return res.status(404).json({ message: 'No departments found for approval', success: false });
    }

    // Fetch users for the first approval level
    const user = await User.findOne({
      'department.depId': department._id,
      'department.level': { $ne: 0 } // Exclude level 0
    })
      .sort({ 'department.level': 1 }) // Sort by level ascending
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'No user found for approval', success: false });
    }

    // Fetch POs based on approval level
    let poDetails;
    const firstApprovalLevel = `${user.department.depId} ${user.department.level}`;
    if (appLevel === firstApprovalLevel) {
      poDetails = await PODetails.find({
        currentapprovallevel: null,
        ApprovalStatus: pendingStatus.key, // Check against the pending status key
      }, '-currentapprovallevel -__v').lean();
    } else {
      poDetails = await PODetails.find({
        currentapprovallevel: appLevel,
        ApprovalStatus: pendingStatus.key, // Check against the pending status key
      }, '-currentapprovallevel -__v').lean();
    }

    if (!poDetails || poDetails.length === 0) {
      return res.status(404).json({
        message: `No POs found for approval by ${req.authInfo.name}`,
        success: false,
      });
    }

    // Fetch associated items for each PO and calculate item counts
    const poWithItems = await Promise.all(
      poDetails.map(async (po) => {
        const items = await POItem.find({ PONumber: po._id }, '-PONumber -__v').lean();
        return { ...po, items };
      })
    );



    return res.status(200).json({
      data: {
        poDetailsCount: poDetails.length, // Total number of POs
        poWithItems,                     // Details of POs with items
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching PO details with items:', error.message);
    return res.status(500).json({ message: 'An error occurred', success: false });
  }
};



// Function to fetch PO details with associated PO Items

const POdetail = async (req, res) => {
  const { PONumberId } = req.params; // Fetching PONumberId from request params

  try {
    // Fetch PO Details
    const poDetails = await PODetails.findById(PONumberId, '-currentapprovallevel -__v').lean();
    if (!poDetails) {
      return res.status(404).json({ message: 'PO Details not found', success: false });
    }

    // Fetch associated PO Items in a single query
    const poItems = await POItem.find({ PONumber: PONumberId }, '-PONumber -_id -__v').lean();

    // Return response with both PO Details and associated PO Items
    return res.status(200).json({
      success: true,
      data: {
        poDetails,
        poItems,
      },
    });
  } catch (error) {
    // Log and return error response
    console.error('Error fetching PO details:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching PO details',
    });
  }
};




module.exports = {
  saveAllPOData,
  getPOdetails,
  POdetail,
};
