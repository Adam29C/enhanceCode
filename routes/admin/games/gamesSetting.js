const router = require("express").Router();
const dateTime = require("node-datetime");
const mongoose = require("mongoose");
const gamesProvider = require("../../../model/games/Games_Provider");
const gamesSetting = require("../../../model/games/AddSetting");
const authMiddleware = require("../../helpersModule/athetication")

router.get("/", authMiddleware, async (req, res) => {
    try {
        // Fetch all providers in one query
        const providers = await gamesProvider.find().sort({ _id: 1 });

        // Extract provider IDs into an array
        const providerIds = providers.map((provider) => provider._id);

        // Fetch all game settings related to these providers in a single query
        const settings = await gamesSetting.find({
            providerId: { $in: providerIds },
        }).sort({ providerId: 1, _id: 1 });

        // Create a map to group settings by providerId
        const settingsMap = settings.reduce((acc, setting) => {
            if (!acc[setting.providerId]) {
                acc[setting.providerId] = [];
            }
            acc[setting.providerId].push(setting);
            return acc;
        }, {});

        // Build the final array by merging providers with their game settings
        const finalData = providers.map((provider) => ({
            _id: provider._id,
            providerName: provider.providerName,
            providerResult: provider.providerResult,
            modifiedAt: provider.modifiedAt,
            resultStatus: provider.resultStatus,
            gameDetails: settingsMap[provider._id] || [],
        }));

        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Data fetched successfully",
            data: finalData,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while fetching game settings.",
            error: error.message,
        });
    }
});

router.post("/insertSettings", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");
        const { gameid, gameDay, game1, game2, game3, game4, status } = req.body;
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const find = await gamesSetting.findOne({
            providerId: gameid,
            gameDay: gameDay,
        });
        if (!find) {
            let uniqueDays;
            let finalArr = [];
            if (gameDay.toUpperCase() === "ALL") {
                const providerSetting = await gamesSetting.find({ providerId: gameid }, { gameDay: 1, providerId: 1 });

                if (providerSetting.length > 0) {
                    let daysFromArray1 = providerSetting.map(item => item.gameDay);
                    let allDays = new Set([...daysFromArray1, ...days]);
                    uniqueDays = [...allDays].filter(day => !daysFromArray1.includes(day) || !days.includes(day));
                } else {
                    uniqueDays = days;
                }
                for (let day of uniqueDays) {
                    finalArr.push({
                        providerId: gameid,
                        gameDay: day,
                        OBT: game1,
                        CBT: game2,
                        OBRT: game3,
                        CBRT: game4,
                        isClosed: status,
                        modifiedAt: formatted,
                    });
                }
                await gamesSetting.insertMany(finalArr);
            } else {
                const settings = new gamesSetting({
                    providerId: gameid,
                    gameDay: gameDay,
                    OBT: game1,
                    CBT: game2,
                    OBRT: game3,
                    CBRT: game4,
                    isClosed: status,
                    modifiedAt: formatted,
                });
                await settings.save();
            }
            return res.status(200).json({
                statusCode: 200,
                status: true,
                message: `Successfully Inserted Timings For ${gameDay}`,
            });
        } else {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: `Details Already Filled For ${gameDay}`,
            });
        }
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while inserting game settings.",
            error: error.message,
        });
    }
});

router.patch("/", authMiddleware, async (req, res) => {
    try {
        const { gameid, game1, game2, game3, game4, status } = req.body;
        if (!gameid || !game1 || !game2 || !game3 || !game4) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Missing required fields in the request body",
            });
        }
        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");
        const result = await gamesSetting.updateOne(
            { _id: gameid },
            {
                $set: {
                    OBT: game1,
                    CBT: game2,
                    OBRT: game3,
                    CBRT: game4,
                    isClosed: status,
                    modifiedAt: formatted,
                },
            }
        );
        if (result.modifiedCount === 0) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Game settings not found or no changes made",
            });
        }
        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Game settings updated successfully",
        });
    } catch (e) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while updating game settings",
            error: e.message,
        });
    }
});

router.post("/updateAll", authMiddleware, async (req, res) => {
    try {
        const { gameid, game1, game2, game3, game4, status } = req.body;
        if (!gameid || !game1 || !game2 || !game3 || !game4) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Missing required fields in the request body",
            });
        }

        const settingList = await gamesSetting.findOne({ providerId: gameid });
        if (!settingList) {
            return res.status(404).json({
                success: false,
                message: "Provider Setting Not Present. First Create Provider Setting."
            });
        }

        const dt = dateTime.create();
        const formatted = dt.format("Y-m-d H:M:S");
        const result = await gamesSetting.updateMany(
            { providerId: gameid },
            {
                $set: {
                    OBT: game1,
                    CBT: game2,
                    OBRT: game3,
                    CBRT: game4,
                    isClosed: status,
                    modifiedAt: formatted,
                },
            }
        );
        if (result.modifiedCount === 0) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "No matching records found to update or no changes made",
            });
        }
        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: `${result.modifiedCount} game settings updated successfully`,
        });
    } catch (e) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while updating game settings",
            error: e.message,
        });
    }
});

router.post("/:providerId", authMiddleware, async (req, res) => {
    try {
        const id = mongoose.Types.ObjectId(req.params.providerId);
        const result = await gamesProvider.aggregate([
            { $match: { _id: id } },
            {
                $lookup: {
                    from: "games_settings",
                    localField: "_id",
                    foreignField: "providerId",
                    as: "gameDetails",
                },
            },
        ]);

        return res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Data fetched successfully",
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while processing the request.",
            error: error.message,
        });
    }
});
module.exports = router;