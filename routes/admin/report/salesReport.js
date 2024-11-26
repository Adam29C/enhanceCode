const router = require("express").Router();
const provider = require("../../../model/games/Games_Provider");
const authMiddleware = require("../../helpersModule/athetication");
const providerSetting=require("../../../model/games/AddSetting");
const bids =require("../../../model/games/gameBids");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const providerData = await provider.find().sort({ _id: 1 });

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

router.post("/userReport", session, async (req, res) => {
    try {
        const { userId, gameId, startDate, endDate } = req.body;

        if (!startDate || !endDate || !moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({
                status: false,
                message: "Invalid startDate or endDate format. Please use YYYY-MM-DD format.",
            });
        }

        const dayOfWeek = moment().format("dddd");

        const [gameSettings, providerList] = await Promise.all([
            providerSetting
                .find(
                    { gameDay: dayOfWeek },
                    { providerId: 1, OBT: 1, _id: 0 }
                )
                .sort((a, b) => moment(a.OBT, "hh:mm A") - moment(b.OBT, "hh:mm A")),
            provider.find(),
        ]);

        const providerMap = new Map(providerList.map((p) => [p._id.toString(), p.providerName]));

        const arrangedProviderList = gameSettings
            .map((game) => ({
                providerId: game.providerId,
                providerName: providerMap.get(game.providerId.toString()),
            }))
            .filter((provider) => provider.providerName);

        const fetchBidsData = async (providerIds, userName) => {
            const matchCriteria = {
                providerId: { $in: providerIds.map((id) => new ObjectId(id)) },
                gameDate: { $gte: startDate, $lte: endDate },
            };
            if (userName) {
                matchCriteria.userName = userName;
            }

            return bids.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: "$providerId",
                        GameWinPoints: { $sum: "$gameWinPoints" },
                        BiddingPoints: { $sum: "$biddingPoints" },
                    },
                },
            ]);
        };

        const providerIds = gameId === "0"
            ? arrangedProviderList.map((p) => p.providerId)
            : [gameId];

        const bidData = await fetchBidsData(providerIds, userId);

        const bidDataMap = new Map(
            bidData.map((bid) => [
                bid._id.toString(),
                { GameWinPoints: bid.GameWinPoints, BiddingPoints: bid.BiddingPoints },
            ])
        );

        const finalResult = providerIds.map((providerId, index) => {
            const bid = bidDataMap.get(providerId.toString()) || { GameWinPoints: 0, BiddingPoints: 0 };
            return {
                index,
                GameWinPoints: bid.GameWinPoints,
                BiddingPoints: bid.BiddingPoints,
                providerName: providerMap.get(providerId.toString()),
            };
        });

        finalResult.sort((a, b) => a.index - b.index);

        return res.status(200).json({
            status: true,
            message: "User report generated successfully.",
            data: finalResult,
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
