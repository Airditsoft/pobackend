require('dotenv').config();
const axios = require('axios');
const https = require('https');
const mongoose = require("mongoose");

// Imports
const User = require('../models/user');
const Form = require('../models/form');
const FormDetails = require('../models/formdetails');
const FormItem = require('../models/formitems');
const { parseODataDate } = require('../utils/parseddata');
const Status = require('../models/status');
const {checkRulesAndSetHierarchy} = require('../ApprovalLevels/checkRule')
const GlobalRules = require('../models/globalrule');
const DefaultRules = require('../models/defaultlevels');
const AlternateApproval = require('../models/alternateapproval');



//Sap Config
const SAP_API_BASE_URL_PO = process.env.SAP_API_BASE_URL_PO;
const SAP_API_BASE_URL_POITEM = process.env.SAP_API_BASE_URL_POITEM;
const SAP_USERNAME = process.env.SAP_USERNAME;
const SAP_PASSWORD = process.env.SAP_PASSWORD;

const authorization = 'Basic ' + Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64');


// // Function to save all PO data (PO Details & PO Items)
// const saveAllPOData = async (req, res) => {
//   try {
//     const httpsAgent = new https.Agent({ rejectUnauthorized: false });

//     // Fetch data from SAP API
//     const poDetailsResponse = await axios.get(SAP_API_BASE_URL_PO, { headers: { Authorization: authorization }, httpsAgent });
//     const poItemResponse = await axios.get(SAP_API_BASE_URL_POITEM, { headers: { Authorization: authorization }, httpsAgent });

//     if (!poDetailsResponse.data || !poItemResponse.data) {
//       return res.status(400).json({ message: "No PO Data found" });
//     }

//     // Transform `PO Details` data
//     const poDetails = poDetailsResponse.data.d.results.map((item) => ({
//       ...item,
//       CreatedOn: parseODataDate(item.CreatedOn),
//       Read: 0,
//       ApprovalStatus: item.Approval === "Pending" ? 201 : 202,
//     }));

//     // Transform `PO Items` data
//     const poItems = poItemResponse.data.d.results.map((item) => ({
//       ...item,
//       DeliveryDate: item.DeliveryDate ? parseODataDate(item.DeliveryDate) : null,
//     }));

//     // Fetch existing POs to avoid duplication
//     const existingPODetails = await PODetails.find(
//       { PONumber: { $in: poDetails.map((item) => item.PONumber) } },
//       { PONumber: 1 }
//     ).lean();

//     const existingPONumbers = new Set(existingPODetails.map((record) => record.PONumber));

//     // Filter new POs (those not in DB)
//     const newPODetails = poDetails.filter((item) => !existingPONumbers.has(item.PONumber));

//     let insertedPODetails = [];
//     if (newPODetails.length > 0) {
//       insertedPODetails = await PODetails.insertMany(newPODetails);
//     }

//     // Map PO Items to their respective PO ObjectId
//     const poItemsWithObjectId = poItems.map((item) => {
//       const podetail = insertedPODetails.find((podetail) => podetail.PONumber === item.PONumber);
//       if (podetail) {
//         item.PONumber = podetail._id;
//       }
//       return item;
//     });

//     // Fetch existing PO Items to avoid duplication
//     const existingPOItems = await POItem.find(
//       { PONumber: { $in: poItemsWithObjectId.map((item) => item.PONumber) } },
//       { PONumber: 1 }
//     ).lean();

//     const existingPOItemNumbers = new Set(existingPOItems.map((record) => record.PONumber));

//     // Filter new PO Items
//     const newPOItems = poItemsWithObjectId.filter((item) => !existingPOItemNumbers.has(item.PONumber));

//     if (newPOItems.length > 0) {
//       await POItem.insertMany(newPOItems);
//     }

//     // // 🟢 Apply approval levels dynamically for each PO
//     // for (let po of insertedPODetails) {
//     //   const existingApproval = await ApprovalHierarchy.findOne({ PONumber: po._id });
     
//     //   if (!existingApproval) {
//     //     await approvallevels(po._id);
//     //   }
//     // }

