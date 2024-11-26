const router = require("express").Router();
const moment = require("moment")
const authMiddleware = require("../../helpersModule/athetication");
const abProvider = require("../../../model/AndarBahar/ABProvider");
const abBids = require("../../../model/AndarBahar/ABbids");
const abProviderSetting = require("../../../model/AndarBahar/ABAddSetting")

router.get("/andarBahar", authMiddleware, async (req, res) => {
    try {
        const providerData = await abProvider.find().sort({ _id: 1 });

        if (!providerData || providerData.length === 0) {
            return res.status(400).json({
                status: false,
                message: "No provider data found.",
                data: [],
            });
        }

        return res.status(200).json({
            status: true,
            message: "Sales Report fetched successfully.",
            data: providerData,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching provider data. Please contact support.",
            error: error.message,
        });
    }
});

router.post("/userReportAB", session, async (req, res) => {
    try {
        const { userId, gameId, startDate, endDate } = req.body;

        if (!startDate || !endDate || !moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({ 
                status: false, 
                message: "Invalid startDate or endDate format" 
            });
        }
        const dayOfWeek = moment().format("dddd");

        const gameSettings = await abProviderSetting
            .find({ gameDay: dayOfWeek, isClosed: "1" }, { providerId: 1, OBT: 1, _id: 0 })
            .sort((a, b) => moment(a.OBT, "hh:mm A") - moment(b.OBT, "hh:mm A"));

        const providerList = await abProvider.find();

        const arrangedProviderList = gameSettings
            .map(game => providerList.find(provider => provider._id.toString() === game.providerId.toString()))
            .filter(Boolean);

        const fetchBidsData = async (providerId, userName = null) => {
            const matchCriteria = {
                providerId: new ObjectId(providerId),
                gameDate: { $gte: startDate, $lte: endDate },
            };
            if (userName) matchCriteria.userName = userName;

            const [result] = await abBids.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: null,
                        GameWinPoints: { $sum: "$gameWinPoints" },
                        BiddingPoints: { $sum: "$biddingPoints" },
                    },
                },
            ]);

            return result || { GameWinPoints: 0, BiddingPoints: 0 };
        };

        const processProvider = async (providerData, index) => {
            const bidData = await fetchBidsData(providerData._id, userId);
            return {
                index,
                GameWinPoints: bidData.GameWinPoints,
                BiddingPoints: bidData.BiddingPoints,
                providerName: providerData.providerName,
            };
        };

        let finalResult = [];
        if (gameId === "0") {
            finalResult = await Promise.all(
                arrangedProviderList.map((providerData, index) => processProvider(providerData, index))
            );
        } else {
            const providerData = await abProvider.findOne({ _id: new ObjectId(gameId) }, { providerName: 1 });
            if (!providerData) {
                return res.status(404).json({ 
                    status: false, 
                    message: "Game not found" 
                });
            }

            const result = await processProvider(providerData, 0);
            finalResult.push(result);
        }

        finalResult.sort((a, b) => a.index - b.index);

        return res.json({ 
            status: true, 
            message: "Report generated successfully", 
            data: finalResult 
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while generating the report. Please contact support.",
            error: error.message,
        });
    }
});

module.exports = router;