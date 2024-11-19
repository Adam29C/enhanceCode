const router = require("express").Router();
const mongoose = require("mongoose");
const { ObjectId } = require('mongodb');
const provider = require("../../model/games/Games_Provider");
const gameBids = require("../../model/games/gameBids");
const authMiddleware = require("../helpersModule/athetication");
const digits = require("../../model/digits");
const result = require("../../model/games/GameResult");
const gameRate = require("../../model/games/GameList");
const sum = require("../../model/dashBoard/BidSumGames");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const data = await provider.find().sort({ _id: 1 });
        if (data.length === 0) {
            return res.status(200).json({
                status: false,
                message: "No OC Cutting Group data found",
                data: [],
            });
        }
        return res.status(200).json({
            status: true,
            message: "OC Cutting Group fetched successfully",
            data,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching OC Cutting Group",
            error: error.message,
        });
    }
});

router.get("/finalOCGroup", authMiddleware, async (req, res) => {
    try {
        const data = await provider.find().sort({ _id: 1 });
        if (data.length === 0) {
            return res.status(200).json({
                status: false,
                message: "No data found for Final OC Cutting Group",
                data: [],
            });
        }
        return res.status(200).json({
            status: true,
            message: "Final OC Cutting Group fetched successfully",
            data,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching Final OC Cutting Group",
            error: error.message,
        });
    }
});

