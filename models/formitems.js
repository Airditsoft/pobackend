const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const poItemSchema = new mongoose.Schema({
   formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
  PONumber: {  type: Schema.Types.ObjectId,required: true,ref: "FormDetails"},
  LineItemNo: { type: String, required: true },
  RequestorName: { type: String, default: '' },
  MaterialNum: { type: String, required: false },
  ItemDescription: { type: String, required: true },
  DeliveryDate: { type: Date, required: false }, // Optional field,
  OrderQuantity: { type: Number, required: true },
  UOM: { type: String, required: true },
  Price: { type: Number, required: true },
  TotalPrice: { type: Number, required: true },
  CurrencyKey: { type: String, required: true },
  PriceUnit: { type: Number, required: true },
  TaxCode: { type: String, default: '' },
});

module.exports = mongoose.model('FormItem', poItemSchema);