//     return res.status(200).json({
//       message: "POs saved and updated with approval levels",
//       savedPODetailsCount: newPODetails.length,
//       savedPOItemsCount: newPOItems.length,
//     });
//   } catch (error) {
//     console.error("Error saving PO Data:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };


// const getPOdetails = async (req, res) => {
//   try {
//     const { depId, level } = req.authInfo.department;
//     const appLevel = `${depId} ${level}`;

//     // Pagination and search parameters from query
//     const { page = 2, limit = 5, search = "" } = req.query; // Defaults to page 1 and limit 10
//     const skip = (page - 1) * limit;


//     // Fetch the pending status key from the Status collection
//     const pendingStatus = await Status.findOne({ key: 201 }, '-_id key').lean();
//     if (!pendingStatus) {
//       return res.status(400).json({ message: 'Pending status not configured', success: false });
//     }

//     // Fetch the first approval level's department
//     const department = await Department.findOne({ 'department.level': { $ne: 0 } }).sort().lean();
//     if (!department) {
//       return res.status(404).json({ message: 'No departments found for approval', success: false });
//     }

//     // Fetch users for the first approval level
//     const user = await User.findOne({
//       'department.depId': department._id,
//       'department.level': { $ne: 0 }, // Exclude level 0
//     })
//       .sort({ 'department.level': 1 }) // Sort by level ascending
//       .lean();

      

//     if (!user) {
//       return res.status(404).json({ message: 'No user found for approval', success: false });
//     }

//     // Build the base query for POs
//     const baseQuery = {
//       ApprovalStatus: pendingStatus.key, // Only pending status
//     };

//     // Handle approval level conditions
//     const firstApprovalLevel = `${user.department.depId} ${user.department.level}`;
//     if (appLevel) {
//       if (appLevel === firstApprovalLevel) {
//         baseQuery.$and = [
//           { $or: [{ currentapprovallevel: null }, { currentapprovallevel: appLevel }] },
//           { ApprovalStatus: pendingStatus.key },
//         ];
//       } else {
//         baseQuery.$and = [
//           { currentapprovallevel: appLevel },
//           { ApprovalStatus: pendingStatus.key },
//         ];
//       }
//     }
    
//     // Build dynamic search query for string fields, excluding specific fields
//     if (search && search.trim().replace(/[^a-zA-Z0-9]/g, "") !== "") {
//       const searchQuery = { $regex: search, $options: "i" }; // Case-insensitive regex
//       const excludedFields = ['ApprovalStatus', 'currentapprovallevel'];
//       const stringFields = Object.keys(PODetails.schema.paths).filter(
//         (field) => PODetails.schema.paths[field].instance === "String" && !excludedFields.includes(field)
//       );
    
//       baseQuery.$and.push({
//         $or: stringFields.map((field) => ({ [field]: searchQuery })),
//       });
//     }

//   console.log(JSON.stringify(baseQuery))
//     // Fetch paginated PO details
//     const poDetails = await PODetails.find(baseQuery, '-currentapprovallevel -__v')
//       .skip(skip)
//       .limit(Number(limit))
//       .lean();

//     if (!poDetails.length) {
//       return res.status(404).json({
//         message: `No POs found for approval by ${req.authInfo.name}`,
//         success: false,
//       });
//     }

//     // Fetch associated items for each PO
//     const poWithItems = await Promise.all(
//       poDetails.map(async (po) => {
//         const items = await POItem.find({ PONumber: po._id }, '-PONumber -__v').lean();
//         return { ...po, items };
//       })
//     );



//     // Total count for pagination
//     const totalCount = await PODetails.countDocuments(baseQuery);

//     return res.status(200).json({
//       data: {
//         poWithItems, // Details of POs with items
//         currentPage: Number(page),
//         totalCount,
//         totalPages: Math.ceil(totalCount / limit),
//       },
//       success: true,
//     });
//   } catch (error) {
//     console.error('Error fetching PO details with items:', error.message);
//     return res.status(500).json({ message: 'An error occurred', success: false });
//   }
// };

