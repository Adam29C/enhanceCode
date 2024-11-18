const router = require("express").Router();
const dateTime = require("node-datetime");
const gamesProvider = require("../../../model/games/Games_Provider");
const authMiddleware=require("../../helpersModule/athetication")

router.get("/", authMiddleware, async (req, res) => {
    try {
        const provider = await gamesProvider.find().sort({ _id: 1 });
        return res.status(200).json({
            statusCode: 200,
            success: true,
            message: "Data fetched successfully",
            data: provider,
        });
    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "Something Bad Happened. Please Contact Support",
            error: error.message,
        });
    }
});

router.post("/insertGame", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");
        const { gamename, result, acvtiveStatus, mobile } = req.body;

        if (!gamename || !result || !acvtiveStatus || !mobile) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Missing required fields: gamename, result, activeStatus, mobile",
            });
        }

        const games = new gamesProvider({
            providerName: gamename,
            providerResult: result,
            activeStatus: acvtiveStatus,
            modifiedAt: formatted,
            mobile: mobile,
        });
        await games.save();
        return res.status(201).json({
            statusCode: 201,
            status: true,
            message: "Game inserted successfully",
            data: games,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while inserting the game.",
            error: error.message,
        });
    }
});

router.get("/specificUser", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "User ID is required.",
            });
        }
        const user = await gamesProvider.findOne({ _id: userId });
        if (!user) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "User retrieved successfully.",
            data: user,
        });
    } catch (e) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong. Please try again later.",
            error: e.message,
        });
    }
});

router.patch("/", async (req, res) => {
    try {
        const { gameId, gamename, result, acvtiveStatusEdit, mobile } = req.body;
        if (!gameId|| !gamename|| !result) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Missing required fields: gameId, gamename, result, activeStatusEdit, mobile",
            });
        }
        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");

        const updateResult = await gamesProvider.updateOne(
            { _id: gameId },
            {
                $set: {
                    providerName: gamename,
                    providerResult: result,
                    activeStatus: acvtiveStatusEdit,
                    modifiedAt: formatted,
                    mobile: mobile,
                },
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Game not found or no changes were made.",
            });
        }

        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Game provider data updated successfully",
        });

    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while updating the game provider data.",
            error: error.message,
        });
    }
});

router.delete("/", authMiddleware, async (req, res) => {
    try {
        const { gameId } = req.body;
        if (!gameId) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Game ID is required.",
            });
        }

        const deletedGame = await gamesProvider.deleteOne({ _id: gameId });

        if (deletedGame.deletedCount === 0) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Game provider deleted successfully.",
        });

    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while deleting the game provider.",
            error: error.message,
        });
    }
});

module.exports = router;


