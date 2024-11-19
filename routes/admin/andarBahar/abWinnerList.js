const router = require("express").Router();
const ABbids = require("../../../model/AndarBahar/ABbids");
const abPorvider = require("../../../model/AndarBahar/ABProvider");
const abGameType = require("../../../model/AndarBahar/ABGameList");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/abWinner", authMiddleware, async (req, res) => {
    try {
        const { digit, provider, date, resultId, resultStatus } = req.body;

        const resultList = await ABbids.find({
            providerId: provider,
            gameDate: date,
            bidDigit: digit
        }).sort({ _id: -1 });

        const ABProvider = await abPorvider.findOne({ _id: provider });
        const gameType = await abGameType.find();

        const pageData = {
            dispData: ABProvider,
            gametype: gameType,
            resultId,
            resultStatus: parseInt(resultStatus, 10),
        };

        return res.status(200).json({
            status: true,
            message: "AB Game Winners List",
            data: pageData,
            resultData: resultList,
            gameDate: date,
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
