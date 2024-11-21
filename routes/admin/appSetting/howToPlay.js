const router = require('express').Router();
const Rules = require('../../../model/appSetting/HowToPlay');
const authMiddleware = require("../../helpersModule/athetication")
router.get('/htp',authMiddleware,async (req, res)=>{
    try {
        const data = await Rules.find({});

        let finalData = data.length > 0 ? data[0]?.howtoplay : []

        res.json({
                status: 1,
                message: "Success",
                data: finalData
            });
    }
    catch (e) {
        res.status(400).send(
            {
                status: 0,
                message: 'Something Happened Please Contact the Support',
                error: e
            });
    }
});

router.post('/updateHtp',authMiddleware,  async (req, res) => {
    try {
        // Get data from the request body (assuming you are passing this data)
        const { htpId, howtoplay } = req.body;

        // Check if htpId and howtoplay are provided
        if (!htpId || !howtoplay) {
            return res.status(400).json({
                status: true,
                message: 'htpId and howtoplay are required'
            });
        }

        // Find the document by htpId (or any other unique identifier)
        const updatedData = await Rules.findOneAndUpdate(
            { _id: htpId }, // Filter by htpId
            { $set: { howtoplay } }, // Update the howtoplay field
            { new: true } // Return the updated document
        );

        if (!updatedData) {
            return res.status(404).json({
                status: false,
                message: 'Data not found or update failed'
            });
        }

        // Return a success response
        res.json({
            status: true,
            message: 'HowToPlay data updated successfully',
            data: updatedData.howtoplay // Return the updated howtoplay data
        });
    } catch (e) {
        res.status(400).send({
            status: false,
            message: 'Something Happened Please Contact the Support',
            error: e.message
        });
    }
});

module.exports =router