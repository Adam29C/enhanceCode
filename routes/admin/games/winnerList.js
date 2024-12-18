const router = require("express").Router();;
const gameBids = require("../../../model/games/gameBids");
const gameResult = require("../../../model/games/GameResult");
const mainGameResult = require("../../../model/games/GameResult");
const authMiddleware = require("../../helpersModule/athetication")
const user = require('../../../model/API/Users');
const history = require('../../../model/wallet_history');
const notification = require('../../helpersModule/sendNotification');
const gameSum = require('../../../model/dashBoard/BidSumGames');
const dateTime = require('node-datetime');
const admins = require("../../../model/dashBoard/AdminModel.js");
const { ObjectId } = require('mongodb');

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
            providerName,
            page = 1,
            limit = 10
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

        const skip = (page - 1) * limit;

        const winnerList = await gameBids
            .find({
                $and: [{ $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] }],
                providerId: provider,
                gameDate: gamedate,
                gameSession: sessionType
            })
            .sort({ bidDigit: -1 })
            .skip(skip)
            .limit(limit);

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
                    .sort({ bidDigit: -1 })
                    .skip(skip)
                    .limit(limit);

                winnerListClose.forEach((winner) => {
                    const gameType = winner.gameTypeName;
                    if (finalArray[gameType]) {
                        finalArray[gameType].push(winner);
                    }
                });
            }
        }

        const totalItems = await gameBids.countDocuments({
            $and: [{ $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] }],
            providerId: provider,
            gameDate: gamedate,
            gameSession: sessionType
        });

        const totalPages = Math.ceil(totalItems / limit);

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
            name: providerName,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
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

router.post("/remaningWinnerList", authMiddleware, async (req, res) => {
    try {
        const { providerId, date, session, page = 1, limit = 10 } = req.body;

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

        const skip = (page - 1) * limit;

        const winnerList = await gameBids.find({
            $and: [{ $or: [{ bidDigit: winningDigit }, { bidDigit: winningDigitFamily }] }],
            providerId,
            gameDate: date,
            gameSession: session,
            isPaymentDone: false
        }).sort({ bidDigit: -1 })
          .skip(skip)
          .limit(limit);

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
                }).sort({ bidDigit: -1 })
                  .skip(skip)
                  .limit(limit);

                winnerListClose.forEach((winner) => {
                    const gameType = winner.gameTypeName;
                    if (finalArray[gameType]) {
                        finalArray[gameType].push(winner);
                    }
                });
            }
        }

        const totalItems = await gameBids.countDocuments({
            $and: [{ $or: [{ bidDigit: winningDigit }, { bidDigit: winningDigitFamily }] }],
            providerId,
            gameDate: date,
            gameSession: session,
            isPaymentDone: false
        });

        const totalPages = Math.ceil(totalItems / limit);

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
            name: providerResult.providerName,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
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

