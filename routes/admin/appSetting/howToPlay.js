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

module.exports =router