const { required } = require("joi");
const mongoose = require("mongoose");

const PODetailsSchema = new mongoose.Schema({
  formId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Form" 
  }, // New field
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
  Read:{
    type:Number,
    enum:[0,1],
    default:0
  },
  priority:{
    type:String,
    required:true,
    default:'High'
  },
  currentapprovallevel:{
    type:String,
    default:null
  },
  TotalPrice:{
    type:Number
  },
  Price:{
    type:Number
  },
  OrderQuantity:{
    type:Number
  },
  TotalItems:{
    type:Number
  }
});

module.exports = mongoose.model("FormDetails", PODetailsSchema);
