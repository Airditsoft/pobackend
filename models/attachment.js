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
    }]
});

const Attachment = mongoose.model('Attachment', attachmentSchema);

module.exports = Attachment;
