const dateTime = require("node-datetime");
const moment = require('moment');
const gamesProvider = require("../../../model/games/Games_Provider");
const gameResult = require("../../../model/games/GameResult");
const authMiddleware = require("../../helpersModule/athetication")

router.get("/", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted = dt.format("m/d/Y");
        const provider = await gamesProvider.find().sort({ _id: 1 });
        const result = await gameResult.find({ resultDate: formatted }).sort({ _id: -1 });

        if (result.length > 0) {
            return res.status(200).json({
                status: "Success",
                message: "Game results found",
                data: {
                    provider,
                    result,
                },
            });
        } else {
            const currentTime = dt.format("I:M p");
            const checkTime = "09:00 AM";

            const beginningTime = moment(currentTime, "h:mm a");
            const endTime = moment(checkTime, "h:mm a");

            if (beginningTime.isAfter(endTime)) {
                return res.status(200).json({
                    status: "Success",
                    message: "No results for today, but displaying past results",
                    data: {
                        provider,
                        result,
                    },
                });
            } else {
                let previousDate = moment(formatted, "MM/DD/YYYY")
                    .subtract(1, "days")
                    .format("MM/DD/YYYY");

                const pastResult = await gameResult
                    .find()
                    .sort({ _id: -1 })
                    .where("resultDate")
                    .equals(previousDate);

                return res.status(200).json({
                    status: "Success",
                    message: "No results for today, showing past results",
                    data: {
                        provider,
                        result: pastResult,
                    },
                });
            }
        }
    } catch (e) {
        return res.status(500).json({
            status: "Failure",
            message: "Error retrieving game results",
            error: e.message,
        });
    }
});

router.get("/pastResult", authMiddleware, async (req, res) => {
    try {
        const date = req.query.date;
        if (!date) {
            return res.status(400).json({
                status: "Failure",
                message: "Date query parameter is required",
            });
        }
        const results = await gameResult.find({ resultDate: date });
        const countResults = await gameResult.countDocuments({ resultDate: date });
        const providerCount = await gamesProvider.countDocuments();
        const pendingCount = providerCount * 2 - countResults;

        return res.status(200).json({
            status: "Success",
            message: "Past results retrieved successfully",
            data: {
                results,
                countResults,
                providerCount,
                pendingCount,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: "Failure",
            message: "Error retrieving past results",
            error: error.message,
        });
    }
});

router.delete("/delete", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted1 = dt.format("m/d/Y I:M:S p");
        const { resultId, providerId, session: sessionType, dltPast: dltStatus } = req.body;

        if (!resultId || !providerId || !sessionType) {
            return res.status(400).json({
                status: 0,
                message: "Missing required fields",
            });
        }

        const dltResult = await gameResult.deleteOne({ _id: resultId });
        if (dltResult.deletedCount === 0) {
            return res.status(404).json({
                status: 0,
                message: "Result not found or already deleted",
            });
        }

        if (dltStatus === 0) {
            if (sessionType === "Open") {
                await gamesProvider.updateOne(
                    { _id: providerId },
                    {
                        $set: {
                            providerResult: "***-**-***",
                            modifiedAt: formatted1,
                            resultStatus: 0,
                        },
                    }
                );
            } else {
                const result = await gamesProvider.findOne({ _id: providerId });
                if (!result) {
                    return res.status(404).json({
                        status: 0,
                        message: "Provider not found",
                    });
                }

                let digit = result.providerResult;
                const data = digit.split("-");
                let openDigit = data[0];
                let sumDgit = parseInt(data[1].charAt(0));
                let finalDigit = `${openDigit}-${sumDgit}`;
                await gamesProvider.updateOne(
                    { _id: providerId },
                    {
                        $set: {
                            providerResult: finalDigit,
                            modifiedAt: formatted1,
                            resultStatus: 1,
                        },
                    }
                );
            }
        }
        return res.status(200).json({
            status: 1,
            message: "Result deleted successfully",
            data: dltResult,
        });
    } catch (e) {
        return res.status(500).json({
            status: 0,
            message: "Server error. Please contact support.",
            error: e.message,
        });
    }
});

router.post("/digits", async (req, res) => {
    try {
        const digitArray = req.body;
        if (!Array.isArray(digitArray) || digitArray.length === 0) {
            return res.status(400).json({
                status: 0,
                message: "Invalid input: Array of digits is required.",
            });
        }
        const insertedDigits = await gameDigit.insertMany(digitArray);
        res.status(201).json({
            status: 1,
            message: "Digits inserted successfully",
            data: insertedDigits,
        });
    } catch (err) {
        res.status(500).json({
            status: 0,
            message: "Server error occurred while inserting digits.",
            error: err.message,
        });
    }
});