// const saveAllPOData = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const httpsAgent = new https.Agent({ rejectUnauthorized: false });

//     // ✅ Step 1: Fetch data from SAP API
//     const [poDetailsResponse, poItemResponse] = await Promise.all([
//       axios.get(SAP_API_BASE_URL_PO, { headers: { Authorization: authorization }, httpsAgent }),
//       axios.get(SAP_API_BASE_URL_POITEM, { headers: { Authorization: authorization }, httpsAgent })
//     ]);
//     console.log('came1')

//     if (!poDetailsResponse.data || !poItemResponse.data) {
//       return res.status(400).json({ message: "No PO Data found" });
//     }
//     console.log('came2')
//     // ✅ Step 2: Check if a Form with type "PO" exists, if not create one
//     let existingForm = await Form.findOne({ type: "po" }).session(session);
//     if (!existingForm) {
//       existingForm = (await Form.create([{ type: "po" }], { session }))[0];
//     }
//     console.log('came3')
//     // ✅ Step 3: Transform PO Details & Items
//     const poDetails = poDetailsResponse.data.d.results.map((item) => ({
//       formId: existingForm._id,
//       ...item,
//       CreatedOn: parseODataDate(item.CreatedOn),
//       Read: 0,
//       ApprovalStatus: item.Approval === "Pending" ? 201 : 202,
//     }));
//     console.log('came3')
//     const poItems = poItemResponse.data.d.results.map((item) => ({
//       formId: existingForm._id,
//       ...item,
//       DeliveryDate: item.DeliveryDate ? parseODataDate(item.DeliveryDate) : null,
//     }));
//     console.log('came4')
//     // ✅ Step 4: Fetch existing PO & PO Items in one query per collection
//     const [existingPODetails, existingPOItems] = await Promise.all([
//       FormDetails.find({ PONumber: { $in: poDetails.map(item => item.PONumber) } }, { PONumber: 1 })
//         .session(session).lean(),
//       FormItem.find({ PONumber: { $in: poItems.map(item => item.PONumber) } }, { PONumber: 1 })
//         .session(session).lean()
//     ]);

//     const existingPONumbers = new Set(existingPODetails.map(record => record.PONumber));
//     const existingPOItemNumbers = new Set(existingPOItems.map(record => record.PONumber));
//     console.log('came5')
//     // ✅ Step 5: Filter & Save New PO Details
//     const newPODetails = poDetails.filter(item => !existingPONumbers.has(item.PONumber));
//     let insertedPODetails = [];
//     if (newPODetails.length > 0) {
//       insertedPODetails = await FormDetails.insertMany(newPODetails, { session });
//     }
//     console.log('came6')
//     // ✅ Step 6: Create a Map for Quick PONumber to ObjectId Mapping
//     const poDetailsMap = new Map(insertedPODetails.map(po => [po.PONumber, po._id]));

//     // ✅ Step 7: Filter & Save New PO Items (with correct PO ObjectId)
//     const newPOItems = poItems
//       .filter(item => !existingPOItemNumbers.has(item.PONumber))
//       .map(item => ({ ...item, PONumber: poDetailsMap.get(item.PONumber) }));

//     if (newPOItems.length > 0) {
//       await FormItem.insertMany(newPOItems, { session });
//     }
//     console.log('came7')
//     // ✅ Step 8: Bulk Check Global Rules & Set Approval Hierarchy for New POs
//     if (insertedPODetails.length > 0) {
//       await Promise.all(insertedPODetails.map(po => checkRulesAndSetHierarchy(po._id, session)));
//     }

//     await session.commitTransaction();
//     session.endSession();
//     console.log('came8')
//     return res.status(200).json({
//       message: "POs saved successfully and linked to Form",
//       savedPODetailsCount: newPODetails.length,
//       savedPOItemsCount: newPOItems.length,
//     });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error saving PO Data:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };



