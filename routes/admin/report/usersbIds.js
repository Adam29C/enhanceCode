const router = require("express").Router();
const abBids = require("../../../model/AndarBahar/ABbids");
const gameBids = require("../../../model/games/gameBids");
const authMiddleware = require("../../helpersModule/athetication");
const starBids = require("../../../model/starline/StarlineBids");

router.post("/getUserBidData", authMiddleware, async (req, res) => {
    try {
        const { marketType: market, username, page = 1, limit = 10, search } = req.body;

        if (!username) {
            return res.status(400).json({
                status: false,
                message: "Username is required.",
            });
        }

        let marketModel;
        switch (market) {
            case 2:
                marketModel = starBids;
                break;
            case 1:
                marketModel = gameBids;
                break;
            default:
                marketModel = abBids;
        }

        // If the username is 'all', we remove the username filter
        const query = username === "all" ? {} : { userName: username };

        if (search) {
            const searchValue = search.toLowerCase();
            query.$or = [
                { bracket: { $regex: searchValue, $options: "i" } },
                { biddingPoints: { $regex: searchValue } },
                { providerName: { $regex: searchValue, $options: "i" } },
                { gameTypeName: { $regex: searchValue, $options: "i" } },
                { session: { $regex: searchValue, $options: "i" } },
                { winStatus: searchValue === "true" || searchValue === "false" ? searchValue === "true" : undefined },
            ].filter(Boolean);
        }

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const allData = await marketModel.find(query).skip(skip).limit(limitNumber).lean();

        const groupData = await marketModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$providerId",
                    sumdigit: { $sum: "$biddingPoints" },
                    countBid: { $sum: 1 },
                    providerName: { $first: "$providerName" },
                    gameTypeName: { $first: "$gameTypeName" },
                },
            },
        ]);

        const totalRecords = await marketModel.countDocuments(query);
        const totalPages = Math.ceil(totalRecords / limitNumber);

        return res.status(200).json({
            status: true,
            message: "User bid data retrieved successfully.",
            data: {
                groupData,
                allData,
            },
            pagination: {
                totalRecords,
                totalPages,
                currentPage: pageNumber,
                pageSize: limitNumber,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
            error: error.message,
        });
    }
});


module.exports = router;