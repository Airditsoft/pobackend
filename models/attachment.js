const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attachmentSchema = new Schema({
    // Reference to the PO identifier
    PONumber: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Podetails' // Assuming 'Podetails' is another model that you have defined
    },
    // Array of attachments
    attachments: [
        {
            blobName: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            },
            size: {
                type: Number, // File size in bytes
                required: true,
            },
            uploadedBy: {
                type: String, // Username of the uploader
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    // Array of links
    links: [{
        linkName: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        uploadedBy: {
            type: String, // Username of the uploader
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }],
    pocomments: {
        type: [
          {
            departmentId: { 
              type: Schema.Types.ObjectId,  // Corrected to ObjectId
              required: true,
              ref: "Department"
            },
            level: { 
              type: Number, 
              required: true 
            },
            comment: { 
              type: String 
            },
            createdAt: { 
              type: Date, 
              default: Date.now 
            }, // Manually add createdAt
  
      }
      ],
  
      _id: false, // Disables the `_id` field for subdocuments in this array
      default: []
  
    } 
});

const Attachment = mongoose.model('Attachment', attachmentSchema);

module.exports = Attachment;