router.post('/gameWinner', authMiddleware, async (req, res) => {
    try {
        const {
            providerId,
            windigit,
            gameDate,
            digitFamily,
            session,
            jodiDigit,
            halfSangam1,
            halfSangam2,
            fullSangam,
            resultId,
            adminId,
            page = 1,
            limit = 10
        } = req.body;

        let totalPoints = 0;
        let historyDataArray = [];
        let notificationArray = [];

        const winningCriteria = [{ bidDigit: windigit }];
        calculateSum(session, providerId, gameDate);

        if (digitFamily) winningCriteria.push({ bidDigit: digitFamily });
        if (session === 'Close') {
            if (jodiDigit) winningCriteria.push({ bidDigit: jodiDigit });
            if (halfSangam1) winningCriteria.push({ bidDigit: halfSangam1 });
            if (halfSangam2) winningCriteria.push({ bidDigit: halfSangam2 });
            if (fullSangam) winningCriteria.push({ bidDigit: fullSangam });
        }

        // Pagination logic
        const skip = (page - 1) * limit;

        const winningBids = await gameBids.find({
            $and: [
                { $or: winningCriteria },
                { providerId, gameDate, gameSession: session }
            ]
        }).skip(skip).limit(limit);
     
        if (winningBids.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No winning bids found for the given criteria.'
            });
        }

        const bidUpdates = [];
        const userUpdates = new Map();
        const currentTime = new Date();

        for (const bid of winningBids) {
            const { _id, biddingPoints, gameTypePrice, userId, providerName, gameTypeName } = bid;
            const winPoints = biddingPoints * gameTypePrice;

            totalPoints += winPoints;

            bidUpdates.push({
                updateOne: {
                    filter: { _id },
                    update: {
                        $set: {
                            winStatus: 1,
                            gameWinPoints: winPoints,
                            updatedAt: currentTime,
                            isPaymentDone: true
                        }
                    }
                }
            });

            if (userUpdates.has(userId.toString())) {
                userUpdates.get(userId.toString()).wallet_balance += winPoints;
            } else {
                userUpdates.set(userId.toString(), {
                    wallet_balance: winPoints,
                    details: { providerName, gameTypeName }
                });
            }

            historyDataArray.push({
                userId,
                bidId: _id,
                transaction_amount: winPoints,
                provider_id: providerId,
                previous_amount: 0,
                current_amount: 0,
                description: `Amount added for winning ${providerName} - ${gameTypeName}`,
                transaction_date: currentTime,  // Ensure `transaction_date` is included
                transaction_time: currentTime,  // Ensure `transaction_time` is included
                transaction_status: "Success",
                admin_id: adminId,
                addedBy_name: adminId ? (await admins.findById(adminId)).adminName : null,
            });
        }

        // Fetch user information including `username`
        const userIds = Array.from(userUpdates.keys());
        const users = await user.find({ _id: { $in: userIds } });

        // Loop through users and update `historyDataArray`
        for (const user of users) {
            const userId = user._id.toString();
            const updateData = userUpdates.get(userId);

            const previous_balance = user.wallet_balance;
            updateData.previous_balance = previous_balance;
            updateData.wallet_balance += previous_balance;

            historyDataArray = historyDataArray.map(entry =>
                entry.userId.toString() === userId
                    ? {
                        ...entry,
                        previous_amount: previous_balance,
                        current_amount: updateData.wallet_balance,
                        username: user.username  // Ensure the `username` field is added
                    }
                    : entry
            );

            if (user.firebaseId) {
                notificationArray.push({
                    firebaseId: user.firebaseId,
                    amount: updateData.wallet_balance
                });
            }
        }

        const userUpdateOperations = Array.from(userUpdates.entries()).map(([userId, { wallet_balance }]) => ({
            updateOne: {
                filter: { _id: new ObjectId(userId) },
                update: { $set: { wallet_balance } }
            }
        }));


        await Promise.all([
            gameBids.bulkWrite(bidUpdates),
            user.bulkWrite(userUpdateOperations),
            history.insertMany(historyDataArray),  
            gameResult.updateOne({ _id: resultId }, { $set: { status: 1 } }),
            gameBids.updateMany(
                { winStatus: 0, providerId, gameDate, gameSession: session },
                { $set: { winStatus: 2, updatedAt: currentTime } }
            )
        ]);

        // Send notifications
       // await notification(req, res, providerName, notificationArray);

        // Calculate total pages for pagination
        const totalItems = await gameBids.countDocuments({
            $and: [
                { $or: winningCriteria },
                { providerId, gameDate, gameSession: session }
            ]
        });

        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            status: true,
            message: 'Winning amounts distributed successfully.',
            totalPoints,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'An error occurred while distributing winnings.',
            error: error.message
        });
    }
});



