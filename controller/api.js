const PODetails = require('../models/formdetails');
const POItem = require('../models/formitems');


const powerBI = async (req, res) => {
    try {
        // Fetch all POs without any filters
        const poDetails = await PODetails.find({},
            { __v: 0, formId: 0, currentapprovallevel: 0}
        ).lean();

        // If no POs are found, return an empty response
        if (!poDetails || poDetails.length === 0) {
            return res.status(200).json({
                poWithItems: [],
                poDetailsCount: 0,
                isAdmin: true,
                success: false,
            });
        }

        // Fetch associated items for each PO and map them into a single object
        const poWithItems = await Promise.all(
            poDetails.map(async (po) => {
                const items = await POItem.find({ PONumber: po._id }, '-_id -formId -PONumber -__v').lean();
                return { ...po, items }; // Combine PO details with its items
            })
        );

        // Return the response with all POs and their associated items
        return res.status(200).json({
            data: {
                poDetailsCount: poDetails.length,
                poWithItems,
                isAdmin: true,
            },
            success: true,
        });

    } catch (error) {
        // Log error details for debugging
        console.error('Error in powerBI function:', error.message);
        console.error(error.stack);

        // Return error response
        return res.status(500).json({ message: 'An error occurred while fetching PO details.' });
    }
};

module.exports = { powerBI };