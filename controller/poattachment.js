const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const Attachment = require('../models/attachment');
const PODetails = require('../models/podetails');
const { link } = require('joi');


// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING; // Azure connection string
const CONTAINER_NAME = 'poc-files'; //  container name



const uploadMultipleFiles = async (req, res) => {
    const { PONumber } = req.params;  // Get PONumber from the URL

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded', success: false });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    await containerClient.createIfNotExists();

    let uploadResponses = [];
    for (const file of req.files) {
        const blobName = `${Date.now()}-${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadFile(file.path);
        uploadResponses.push({
            blobName,
            url: blockBlobClient.url
        });
        fs.unlinkSync(file.path);
    }

    // Save to MongoDB
    try {
        const poAttachment = await Attachment.findOneAndUpdate(
            { PONumber},  // Make sure to convert PONumber to ObjectId
            { $push: { attachments: { $each: uploadResponses } } },
            { new: true, upsert: true }  // Create a new document if it doesn't exist
        );
        res.status(200).json({
            message: 'Files uploaded and saved successfully',
            success: true,
            data: uploadResponses
        });
    } catch (error) {
        console.error('Error saving file details to MongoDB:', error);
        res.status(500).json({
            message: 'An error occurred while saving file details',
            success: false,
            error: error.message
        });
    }
};


const getAttachment = async(req,res) => {
    const {PONumber} = req.params;


    try{
      //check PO
      const PO = await PODetails.findOne({ _id: PONumber }); 
      if (!PO) {
        return res.status(404).json({ message: 'PO not found', success: false });
      }

      //Attachment table 
      const poAttachment = await Attachment.findOne({PONumber});
      
      if(!poAttachment){
        return res.status(200).json({
          attachment:[],
          message:`No attachments Found for the Purchase Order`,
          success:true
        })
      }

      return res.status(200).json({
        attachment:poAttachment.attachments,
        message :'Fetched Successfully',
        success:true
      })
    }
    catch(error){
      console.error("Error fetching attachments:", error.message);
      return res.status(500).json({ message: "An error occurred", success: false });
    }
};



const getLinks = async(req,res) => {
  const {PONumber} = req.params;
  

  try{
    //check PO
    const PO = await PODetails.findOne({ _id: PONumber }); 
    if (!PO) {
      return res.status(404).json({ message: 'PO not found', success: false });
    }

    //Attachment table 
    const poAttachment = await Attachment.findOne({PONumber});
    console.log(poAttachment)
    if(!poAttachment){
      return res.status(200).json({
        link:[],
        message:`No Links Found for the Purchase Order`,
        success:true
      })
    }

    return res.status(200).json({
      link:poAttachment.links,
      message :'Fetched Successfully',
      success:true
    })
  }
  catch(error){
    console.error("Error fetching Links:", error.message);
    return res.status(500).json({ message: "An error occurred", success: false });
  }
};

const uploadLinks = async (req, res) => {
  const { PONumber } = req.params; // PO identifier from the request params
  const { linkName, url } = req.body; // Link details from the request body

  try {
    // Validate PO existence
    const poDetails = await PODetails.findOne({ _id: mongoose.Types.ObjectId(PONumber) });
    if (!poDetails) {
      return res.status(404).json({ message: "PO not found", success: false });
    }

    // Add or update links in the Attachment collection
    const poAttachment = await Attachment.findOneAndUpdate(
      { PONumber: mongoose.Types.ObjectId(PONumber) }, // Search by PONumber
      {
        $push: {
          links: { linkName, url }, // Add the new link
        },
      },
      {
        new: true, // Return the updated document
        upsert: true, // Create a new document if it doesn't exist
      }
    );

    // Return success response
    return res.status(200).json({
      message: "Link uploaded and saved successfully",
      success: true
    });
  } catch (error) {
    console.error("Error uploading links:", error.message);
    return res.status(500).json({
      message: "An error occurred during the link upload process",
      success: false,
      error: error.message,
    });
  }
};





module.exports = { uploadMultipleFiles , getAttachment, getLinks ,uploadLinks};