const saveAllPOData = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    // ✅ Step 1: Fetch data from SAP API
    const [poDetailsResponse, poItemResponse] = await Promise.all([
      axios.get(SAP_API_BASE_URL_PO, { headers: { Authorization: authorization }, httpsAgent }),
      axios.get(SAP_API_BASE_URL_POITEM, { headers: { Authorization: authorization }, httpsAgent }),
    ]);

    if (!poDetailsResponse.data || !poItemResponse.data) {
      return res.status(400).json({ message: "No PO Data found" });
    }

    // ✅ Step 2: Check if a Form with type "PO" exists, if not create one
    let existingForm = await Form.findOne({ type: "po" }).session(session);
    if (!existingForm) {
      existingForm = await Form.create([{ type: "po" }], { session });
    }

    // ✅ Step 3: Transform `PO Details` data and attach formId
    const poDetails = poDetailsResponse.data.d.results.map((item) => ({
      formId: existingForm._id,
      ...item,
      CreatedOn: parseODataDate(item.CreatedOn), // Convert date format
      Read: 0,
      ApprovalStatus: item.Approval === "Pending" ? 201 : 202,
    }));

    // ✅ Step 4: Transform `PO Items` data
    const poItems = poItemResponse.data.d.results.map((item) => ({
      formId: existingForm._id,
      ...item,
      DeliveryDate: item.DeliveryDate ? parseODataDate(item.DeliveryDate) : null,
    }));

    // ✅ Step 5: Fetch existing POs to avoid duplication
    const existingPODetails = await FormDetails.find(
      { PONumber: { $in: poDetails.map((item) => item.PONumber) } },
      { PONumber: 1 }
    )
      .session(session)
      .lean();

    const existingPONumbers = new Set(existingPODetails.map((record) => record.PONumber));

    // ✅ Step 6: Filter new POs (those not in DB) and save
    const newPODetails = poDetails.filter((item) => !existingPONumbers.has(item.PONumber));
    let insertedPODetails = [];
    if (newPODetails.length > 0) {
      insertedPODetails = await FormDetails.insertMany(newPODetails, { session });
    }


if(insertedPODetails.length === 0){
  await session.commitTransaction();
  session.endSession();

  return res.status(200).json({
    message: "NO New  Po Found",
    savedPODetailsCount: 0,
    savedPOItemsCount: 0,
  });
}
// {in this part error came bz if no inserted o s i gave doubt is whether they will send any items after that samepo we need to do }
    // ✅ Step 7: Map PO Items to their respective PO ObjectId-
    const poItemsWithObjectId = poItems.map((item) => {
      const podetail = insertedPODetails.find((detail) => detail.PONumber === item.PONumber);
      
  if (podetail) {
    item.PONumber = podetail._id;  // Correctly setting ObjectId
  }
      return item;
    });




    // ✅ Step 8: Fetch existing PO Items to avoid duplication
    const existingPOItems = await FormItem.find(
      { PONumber: { $in: poItemsWithObjectId.map((item) => item.PONumber) } },
      { PONumber: 1 }
    )
      .session(session)
      .lean();

    const existingPOItemNumbers = new Set(existingPOItems.map((record) => record.PONumber));
  
    // ✅ Step 9: Filter new PO Items and save
    const newPOItems = poItemsWithObjectId.filter((item) => !existingPOItemNumbers.has(item.PONumber));
    if (newPOItems.length > 0) {
      await FormItem.insertMany(newPOItems, { session });
    }

    // // ✅ Step 10: Check Global Rules AFTER saving POs and Items
    // const allPODetailsToCheck = insertedPODetails.length > 0 ? insertedPODetails : existingPODetails;

    
    for (const po of insertedPODetails) {
      await checkRulesAndSetHierarchy(po._id, session);
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "POs saved successfully and linked to Form",
      savedPODetailsCount: newPODetails.length,
      savedPOItemsCount: newPOItems.length,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error saving PO Data:", error.message);
    res.status(500).json({ message: error.message });
  }
};




// const saveAllPOData = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const httpsAgent = new https.Agent({ rejectUnauthorized: false });

//     // Fetch data from SAP API
//     const poDetailsResponse = await axios.get(SAP_API_BASE_URL_PO, { headers: { Authorization: authorization }, httpsAgent });
//     const poItemResponse = await axios.get(SAP_API_BASE_URL_POITEM, { headers: { Authorization: authorization }, httpsAgent });

