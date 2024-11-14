const dateTime = require("node-datetime");
const moment = require('moment');
const gamesProvider = require("../../../model/games/Games_Provider");
const gameResult = require("../../../model/games/GameResult");

router.get("/", session, async (req, res) => {
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

router.get("/pastResult", session, async (req, res) => {
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