router.post("/getFinalCutting", authMiddleware, async (req, res) => {
    try {
        const { date, providerId, session } = req.body;
        if (!date || !providerId || !session) {
            return res.status(400).json({
                status: false,
                message: "Invalid request. Please provide date, providerId, and session.",
            });
        }
        const SingDigit = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0"));
        const data = await commonQuery(providerId, date, session);
        if (data.status === 0) {
            return res.status(200).json({
                status: false,
                message: "No data found",
            });
        }
        let { panaSum, singleDigitSum, panaArray, singleDigitArray } = data;
        const allBidDataOC = await gameBids.find(
            {
                providerId,
                gameDate: date,
                $or: [
                    { gameTypeName: "Jodi Digit" },
                    { gameTypeName: "Half Sangam Digits" },
                    { gameTypeName: "Full Sangam Digits" },
                ],
            },
            { bidDigit: 1, biddingPoints: 1, gameTypePrice: 1, gameSession: 1 }
        );
        const rates = await gameRate
            .find(
                {
                    gameName: { $in: ["Single Pana", "Double Pana", "Triple Pana"] },
                },
                { gameName: 1, gamePrice: 1 }
            )
            .sort({ gamePrice: 1 });

        const [sp, dp, tp] = rates.map((rate) => rate.gamePrice || 0);
        const jodiPrice = 10;
        for (const bid of allBidDataOC) {
            const { bidDigit, biddingPoints } = bid;
            const [digit] = bidDigit.split("-");
            const length = digit.length;

            if (length === 1 || length === 2) {
                singleDigitSum += biddingPoints;
            } else {
                panaSum += biddingPoints;
            }

            switch (length) {
                case 1:
                    singleDigitArray[digit].biddingPoints += biddingPoints;
                    break;
                case 2:
                    const char0 = parseInt(digit.charAt(0), 10);
                    singleDigitArray[char0].biddingPoints += biddingPoints;
                    break;
                case 3:
                    panaArray[digit].biddingPoints += biddingPoints;
                    break;
            }
        }
        const matchStage = {
            $match: {
                providerId: mongoose.Types.ObjectId(providerId),
                gameDate: date,
            },
        };
        const [data1, data2, data3] = await Promise.all([
            gameBids.aggregate([
                matchStage,
                { $match: { bidDigit: { $in: SingDigit }, gameSession: "Close" } },
                {
                    $group: {
                        _id: {
                            $switch: {
                                branches: Array.from({ length: 10 }, (_, i) => ({
                                    case: {
                                        $and: [
                                            { $gte: [{ $toInt: "$bidDigit" }, i * 10] },
                                            { $lt: [{ $toInt: "$bidDigit" }, (i + 1) * 10] },
                                        ],
                                    },
                                    then: i.toString(),
                                })),
                                default: "Other",
                            },
                        },
                        sumdigit: { $sum: "$biddingPoints" },
                        countBid: { $sum: 1 },
                        date: { $first: "$gameDate" },
                        gamePrice: { $first: "$gameTypePrice" },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            gameBids.aggregate([
                matchStage,
                { $match: { gameSession: "Open" } },
                {
                    $group: {
                        _id: "$bidDigit",
                        sumdigit: { $sum: "$biddingPoints" },
                        countBid: { $sum: 1 },
                        date: { $first: "$gameDate" },
                        gamePrice: { $first: "$gameTypePrice" },
                    },
                },
            ]),
            gameBids.aggregate([
                {
                    $match: {
                        gameDate: date,
                        providerId: mongoose.Types.ObjectId(providerId),
                        gameTypeName: "Half Sangam Digits",
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
            ]),
        ]);
        const matchArr = data3.map(({ _id, sumdigit }) => ({
            id: parseInt(_id.split("-")[0], 10),
            sumdigit,
        }));
        const combinedData = data1.map((item1) => {
            const matchingItem = data2.find((item2) => item2._id === item1._id);
            const matchingItemFromData3 = matchArr.find(
                (item3) => item3.id === parseInt(item1._id, 10)
            );
            const sumDigitFromData3 = matchingItemFromData3?.sumdigit || 0;
            return {
                _id: item1._id,
                biddingPoints:
                    item1.sumdigit +
                    (matchingItem?.sumdigit || 0) +
                    sumDigitFromData3,
                countBid: item1.countBid + (matchingItem?.countBid || 0),
                date: item1.date,
                gamePrice: item1.gamePrice,
            };
        });
        return res.status(200).json({
            status: true,
            message: "Success",
            finalData: {
                singleDigitArray: combinedData,
                panaArray,
            },
            dataSum: { singleDigit: singleDigitSum, Pana: panaSum },
            price: { sp, dp, tp, jodiPrice },
            mydata: { Open: combinedData, data2 },
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request.",
            error: error.message,
        });
    }
});

router.post("/finalCloseCutingGroup", authMiddleware, async (req, res) => {
    try {
        const date = req.body.date;
        const providerId = req.body.providerId;
        const session = req.body.session;

        const openResult = await result.findOne({
            providerId: providerId,
            session: "Open",
            resultDate: date,
        });

        if (!openResult) {
            return res.status(200).json({
                status: false,
                message: "Open Result Not Declared",
            });
        }

        const resultSingleDigit = parseInt(openResult.winningDigitFamily);
        const resultPanaDigit = parseInt(openResult.winningDigit);

        const rate = await gameRate.find(
            {
                $and: [
                    {
                        $or: [
                            { gameName: "Single Digit" },
                            { gameName: "Single Pana" },
                            { gameName: "Double Pana" },
                            { gameName: "Triple Pana" },
                        ],
                    },
                ],
            },
            { gameName: 1, gamePrice: 1, _id: 0 }
        ).sort({ gamePrice: 1 });

        const [sd, sp, dp, tp] = rate.map(r => r.gamePrice);

        try {
            const data = await commonQuery(providerId, date, session);
            let { panaSum, singleDigitSum, panaArray, singleDigitArray } = data;
            let query;
            if (session === "Open") {
                query = {
                    providerId: providerId,
                    gameDate: date,
                    $and: [
                        {
                            $or: [
                                { gameTypeName: "Jodi Digit" },
                                { gameTypeName: "Full Sangam Digits" },
                                { gameTypeName: "Half Sangam Digits" },
                            ],
                        },
                    ],
                };
            } else {
                query = {
                    providerId: providerId,
                    gameDate: date,
                    gameSession: "Close",
                };
            }
            const allBidDataOC = await gameBids.find(query, {
                bidDigit: 1,
                biddingPoints: 1,
                gameTypePrice: 1,
                gameSession: 1,
            });

            const sumHF = await sum.findOne({
                providerId: providerId,
                date: date,
            });

            const jodiPrice = 10;
            const halfSangamTotal = sumHF.half_Sangamsum;
            const fullSangamTotal = sumHF.full_Sangamsum;

            for (const bid of allBidDataOC) {
                const { bidDigit, biddingPoints, gameTypePrice } = bid;
                const amtToPay = biddingPoints * gameTypePrice;
                const strLength = bidDigit.length;

                switch (strLength) {
                    case 2:
                        const [digit1, digit2] = bidDigit.split("").map(Number);
                        if (digit1 === resultSingleDigit) {
                            const pointsNew = biddingPoints * sd;
                            singleDigitSum += pointsNew;
                            singleDigitArray[digit2]["biddingPoints"] += pointsNew;
                        }
                        break;
                    case 5:
                        const [digitPana3, digitPana4] = bidDigit.split("-");
                        if (parseInt(digitPana3) === resultPanaDigit || parseInt(digitPana3) === resultSingleDigit) {
                            const loss = amtToPay - halfSangamTotal;
                            if (digitPana4.length === 3) {
                                const sum = await rates(digitPana4, loss, sp, dp, tp);
                                panaSum += parseInt(sum);
                                panaArray[digitPana4]["biddingPoints"] += parseInt(sum);
                            } else {
                                const sum = loss / jodiPrice;
                                singleDigitSum += sum;
                                singleDigitArray[digitPana4]["biddingPoints"] += sum;
                            }
                        }
                        break;
                    case 7:
                        const [digitPana1, digitPana2] = bidDigit.split("-");
                        if (parseInt(digitPana1) === resultPanaDigit) {
                            const loss = amtToPay - fullSangamTotal;
                            const sum = await rates(digitPana1, loss, sp, dp, tp);
                            panaSum += parseInt(sum);
                            panaArray[digitPana2]["biddingPoints"] += parseInt(sum);
                        }
                        break;
                }
            }
            return res.json({
                status: true,
                message: "success",
                finalData: {
                    singleDigitArray: singleDigitArray,
                    panaArray: panaArray,
                },
                dataSum: {
                    singleDigit: singleDigitSum.toFixed(0),
                    Pana: panaSum.toFixed(0),
                },
                price: {
                    sp: sp,
                    dp: dp,
                    tp: tp,
                    sd: sd,
                    jodiPrice: jodiPrice,
                },
            });
        } catch (err) {
            return res.status(400).json({
                status: false,
                message: "Something Went Wrong Contact Support",
                error: err,
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Something Went Wrong Contact Support",
            error: error.message || error,
        });
    }
});

async function rates(digit, loss, spp, dpp, tpp) {
    try {
        let spArray = [
            127, 136, 145, 190, 235, 280, 370, 389, 460, 479, 569, 578, 128, 137, 146,
            236, 245, 290, 380, 470, 489, 560, 579, 678, 129, 138, 147, 156, 237, 246,
            345, 390, 480, 570, 589, 679, 120, 139, 148, 157, 238, 247, 256, 346, 490,
            580, 670, 689, 130, 149, 158, 167, 239, 248, 257, 347, 356, 590, 680, 789,
            140, 159, 168, 230, 249, 258, 267, 348, 357, 456, 690, 780, 123, 150, 169,
            178, 240, 259, 268, 349, 358, 367, 457, 790, 124, 160, 278, 179, 250, 269,
            340, 359, 368, 458, 467, 890, 125, 134, 170, 189, 260, 279, 350, 369, 468,
            378, 459, 567, 126, 135, 180, 234, 270, 289, 360, 379, 450, 469, 478, 568,
        ];

        let dpArray = [
            118, 226, 244, 299, 334, 488, 550, 668, 677, 100, 119, 155, 227, 335, 344,
            399, 588, 669, 110, 200, 228, 255, 336, 499, 660, 688, 778, 166, 229, 300,
            337, 355, 445, 599, 779, 788, 112, 220, 266, 338, 400, 446, 455, 699, 770,
            113, 122, 177, 339, 366, 447, 500, 799, 889, 600, 114, 277, 330, 448, 466,
            556, 880, 899, 115, 133, 188, 223, 377, 449, 557, 566, 700, 116, 224, 233,
            288, 440, 477, 558, 800, 990, 117, 144, 199, 225, 388, 559, 577, 667, 900,
        ];
        const tpArray = ["000", 111, 222, 333, 444, 555, 666, 777, 888, 999];

        const sp = spArray.includes(digit);
        const dp = dpArray.includes(digit);
        // const tp = tpArray.includes(digit);

        let divideResult = "";

        if (sp) {
            divideResult = (loss / spp).toFixed(0);
        } else if (dp) {
            divideResult = (loss / dpp).toFixed(0);
        } else {
            divideResult = (loss / tpp).toFixed(0);
        }
        return divideResult;
    } catch (error) {
        throw new Error(`Error in rates function: ${error.message}`);
    }
}

async function commonQuery(providerId, date, session) {
    try {
        const allBidData = await gameBids.find(
            { providerId: providerId, gameDate: date, gameSession: session },
            { bidDigit: 1, biddingPoints: 1, gameTypePrice: 1, gameSession: 1 }
        );
        if (allBidData.length === 0) {
            return {
                status: false,
                message: "No data found for the provided criteria",
            };
        }
        let singleDigitSum = 0;
        let panaSum = 0;
        let panaArray = {};
        let singleDigitArray = {
            0: { digit: "0", biddingPoints: 0 },
            1: { digit: "1", biddingPoints: 0 },
            2: { digit: "2", biddingPoints: 0 },
            3: { digit: "3", biddingPoints: 0 },
            4: { digit: "4", biddingPoints: 0 },
            5: { digit: "5", biddingPoints: 0 },
            6: { digit: "6", biddingPoints: 0 },
            7: { digit: "7", biddingPoints: 0 },
            8: { digit: "8", biddingPoints: 0 },
            9: { digit: "9", biddingPoints: 0 },
        };
        const panaDigit = await digits.find();
        panaDigit.forEach((digitObj) => {
            let key = digitObj.Digit.toString();
            panaArray[key] = {
                digit: key,
                digitFamily: digitObj.DigitFamily,
                biddingPoints: 0,
            };
        });
        allBidData.forEach((bid) => {
            const bidDigit = bid.bidDigit;
            const length = bidDigit.length;
            const points = bid.biddingPoints;

            if (length === 1) {
                singleDigitSum += points;
            } else if (length === 3) {
                panaSum += points;
            }

            switch (length) {
                case 1:
                    singleDigitArray[bidDigit].biddingPoints += points;
                    break;
                case 3:
                    if (panaArray[bidDigit]) {
                        panaArray[bidDigit].biddingPoints += points;
                    }
                    break;
            }
        });

        return {
            status: true,
            message: "Data processed successfully",
            data: {
                singleDigitArray,
                panaArray,
                panaSum,
                singleDigitSum,
            },
        };
    } catch (error) {
        return {
            status: false,
            message: "An error occurred while processing the data",
            error: error.message,
        };
    }
}

module.exports = router;