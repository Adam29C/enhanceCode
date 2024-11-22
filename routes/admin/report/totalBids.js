const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const moment = require("moment");
const gamesProvider = require("../../../model/games/Games_Provider");
const gamesList = require("../../../model/games/GameList");

router.get("/games", authMiddleware, async (req, res) => {
    try {
        const providerQuery = gamesProvider.find().sort({ _id: 1 }).exec();
        const listQuery = gamesList.find().sort({ _id: 1 }).exec();

        const [provider, list] = await Promise.all([providerQuery, listQuery]);

        if (!provider || !list) {
            return res.status(404).json({
                status: false,
                message: "No data found for games provider or list."
            });
        }

        return res.json({
            status: true,
            message: "Success",
            provider: provider,
            list: list,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Something went wrong. Please contact support.",
        });
    }
});

router.get("/gameBidsData", session, async (req, res) => {
    try {
        const { providerName, gameType, session: gameSession, date, userName, page = 1, limit = 10 } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        const query = {
            providerId: providerName,
            gameTypeId: gameType,
            gameSession: gameSession,
            gameDate: date,
        };

        if (userName) {
            query.userName = { $regex: userName, $options: "i" };
        }

        const totalItems = await gameBids.countDocuments(query);

        const bidsData = await gameBids.find(query)
            .skip(skip)
            .limit(pageSize)
            .sort({ gameDate: -1 });

        return res.json({
            status: true,
            message: "Success",
            data: bidsData,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
            currentPage: pageNumber,
            pageSize: pageSize,
        });
    } catch (error) {
        return res.json({
            status: false,
            message: "Something went wrong. Please contact support.",
            error: error.message || error,
        });
    }
});

