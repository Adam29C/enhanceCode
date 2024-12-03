const router = require("express").Router();
const gameBids = require("../../../model/games/gameBids");
const gamesProvider = require("../../../model/games/Games_Provider");
const gamesList = require("../../../model/games/GameList");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const [providers, gameLists] = await Promise.all([
            gamesProvider.find().sort({ _id: 1 }).exec(),
            gamesList.find().sort({ _id: 1 }).exec(),
        ]);

        return res.status(200).json({
            status: true,
            title: "Bidding Report",
            provider: providers,
            list: gameLists,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
        });
    }
});

router.post("/biddingDay", authMiddleware, async (req, res) => {
    try {
        const { provider, date, gameType, session: gameSession, page = 1, limit = 10, search } = req.body;

        if (!provider || !date || !gameType || !gameSession) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields: provider, date, gameType, session.",
            });
        }

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
            return res.status(400).json({
                status: false,
                message: "Invalid pagination parameters. 'page' and 'limit' must be positive numbers.",
            });
        }

        const skip = (pageNumber - 1) * limitNumber;

        let matchQuery = {
            providerId: new ObjectId(provider),
            gameTypeId: new ObjectId(gameType),
            gameDate: date,
            gameSession: gameSession,
        };

        if (search) {
            const searchValue = isNaN(search) ? search : parseInt(search);

            matchQuery["$or"] = [
                { bidDigit: searchValue },
                { gameWinPoints: searchValue },
                { biddingPoints: searchValue },
            ];
        }

        const result = await gameBids.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: "$bidDigit",
                    sumdigit: { $sum: "$biddingPoints" },
                    gameDate: { $first: "$gameDate" },
                    winningDigit: { $first: "$gameWinPoints" },
                },
            },
            { $skip: skip },
            { $limit: limitNumber },
        ]);

        const totalRecords = await gameBids.countDocuments(matchQuery);

        if (!result || result.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No data found for the given criteria.",
            });
        }

        const totalPages = Math.ceil(totalRecords / limitNumber);

        return res.status(200).json({
            status: true,
            message: "Bidding data retrieved successfully.",
            data: result,
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