//     if (!poDetailsResponse.data || !poItemResponse.data) {
//       return res.status(400).json({ message: "No PO Data found" });
//     }

//     // ✅ Step 1: Check if a Form with type "PO" exists, if not create one
//     let existingForm = await Form.findOne({ type: "po" }).session(session);
//     if (!existingForm) {
//       existingForm = await Form.create([{ type: "po" }], { session });
//     }

//     // ✅ Step 2: Transform `PO Details` data and attach formId
//     const poDetails = poDetailsResponse.data.d.results.map((item) => ({
//       formId: existingForm._id,
//       ...item,
//       CreatedOn: parseODataDate(item.CreatedOn),
//       Read: 0,
//       ApprovalStatus: item.Approval === "Pending" ? 201 : 202,
//     }));

//     // ✅ Step 3: Transform `PO Items` data
//     const poItems = poItemResponse.data.d.results.map((item) => ({
//       formId: existingForm._id,
//       ...item,
//       DeliveryDate: item.DeliveryDate ? parseODataDate(item.DeliveryDate) : null,
//     }));

//     // ✅ Step 4: Fetch existing POs to avoid duplication
//     const existingPODetails = await FormDetails.find(
//       { PONumber: { $in: poDetails.map((item) => item.PONumber) } },
//       { PONumber: 1 }
//     )
//       .session(session)
//       .lean();
//     const existingPONumbers = new Set(existingPODetails.map((record) => record.PONumber));

//     // ✅ Step 5: Filter new POs (those not in DB) and save
//     const newPODetails = poDetails.filter((item) => !existingPONumbers.has(item.PONumber));

//     let insertedPODetails = [];
//     if (newPODetails.length > 0) {
//       insertedPODetails = await FormDetails.insertMany(newPODetails, { session });
//     }

//     // ✅ Step 6: Map PO Items to their respective PO ObjectId
//     const poItemsWithObjectId = poItems.map((item) => {
//       const podetail = insertedPODetails.find((podetail) => podetail.PONumber === item.PONumber);
//       if (podetail) {
//         item.PONumber = podetail._id;
//       }
//       return item;
//     });

//     // ✅ Step 7: Fetch existing PO Items to avoid duplication
//     const existingPOItems = await FormItem.find(
//       { PONumber: { $in: poItemsWithObjectId.map((item) => item.PONumber) } },
//       { PONumber: 1 }
//     )
//       .session(session)
//       .lean();
//     const existingPOItemNumbers = new Set(existingPOItems.map((record) => record.PONumber));

//     // ✅ Step 8: Filter new PO Items and save
//     const newPOItems = poItemsWithObjectId.filter((item) => !existingPOItemNumbers.has(item.PONumber));

//     if (newPOItems.length > 0) {
//       await FormItem.insertMany(newPOItems, { session });
//     }

//     // ✅ Step 9: Check Global Rules AFTER saving POs and Items
//     for (const po of insertedPODetails) {
//       await checkRulesAndSetHierarchy(po._id, session);
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       message: "POs saved successfully and linked to Form",
//       savedPODetailsCount: newPODetails.length,
//       savedPOItemsCount: newPOItems.length,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error saving PO Data:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };




// const getPOdetails = async (req, res) => {
//   try {
//     const { depId, level } = req.authInfo.department;
//     const appLevel = `${depId} ${level}`;
//     const { filter, sortBy, page = 1, limit = 10 } = req.query; // Default page to 1 and limit to 10 if not provided
//     const skip = (page - 1) * limit; // Calculate skip

//     console.log(filter, sortBy, `Page: ${page}`, `Limit: ${limit}`);

//     const pendingStatus = await Status.findOne({ key: 201 }, '-_id key').lean();
//     if (!pendingStatus) {
//       return res.status(400).json({ message: 'Pending status not configured', success: false });
//     }

//     console.log(appLevel);

//     let readFilter = {};
//     if (filter === "Unread") {
//       readFilter = { Read: 0 };
//     } else if (filter === "Read") {
//       readFilter = { Read: 1 };
//     }

