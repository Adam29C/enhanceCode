const router = require("express").Router();
const dateTime = require("node-datetime");
const gameList = require("../../../model/games/GameList");
const authMiddleware=require("../../helpersModule/athetication")

router.get("/", authMiddleware, async (req, res) => {
    try {
        const gameRate = await gameList.find().sort({ _id: 1 });
        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Data fetched successfully",
            data: gameRate,
        });
    } catch (e) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "An error occurred while fetching game data",
            error: e.message,
        });
    }
});

router.post("/insertGame", authMiddleware, async (req, res) => {
    try {
        const { gamename, price } = req.body;
        if (!gamename || !price) {
            return res.status(400).json({
                status: false,
                message: "Game name and price are required",
            });
        }
        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");
        const games = new gameList({
            gameName: gamename,
            gamePrice: price,
            modifiedAt: formatted,
        });
        await games.save();
        return res.status(201).json({
            status: true,
            message: "Game successfully inserted",
            data: games,
        });

    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Error inserting game data",
            error: e.message,
        });
    }
});

router.get("/specificUser", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "User ID is required",
            });
        }
        const user = await gameList.findOne({ _id: userId });
        if (!user) {
            return res.status(400).json({
                status: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            status: true,
            message: "User found",
            data: user,
        });

    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Error fetching user data",
            error: e.message,
        });
    }
});

router.patch("/", authMiddleware, async (req, res) => {
    try {
        const { userId, gamename, price } = req.body;
        if (!userId || !gamename || !price) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields: userId, gamename, or price.",
            });
        }
        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");
        const result = await gameList.updateOne(
            { _id: userId },
            {
                $set: {
                    gameName: gamename,
                    gamePrice: price,
                    modifiedAt: formatted,
                },
            }
        );
        if (result.modifiedCount === 0) {
            return res.status(400).json({
                status: false,
                message: "Game not found or no changes made.",
            });
        }
        return res.status(200).json({
            status: true,
            message: "Game details updated successfully.",
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Error updating game details.",
            error: e.message,
        });
    }
});

router.delete("/", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "Missing required field: userId.",
            });
        }
        const result = await gameList.deleteOne({ _id: userId });
        if (result.deletedCount === 0) {
            return res.status(400).json({
                status: false,
                message: "Game not found or already deleted.",
            });
        }
        return res.status(200).json({
            status: true,
            message: "Game deleted successfully.",
            data: result,
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Error deleting game.",
            error: e.message,
            stack: process.env.NODE_ENV === "development" ? e.stack : undefined, // Conditionally include stack trace in development mode
        });
    }
});

module.exports = router;