const router = require("express").Router();;
const gameBids = require("../../../model/games/gameBids");
const gameResult = require("../../../model/games/GameResult");
const mainGameResult = require("../../../model/games/GameResult");
const authMiddleware = require("../../helpersModule/athetication")

router.post("/mainWinnerList", authMiddleware, async (req, res) => {
    try {
        const {
            digit,
            provider,
            gamedate,
            resultId,
            resultStatus,
            digitFamily,
            sessionType,
            providerName
        } = req.body;

        if (!digit || !provider || !gamedate || !resultId || !resultStatus) {
            return res.status(400).json({
                status: false,
                message: "All required fields must be provided."
            });
        }

        let finalArray = {
            "Single Pana": [],
            "Double Pana": [],
            "Triple Pana": [],
            "Single Digit": []
        };

        if (sessionType === "Close") {
            finalArray = {
                ...finalArray,
                "Jodi Digit": [],
                "Red Brackets": [],
                "Half Sangam Digits": [],
                "Full Sangam Digits": []
            };
        }

        const winnerList = await gameBids
            .find({
                $and: [{ $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] }],
                providerId: provider,
                gameDate: gamedate,
                gameSession: sessionType
            })
            .sort({ bidDigit: -1 });

        winnerList.forEach((winner) => {
            const gameType = winner.gameTypeName;
            if (finalArray[gameType]) {
                finalArray[gameType].push(winner);
            }
        });

        let jodiDigit = "";
        let halfSangam1 = "";
        let halfSangam2 = "";
        let fullSangam = "";

        if (sessionType === "Close") {
            const openResult = await gameResult.findOne({
                providerId: provider,
                resultDate: gamedate,
                session: "Open"
            });

            if (openResult) {
                const openFamily = openResult.winningDigitFamily;
                const openPana = openResult.winningDigit;

                jodiDigit = openFamily + digitFamily;
                halfSangam1 = `${openFamily}-${digit}`;
                halfSangam2 = `${openPana}-${digitFamily}`;
                fullSangam = `${openPana}-${digit}`;

                const winnerListClose = await gameBids
                    .find({
                        $and: [
                            {
                                $or: [
                                    { bidDigit: jodiDigit },
                                    { bidDigit: halfSangam1 },
                                    { bidDigit: halfSangam2 },
                                    { bidDigit: fullSangam }
                                ]
                            }
                        ],
                        providerId: provider,
                        gameDate: gamedate,
                        gameSession: sessionType
                    })
                    .sort({ bidDigit: -1 });

                winnerListClose.forEach((winner) => {
                    const gameType = winner.gameTypeName;
                    if (finalArray[gameType]) {
                        finalArray[gameType].push(winner);
                    }
                });
            }
        }

        const pageData = {
            winnerList: finalArray,
            resultId,
            resultStatus: parseInt(resultStatus, 10),
            winDigit: digit,
            digitFamily,
            gameDate: gamedate,
            provider,
            session: sessionType,
            jodiDigit,
            halfSangam1,
            halfSangam2,
            fullSangam,
            name: providerName
        };

        return res.status(200).json({
            status: true,
            message: "Game Winners List",
            data: pageData
        });
    } catch (error) {
        console.error("Error in /mainWinner:", error.message);

        return res.status(500).json({
            status: false,
            message: "An error occurred. Please contact support.",
            error: error.message
        });
    }
});

router.post("/remaningWinnerList", async (req, res) => {
    try {
        const { providerId, date, session } = req.body;

        if (!providerId || !date || !session) {
            return res.json({
                status: false,
                message: "Data is required",
            });
        }

        let finalArray = {
            "Single Pana": [],
            "Double Pana": [],
            "Triple Pana": [],
            "Single Digit": [],
        };

        if (session === "Close") {
            finalArray = {
                ...finalArray,
                "Jodi Digit": [],
                "Red Brackets": [],
                "Half Sangam Digits": [],
                "Full Sangam Digits": []
            };
        }

        const providerResult = await mainGameResult.findOne({ providerId, resultDate: date, session });
        if (!providerResult) {
            return res.json({
                status: false,
                message: "Result Data Not Found",
            });
        }

        if (providerResult.status !== 1) {
            return res.json({
                status: true,
                data: [],
            });
        }
        const winningDigit = providerResult.winningDigit.toString();
        const winningDigitFamily = providerResult.winningDigitFamily.toString();

        const winnerList = await gameBids.find({
            $and: [{ $or: [{ bidDigit: winningDigit }, { bidDigit: winningDigitFamily }] }],
            providerId,
            gameDate: date,
            gameSession: session,
            isPaymentDone: false
        }).sort({ bidDigit: -1 });

        if (winnerList.length === 0) {
            return res.json({
                status: true,
                data: [],
            });
        }
        winnerList.forEach((winner) => {
            const gameType = winner.gameTypeName;
            if (finalArray[gameType]) {
                finalArray[gameType].push(winner);
            }
        });

        let jodiDigit = "";
        let halfSangam1 = "";
        let halfSangam2 = "";
        let fullSangam = "";

        if (session === "Close") {
            const openResult = await gameResult.findOne({
                providerId,
                resultDate: date,
                session: "Open"
            });

            if (openResult) {
                const openFamily = openResult.winningDigitFamily;
                const openPana = openResult.winningDigit;

                jodiDigit = `${openFamily}${providerResult.winningDigitFamily}`;
                halfSangam1 = `${openFamily}-${providerResult.winningDigit}`;
                halfSangam2 = `${openPana}-${openResult.winningDigitFamily}`;
                fullSangam = `${openPana}-${openResult.winningDigit}`;

                const winnerListClose = await gameBids.find({
                    $and: [
                        {
                            $or: [
                                { bidDigit: jodiDigit },
                                { bidDigit: halfSangam1 },
                                { bidDigit: halfSangam2 },
                                { bidDigit: fullSangam }
                            ]
                        }
                    ],
                    providerId,
                    gameDate: date,
                    gameSession: session,
                    isPaymentDone: false
                }).sort({ bidDigit: -1 });

                winnerListClose.forEach((winner) => {
                    const gameType = winner.gameTypeName;
                    if (finalArray[gameType]) {
                        finalArray[gameType].push(winner);
                    }
                });
            }
        }
        const pageData = {
            winnerList: finalArray,
            winDigit: providerResult.winningDigit,
            digitFamily: providerResult.winningDigitFamily,
            gameDate: date,
            provider: providerId,
            session,
            jodiDigit,
            halfSangam1,
            halfSangam2,
            fullSangam,
            name: providerResult.providerName
        };

        return res.json({
            status: true,
            data: pageData,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Contact Support",
            error: error.message,
        });
    }
});

module.exports = router;
