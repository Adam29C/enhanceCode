const router = require("express").Router();
const userProfile = require("../../../model/API/Profile");
const authMiddleware =require("../../helpersModule/athetication")
router.post("/getDetails",authMiddleware, async (req, res) => {
    try {
        const number = req.body.acc_num;

        if (!number || typeof number !== 'string' || number.trim().length === 0) {
            return res.status(400).json({
                status: 0,
                error: "Invalid account number"
            });
        }

        const searchProfile = { account_no: { $regex: `^${number}`, $options: 'i' } };
        const searchProfileAgain = { "changeDetails.old_acc_no": { $regex: `^${number}`, $options: 'i' } };

        const [profile, profileAgain] = await Promise.all([
            userProfile.find(searchProfile),
            userProfile.find(searchProfileAgain)
        ]);

        const mergedResults = [...profile, ...profileAgain];
        const uniqueResults = Array.from(new Set(mergedResults.map(a => a._id)))
            .map(id => mergedResults.find(a => a._id === id));

        res.json({
            status: 1,
            data: uniqueResults
        });

    } catch (error) {
        res.status(500).json({
            status: 0,
            error: "An error occurred while processing the request.",
            message: error.message || error
        });
    }
});


module.exports = router;