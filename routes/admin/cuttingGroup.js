const express = require("express");
const router = express.Router();
const provider = require("../../model/games/Games_Provider");
const gameBids = require("../../model/games/gameBids");
const mongoose = require("mongoose");
const digits = require("../../model/digits");
const authMiddleware = require("../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const providers = await provider.find().sort({ _id: 1 });
        res.status(200).json({
            status: true,
            message: "Providers fetched successfully",
            data: providers
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Failed to fetch providers",
            error: error.message
        });
    }
});

router.post("/getCutting", authMiddleware, async (req, res) => {
    try {
        const { gameDate, gameSession, providerId, bidDigit } = req.body;

        if (!gameDate || !gameSession || !providerId) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields: gameDate, gameSession, providerId",
            });
        }

        let QUERY = {};
        if (gameSession === "Jodi Digit") {
            QUERY = {
                providerId: mongoose.Types.ObjectId(providerId),
                bidDigit: { $in: bidDigit },
                gameSession: "Close",
                gameDate,
            };
        } else {
            QUERY = {
                gameTypeName: gameSession,
                providerId: mongoose.Types.ObjectId(providerId),
                gameSession: "Close",
                gameDate,
            };
        }

        const data1 = await gameBids.aggregate([
            { $match: QUERY },
            {
                $group: {
                    _id: "$gameTypeId",
                    sumdigit: { $sum: "$biddingPoints" },
                    countBid: { $sum: 1 },
                    gameType: { $first: "$gameSession" },
                    gameTypeName: { $first: "$gameTypeName" },
                },
            },
        ]);

        if (data1.length === 0) {
            return res.status(200).json({
                status: false,
                message: "No data found for the provided criteria",
            });
        }

        let data2 = [];
        if (gameSession === "Jodi Digit") {
            data1[0].gameTypeName = "Jodi Digit";
            data2 = await gameBids.aggregate([
                {
                    $match: {
                        providerId: mongoose.Types.ObjectId(providerId),
                        bidDigit: { $in: bidDigit },
                        gameSession: "Close",
                        gameDate,
                    },
                },
                {
                    $group: {
                        _id: "$bidDigit",
                        sumdigit: { $sum: "$biddingPoints" },
                        countBid: { $sum: 1 },
                        date: { $first: "$gameDate" },
                        gamePrice: { $first: "$gameTypePrice" },
                    },
                },
            ]);
        } else {
            data2 = await gameBids.aggregate([
                {
                    $match: {
                        gameDate,
                        providerId: mongoose.Types.ObjectId(providerId),
                        gameTypeName: gameSession,
                    },
                },
                {
                    $group: {
                        _id: "$bidDigit",
                        sumdigit: { $sum: "$biddingPoints" },
                        countBid: { $sum: 1 },
                        date: { $first: "$gameDate" },
                        gamePrice: { $first: "$gameTypePrice" },
                    },
                },
            ]);
        }

        return res.status(200).json({
            satus: true,
            message: "Data retrieved successfully",
            data: { data1, data2, providerId },
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request",
            error: error.message,
        });
    }
});

router.post("/getOC", authMiddleware, async (req, res) => {
    try {
        const { gameDate, gameSession, providerId } = req.body;
        if (!gameDate || !gameSession || !providerId) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields: gameDate, gameSession, providerId",
            });
        }
        const data1 = await gameBids.aggregate([
            {
                $match: {
                    gameDate,
                    providerId: mongoose.Types.ObjectId(providerId),
                    gameSession,
                },
            },
            {
                $group: {
                    _id: "$gameTypeId",
                    sumdigit: { $sum: "$biddingPoints" },
                    countBid: { $sum: 1 },
                    gameType: { $first: "$gameSession" },
                    gameTypeName: { $first: "$gameTypeName" },
                    bidDigit: { $first: "$bidDigit" },
                },
            },
        ]);
        if (data1.length > 0) {
            const data2 = await gameBids.aggregate([
                {
                    $match: {
                        gameDate,
                        providerId: mongoose.Types.ObjectId(providerId),
                        gameSession,
                    },
                },
                {
                    $group: {
                        _id: "$bidDigit",
                        sumdigit: { $sum: "$biddingPoints" },
                        countBid: { $sum: 1 },
                        date: { $first: "$gameDate" },
                        gamePrice: { $first: "$gameTypePrice" },
                        gameSession: { $first: "$gameSession" },
                    },
                },
            ]);

            const pana = await digits.find();
            return res.status(200).json({
                status: true,
                message: "Data retrieved successfully",
                data: { data1, data2, pana },
            });
        }
        return res.status(200).json({
            status: false,
            message: "No data found for the provided criteria",
            data: [],
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request",
            error: error.message,
        });
    }
});

module.exports = router;