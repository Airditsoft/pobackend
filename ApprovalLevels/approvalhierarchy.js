const PODetails = require('../models/formdetails');
const POItems = require('../models/formitems');

const approvallevels = async(PONumberId) => {
    const PO = await PODetails.findOne({ _id: PONumberId });
    if(!PO){
        return res.status(400).json({
            message:`PO not Found in Approval Levels hierarchy`,
            success:false
        });

    }
    const POItem = await POItems.find({ PONumber: PONumberId });
    let totalAmount = 0;
    let totalQuantity = 0;

    for (const item of POItem) {
        totalAmount += item.TotalPrice;
        totalQuantity += item.OrderQuantity;
    }

    console.log(totalAmount, totalQuantity);

};




module.exports = { approvallevels };