//     let poDetails = [];

//     if (sortBy === "priority") {
//       poDetails = await FormDetails.aggregate([
//         {
//           $match: {
//             currentapprovallevel: appLevel,
//             ApprovalStatus: pendingStatus.key,
//             ...readFilter
//           }
//         },
//         {
//           $addFields: {
//             priorityValue: {
//               $switch: {
//                 branches: [
//                   { case: { $eq: ["$priority", "High"] }, then: 3 },
//                   { case: { $eq: ["$priority", "Medium"] }, then: 2 },
//                   { case: { $eq: ["$priority", "Low"] }, then: 1 }
//                 ],
//                 default: 0
//               }
//             }
//           }
//         },
//         { $sort: { priorityValue: -1 } },
//         { $skip: skip },
//         { $limit: +limit },
//         { $project: { priorityValue: 0 } }
//       ]);
//     } else { // sortBy "date" or default case
//       poDetails = await FormDetails.find({
//         currentapprovallevel: appLevel,
//         ApprovalStatus: pendingStatus.key,
//         ...readFilter
//       })
//       .sort({ CreatedOn: -1 })
//       .skip(skip)
//       .limit(+limit)
//       .lean();
//     }

//     const totalCount = await FormDetails.countDocuments({
//       currentapprovallevel: appLevel,
//       ApprovalStatus: pendingStatus.key,
//       ...readFilter
//     });

//     const Unread = await FormDetails.find({
//       currentapprovallevel: appLevel,
//       ApprovalStatus: pendingStatus.key,
//       Read: 0
//     }).countDocuments();  // Count read POs

//     console.log(Unread)

//     console.log(totalCount);

//     if (!poDetails || poDetails.length === 0) {
//       return res.status(200).json({
//         data: {
//           poWithItems: [],
//           poDetailsCount: 0,
//           isAdmin: false,
//           totalCount,
//           totalUnread: Unread,
//           totalPages: Math.ceil(totalCount / limit),
//         },
//         success: false,
//       });
//     }

//     const poWithItems = await Promise.all(
//       poDetails.map(async (po) => {
//         const items = await FormItem.find({ PONumber: po._id }, '-PONumber -__v').lean();
//         return { ...po, items };
//       })
//     );

//     return res.status(200).json({
//       data: {
//         poDetailsCount: poDetails.length,
//         poWithItems,
//         isAdmin: false,
//         totalCount,
//         totalUnread: Unread,
//         totalPages: Math.ceil(totalCount / limit),
//       },
//       success: true,
//     });
//   } catch (error) {
//     console.error('Error fetching PO details with items:', error.message);
//     return res.status(500).json({ message: 'An error occurred', success: false });
//   }
// };


const isTodayWithinRange = (fromDate, toDate) => {
  const today = new Date();
  const start = new Date(fromDate);
  const end = new Date(toDate);

  // Set the time component to 0 for all dates to ensure accurate comparison of dates only
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return today >= start && today <= end;
};