router.post("/remainingGameWinner", authMiddleware, async (req, res) => {
    try {
        const { providerId, gameDate, session, adminId, jodiDigit, halfSangam1, halfSangam2, fullSangam, page = 1, limit = 10 } = req.body;

        if (!providerId || !gameDate || !session) {
            return res.status(400).json({
                status: false,
                message: "All fields are required",
            });
        }

        let historyDataArray = [];
        let notificationArray = [];
        let totalPoints = 0;

        calculateSum(session, providerId, gameDate);

        const providerResult = await gameResult.findOne({
            providerId,
            resultDate: gameDate,
            session,
        });
        if (!providerResult) {
            return res.status(404).json({
                status: false,
                message: "Result data not found",
            });
        }

        const digit = providerResult.winningDigit.toString();
        const digitFamily = providerResult.winningDigitFamily;

        let resultList = await gameBids.find({
            $and: [
                {
                    $or: [{ bidDigit: digit }, { bidDigit: digitFamily }],
                },
                { providerId, gameDate, gameSession: session },
            ],
        })
        .skip((page - 1) * limit) // Skip records for pagination
        .limit(limit); // Limit the number of records per page

        if (session === "Close") {
            const closeResults = await Promise.all([
                gameBids.find({
                    $and: [{ $or: [{ bidDigit: jodiDigit }] }, { providerId, gameDate, gameSession: session }],
                })
                .skip((page - 1) * limit)
                .limit(limit),

                gameBids.find({
                    $and: [
                        { $or: [{ bidDigit: halfSangam1 }, { bidDigit: halfSangam2 }, { bidDigit: fullSangam }] },
                        { providerId, gameDate, gameSession: session },
                    ],
                })
                .skip((page - 1) * limit)
                .limit(limit),
            ]);

            resultList = [...resultList, ...closeResults[0], ...closeResults[1]];
        }

        if (resultList.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No winning bids found",
            });
        }

        const currentTime = dateTime.create().format("Y-m-d H:M:S");

        for (const bid of resultList) {
            const { _id, biddingPoints, gameTypePrice, userId, providerName, gameTypeName } = bid;
            const winPoints = biddingPoints * gameTypePrice;

            totalPoints += winPoints;

            await gameBids.updateOne(
                { _id },
                {
                    $set: {
                        winStatus: 1,
                        gameWinPoints: winPoints,
                        updatedAt: currentTime,
                        isPaymentDone: true,
                    },
                }
            );

            const user = await user.findOne({ _id: userId });
            if (user) {
                const { wallet_balance, username, firebaseId } = user;
                const newBalance = wallet_balance + winPoints;

                await user.updateOne(
                    { _id: userId },
                    { $set: { wallet_balance: newBalance, wallet_bal_updated_at: currentTime } }
                );

                historyDataArray.push({
                    userId,
                    bidId: _id,
                    reqType: "main",
                    previous_amount: wallet_balance,
                    current_amount: newBalance,
                    provider_id: providerId,
                    transaction_amount: winPoints,
                    username,
                    provider_session: session,
                    description: `Amount added for winning ${providerName} - ${gameTypeName}`,
                    transaction_date: currentTime,
                    filterType: 1,
                    transaction_status: "Success",
                    win_revert_status: 1,
                    transaction_time: currentTime,
                    admin_id: adminId || null,
                    addedBy_name: adminId ? (await admins.findById(adminId)).adminName : null,
                });

                if (firebaseId) {
                    notificationArray.push({
                        firebaseId,
                        amount: winPoints,
                    });
                }
            }
        }

        if (historyDataArray.length > 0) {
            await history.insertMany(historyDataArray);
        }

        await gameResult.updateOne({ _id: providerResult._id }, { $set: { status: 1 } });

        await gameBids.updateMany(
            {
                winStatus: 0,
                providerId,
                gameDate,
                gameSession: session,
            },
            {
                $set: { winStatus: 2, updatedAt: currentTime },
            }
        );

        if (notificationArray.length > 0) {
            await notification(req, res, providerResult.providerName, notificationArray);
        }

        // Get total count for pagination
        const totalBids = await gameBids.countDocuments({
            $and: [
                { providerId, gameDate, gameSession: session },
                { $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] },
            ],
        });

        res.status(200).json({
            status: true,
            message: "Points distributed successfully",
            totalPoints,
            currentPage: page,
            totalPages: Math.ceil(totalBids / limit), // Calculate total pages
            totalBids,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
});


async function calculateSum(session, providerId, gameDate) {
    try {
        if (session == "Open") {
            const bids = await gameBids.find({ providerId: providerId, gameDate: gameDate, $and: [{ $or: [{ gameTypeName: "Jodi Digit" }, { gameTypeName: "Full Sangam Digits" }, { gameTypeName: "Half Sangam Digits" }] }] });

            let jodiPrice = 0; let halfSangam = 0; let fullSangam = 0;

            for (index in bids) {
                let bidDigit = bids[index].bidDigit;
                let strLength = bidDigit.length;
                let points = bids[index].biddingPoints;
                switch (strLength) {
                    case 2:
                        jodiPrice = jodiPrice + points;
                        break;
                    case 5:
                        halfSangam = halfSangam + points;
                        break;
                    case 7:
                        fullSangam = fullSangam + points;
                        break;
                }
            }

            const sum = new gameSum({
                providerId: providerId,
                date: gameDate,
                half_Sangamsum: halfSangam,
                full_Sangamsum: fullSangam,
                Jodi_Sum: jodiPrice
            })
            await sum.save();
        }
    } catch (error) {
        console.log(error);
    }
};

module.exports = router;
