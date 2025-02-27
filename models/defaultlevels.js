const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaultSchema = new mongoose.Schema({
    formID:{
      type: Schema.Types.ObjectId,  // Corrected to ObjectId
      required: true,
      ref: "Form"
    },
    approval_hierarchy: [
        {
          type:String,
          required:true,
          index:true
        }
      ],

    
  });
  

  module.exports = mongoose.model('DefaultLevel', defaultSchema);