const getPOdetails = async (req, res) => {
  try {
    const { depId, level } = req.authInfo.department;
    const appLevel = `${depId} ${level}`;
    const { filter, sortBy, page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // Set today with no time component

    // Fetch alternate approver details, assuming it can return multiple entries
    const alternates = await AlternateApproval.find({
      alternateApprover: appLevel
    }).lean();

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

    // Build the base query, initially only including the logged-in user's approval level
    const baseQuery = {
      $or: [{ currentapprovallevel: appLevel }],
      ApprovalStatus: pendingStatus.key,
      ...readFilter,
    };
    console.log('alternates',alternates)

    // Iterate over each alternate and check if today's date is within their valid date range
    alternates.forEach(({ createdBy, fromDate, toDate }) => {
      console.log(createdBy)
      const start = new Date(fromDate);
      const end = new Date(toDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (today >= start && today <= end) {
        console.log('createdby',createdBy)
        baseQuery.$or.push({ currentapprovallevel: createdBy });
      }
    });

    // Add search functionality if search term is provided
    if (search && search.trim().replace(/[^a-zA-Z0-9]/g, "") !== "") {
      const searchQuery = { $regex: search, $options: "i" }; // Case-insensitive regex
      const excludedFields = ['ApprovalStatus', 'currentapprovallevel', 'Read', 'createdBy'];
      const stringFields = Object.keys(FormDetails.schema.paths).filter(
        field => FormDetails.schema.paths[field].instance === "String" && !excludedFields.includes(field)
      );

      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: stringFields.map(field => ({ [field]: searchQuery }))
      });
    }

    console.log(baseQuery)
    const sortMethod = sortBy === "priority" ? { priorityValue: -1 } : { CreatedOn: -1 };
    let queryOptions = { skip, limit: +limit, sort: sortMethod };

    const [poDetails, totalCount, Unread] = await Promise.all([
      FormDetails.find(baseQuery, null, queryOptions).lean(),
      FormDetails.countDocuments(baseQuery),
      FormDetails.countDocuments({...baseQuery, Read: 0})
    ]);

    if (!poDetails.length) {
      return res.status(200).json({
        data: {
          poWithItems: [],
          poDetailsCount: 0,
          isAdmin: false,
          totalCount,
          totalUnread: Unread,
          totalPages: Math.ceil(totalCount / limit),
        },
        success: false,
      });
    }

    const poWithItems = await Promise.all(
      poDetails.map(async (po) => {
        const items = await FormItem.find({ PONumber: po._id }, '-PONumber -__v').lean();
        return { ...po, items };
      })
    );

    return res.status(200).json({
      data: {
        poDetailsCount: poDetails.length,
        poWithItems,
        isAdmin: false,
        totalCount,
        totalUnread: Unread,
        totalPages: Math.ceil(totalCount / limit),
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching PO details with items:', error);
    return res.status(500).json({ message: 'An error occurred', success: false });
  }
};





    




const POdetail = async (req, res) => {
  const { PONumberId } = req.params; // Fetching PONumberId from request params

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch PO Details within the transaction
    const poDetails = await FormDetails.findById(PONumberId, "-currentapprovallevel -__v")
      .session(session)
      .lean();

    if (!poDetails) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "PO Details not found", success: false });
    }

    // Update the 'Read' field to 1 within the transaction
    await FormDetails.updateOne({ _id: PONumberId }, { $set: { Read: 1 } }).session(session);

    // Fetch associated PO Items in a single query within the transaction
    const poItems = await FormItem.find({ PONumber: PONumberId }, "-PONumber -_id -__v")
      .session(session)
      .lean();

    // Commit the transaction after all operations succeed
    await session.commitTransaction();
    session.endSession();

    // Return response with both PO Details and associated PO Items
    return res.status(200).json({
      success: true,
      data: {
        poDetails: { ...poDetails, Read: 1 }, // Ensure frontend gets updated value
        poItems,
      },
    });
  } catch (error) {
    // Rollback transaction in case of any failure
    await session.abortTransaction();
    session.endSession();

    console.error("Error fetching PO details:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching PO details",
    });
  }
};

