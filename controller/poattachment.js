const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const mongoose = require("mongoose");
const Attachment = require('../models/attachment');
const FormDetails = require('../models/formdetails');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = 'poc-files';

const uploadMultipleFiles = async (req, res) => {
    const { PONumber } = req.params;
    const { name } = req.authInfo;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded', success: false });
    }

    const session = await FormDetails.startSession();
    session.startTransaction();

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        await containerClient.createIfNotExists();

        let uploadResponses = [];
        for (const file of req.files) {
            const blobName = `${Date.now()}-${file.originalname}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.uploadFile(file.path, {
                blobHTTPHeaders: { blobContentType: file.mimetype }, // Set the correct content type
            });

            uploadResponses.push({
                blobName,
                url: blockBlobClient.url,
                size: file.size,
                uploadedBy: name,
                createdAt: new Date(),
            });

            fs.unlinkSync(file.path); // Remove temporary file
        }

        const poAttachment = await Attachment.findOneAndUpdate(
            { PONumber },
            { $push: { attachments: { $each: uploadResponses } } },
            { new: true, upsert: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            message: 'Files uploaded and saved successfully',
            success: true,
            data: uploadResponses,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error saving file details to MongoDB:', error);
        res.status(500).json({
            message: 'An error occurred while saving file details',
            success: false,
            error: error.message,
        });
    }
};





const getAttachment = async (req, res) => {
  const { PONumber } = req.params;

  const session = await FormDetails.startSession();
  session.startTransaction();

  try {
      const PO = await FormDetails.findOne({ _id: PONumber }).session(session);
      if (!PO) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: 'PO not found', success: false });
      }

      const poAttachment = await Attachment.findOne({ PONumber }).session(session);
      await session.commitTransaction();
      session.endSession();

      if (!poAttachment) {
          return res.status(200).json({
              attachment: [],
              message: 'No attachments found for the Purchase Order',
              success: true,
          });
      }

      return res.status(200).json({
          attachment: poAttachment.attachments.map((file) => ({
              blobName: file.blobName,
              url: file.url,
              size: file.size,
              uploadedBy: file.uploadedBy,
              createdAt: file.createdAt,
          })),
          message: 'Fetched Successfully',
          success: true,
      });
  } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Error fetching attachments:', error.message);
      return res.status(500).json({ message: 'An error occurred', success: false });
  }
};





const getLinks = async (req, res) => {
  const { PONumber } = req.params;

  const session = await FormDetails.startSession();
  session.startTransaction();

  try {
      const PO = await FormDetails.findOne({ _id: PONumber }).session(session);
      if (!PO) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: 'PO not found', success: false });
      }

      const poAttachment = await Attachment.findOne({ PONumber }).session(session);
      await session.commitTransaction();
      session.endSession();

      if (!poAttachment) {
          return res.status(200).json({
              link: [],
              message: 'No Links Found for the Purchase Order',
              success: true,
          });
      }

      return res.status(200).json({
          link: poAttachment.links,
          message: 'Fetched Successfully',
          success: true,
      });
  } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Error fetching Links:', error.message);
      return res.status(500).json({ message: 'An error occurred', success: false });
  }
};



const uploadLinks = async (req, res) => {
  const { PONumber } = req.params;
  const { linkName, url } = req.body;
  const { name } = req.authInfo;


  

  const session = await FormDetails.startSession();
  session.startTransaction();

  try {
      const PO = await FormDetails.findOne({ _id: PONumber }).session(session);
      if (!PO) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: 'PO not found', success: false });
      }

      await Attachment.findOneAndUpdate(
          { PONumber },
          {
              $push: {
                  links: {
                      linkName,
                      url,
                      uploadedBy: name,
                      createdAt: new Date(),
                  },
              },
          },
          { new: true, upsert: true, session }
      );
  
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
          message: 'Link uploaded and saved successfully',
          success: true,
      });
  } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Error uploading links:', error.message);
      return res.status(500).json({
          message: 'An error occurred during the link upload process',
          success: false,
          error: error.message,
      });
  }
};





module.exports = { uploadMultipleFiles , getAttachment, getLinks ,uploadLinks};