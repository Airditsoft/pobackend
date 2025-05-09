const { required } = require("joi");
const mongoose = require("mongoose");

const PODetailsSchema = new mongoose.Schema({
  PONumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ReleasingStatus: {
    type: String,
  },
  ApprovalStatus: {
    type: Number,
    required:true
  },
  CreatedBy: {
    type: String,
  },
  CreatedOn: {
    type: Date,
  },
  Currency: {
    type: String,
  },
  PurchaseOrganization: {
    type: String,
  },
  PurchaseGroup: {
    type: String,
  },
  CompanyCode: {
    type: String,
  },
  SupplierCode: {
    type: String,
  },
  SupplierName: {
    type: String,
  },
  SupplierStreet: {
    type: String,
  },
  SupplierPostalCode: {
    type: String,
  },
  SupplierCity: {
    type: String,
  },
  PaymentTerms: {
    type: String,
  },
  approvaltype: {
    type: Number,
    enum: [0, 1], // o only 'default' or 1 'custom'
    default: 0, // If not provided, default will be 'default'
  },
  currentapprovallevel:{
    type:String,
    default:null
  }
});

module.exports = mongoose.model("Podetails", PODetailsSchema);