const getAvailableFields = async (req, res) => {
  // try {
  //      // Fetch one record from each collection, excluding unnecessary fields
  //      const formDetailsSample = await FormDetails.findOne({}, { 
  //                                                                 _id: 0, 
  //                                                                 PONumber: 0, 
  //                                                                 formId: 0, 
  //                                                                 ApprovalStatus: 0,
  //                                                                 ReleasingStatus:0,
  //                                                                 approvaltype:0,
  //                                                                 Read:0,
  //                                                                 priority:0,
  //                                                                 currentapprovallevel:0,
  //                                                                  __v: 0 }).lean();
  //      const formItemsSample = await FormItem.findOne({}, { _id: 0, PONumber: 0, formId: 0, __v: 0 }).lean();

  //   // Extract keys from both collections
  //   const formDetailsFields = formDetailsSample ? Object.keys(formDetailsSample) : [];
  //   const formItemsFields = formItemsSample ? Object.keys(formItemsSample) : [];

  //   // Merge and remove duplicates
  //   const allFields = Array.from(new Set([...formDetailsFields, ...formItemsFields]));

  //   return res.status(200).json({ success: true, fields: allFields });
  // } catch (error) {
  //   console.error("Error fetching available fields:", error);
  //   res.status(500).json({ success: false, message: "Failed to fetch available fields" });
  // }



  try {
    // ✅ Function to extract fields and exclude unwanted ones
    const extractSchemaFields = (schema, excludedFields) => {
      let fields = [];
      Object.keys(schema.paths).forEach((key) => {
        if (!excludedFields.includes(key)) {
          const fieldType = schema.paths[key].instance; // Get data type
          fields.push({ field: key, dataType: fieldType });
        }
      });
      return fields;
    };

    // ❌ Fields to exclude from FormDetails
    const formDetailsExcludedFields = [
      "_id", "PONumber", "formId", "ApprovalStatus", "ReleasingStatus", "approvaltype", 
      "Read", "priority","Currency", "currentapprovallevel", "__v"
    ];

   

    // ✅ Extract fields while excluding unwanted fields

    const poDetailFields = extractSchemaFields(FormDetails.schema, formDetailsExcludedFields);
    


    // // ✅ Merge fields from both schemas
    // const allFields = [...poItemFields, ...poDetailFields];

    res.status(200).json({
      success: true,
      fields: poDetailFields,
    });
  } catch (error) {
    console.error("Error fetching fields:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const approvalCycle = async (req, res) => {
  const { ruleID } = req.params;
  const { type } = req.query;

  try {
    // Fetch the form based on the type for PR or anything comes for future use 
    const form = await Form.findOne({ type}).lean();
    console.log(form);
    if (!form) {
      return res.status(404).json({ message: "Form not found", success: false });
    }

    // Fetch the global rules based on the ruleID
      const rules = await GlobalRules.findById(ruleID).lean();
   
console.log(rules);
    if (!rules) {
      return res.status(404).json({ message: "Rules not found", success: false });
    }

    // Map over approvalCycle to fetch user details and extract only the name
    const names = await Promise.all(
      rules.approval_hierarchy.map(async (lev) => {
        const [departmentId, level] = lev.split(" ");
        const user = await User.findOne({
          "department.depId": departmentId,
          "department.level": level,
        });

        // Return only the name of the user
        return user ? user.name : null;
      })
    );

    // Filter out any null values in case some users were not found
    const filteredNames = names.filter((name) => name !== null);

    return res.status(200).json({
      approvalCycle: filteredNames,
      success: true,
    });
  } catch (error) {
    console.error("Error Fetching approval cycle:", error.message);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};


const defaultCycle = async (req, res) => {
  const { type } = req.query;

  try {
    // Fetch the form based on the type
    const form = await Form.findOne({ type }).lean();

    if (!form) {
      return res.status(404).json({ message: "Form not found", success: false });
    }
    console.log("Form:", form);
    console.log("Form ID:", form._id);

    // Fetch the default approval cycle for the form
    const defaultCycle = await DefaultRules.findOne({ formID: form._id }).lean();
    console.log("Default Cycle:", defaultCycle);

    if (!defaultCycle) {
      return res.status(404).json({ message: "Default cycle not set! Please set it.", success: false });
    }

    // Map over approval_hierarchy to fetch user details and extract only the name
    const names = await Promise.all(
      defaultCycle.approval_hierarchy.map(async (lev) => {
        const [departmentId, level] = lev.split(" ");
        const user = await User.findOne({
          "department.depId": departmentId,
          "department.level": level,
        });

        // Return only the name of the user
        return user ? user.name : null;
      })
    );

    // Filter out any null values in case some users were not found
    const filteredNames = names.filter((name) => name !== null);

    return res.status(200).json({
      approvalCycle: filteredNames,
      success: true,
    });
  } catch (error) {
    console.error("Error Fetching default approval cycle:", error.message);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};




module.exports = {
  saveAllPOData,
  getPOdetails,
  POdetail,
  getAvailableFields,
  approvalCycle,
  defaultCycle
};
