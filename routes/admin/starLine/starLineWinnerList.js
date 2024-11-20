const router = require("express").Router();
const starBIds = require("../../../model/starline/StarlineBids");
const authMiddleware = require("../../helpersModule/athetication")

router.post("/starLineWinnerList", authMiddleware, async (req, res) => {
    try {
        const { digit, provider, date, resultId, resultStatus, digitFamily } = req.body;

        if (!digit || !provider || !date || !resultId || resultStatus === undefined) {
            return res.status(400).json({
                status: false,
                message: "All required fields must be provided."
            });
        }

        const winnerList = await starBIds
            .find({
                providerId: provider,
                gameDate: date,
                $and: [{ $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] }]
            })
            .sort({ _id: -1 });

        const pageData = {
            winnerList,
            resultId,
            resultStatus: parseInt(resultStatus, 10),
            winDigit: digit,
            digitFamily,
            gameDate: date,
            provider
        };

        return res.status(200).json({
            status: true,
            message: "Star Game Winner List",
            data: pageData
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred. Please contact support.",
            error: error.message
        });
    }
});

module.exports = router;