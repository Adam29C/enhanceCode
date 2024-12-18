const express = require("express");
const router = express.Router();
const dateTime = require("node-datetime");
const moment = require('moment');
const gamesProvider = require("../../../model/games/Games_Provider");
const gameResult = require("../../../model/games/GameResult");
const authMiddleware = require("../../helpersModule/athetication")
const gameSetting =require("../../../model/games/AddSetting")
const gameDigit=require("../../../model/digits")
const gameBids = require("../../../model/games/gameBids");
const revertEntries = require("../../../model/revertPayment");
const history = require('../../../model/wallet_history');
const mainUser = require("../../../model/API/Users");
router.get("/", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted = dt.format("m/d/Y");
        const provider = await gamesProvider.find().sort({ _id: 1 });
        const result = await gameResult.find({ resultDate: formatted }).sort({ _id: -1 });

        if (result.length > 0) {
            return res.status(200).json({
                status: true,
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
                    status: true,
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
                    status: true,
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
            status: false,
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
                status: false,
                message: "Date query parameter is required",
            });
        }
        const results = await gameResult.find({ resultDate: date });
        const countResults = await gameResult.countDocuments({ resultDate: date });
        const providerCount = await gamesProvider.countDocuments();
        const pendingCount = providerCount * 2 - countResults;

        return res.status(200).json({
            status: true,
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
            status: false,
            message: "Error retrieving past results",
            error: error.message,
        });
    }
});

router.delete("/delete", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted1 = dt.format("m/d/Y I:M:S p");

        // Destructure the necessary fields from req.body
        const { resultId, providerId, session } = req.body;

        // Check if all required fields are provided
        if (!resultId || !providerId || !session) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields",
            });
        }

        // Proceed with the deletion of the result
        const dltResult = await gameResult.deleteOne({ _id: resultId });
        if (dltResult.deletedCount === 0) {
            return res.status(400).json({
                status: false,
                message: "Result not found or already deleted",
            });
        }

        // Handle session type logic
        if (session === "Open") {
            // If the session is "Open", update the provider with default result
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
            // If session is not "Open", fetch the provider and update accordingly
            const result = await gamesProvider.findOne({ _id: providerId });
            if (!result) {
                return res.status(400).json({
                    status: false,
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

        return res.status(200).json({
            status: true,
            message: "Result deleted successfully",
            data: dltResult,
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Server error. Please contact support.",
            error: e.message,
        });
    }
});


router.post("/digits", authMiddleware, async (req, res) => {
    try {
        const { digitArray } = req.body;
        if (!Array.isArray(digitArray) || digitArray.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Invalid input: Array of digits is required.",
            });
        }
        const insertedDigits = await gameDigit.insertMany(digitArray);
        return res.status(201).json({
            status: true,
            message: "Digits inserted successfully",
            data: insertedDigits,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: "Server error occurred while inserting digits.",
            error: err.message,
        });
    }
});

router.get("/revertPayment", authMiddleware, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted = dt.format("m/d/Y");
        const result = await gameResult
            .find({status:0})
            .sort({ _id: -1 })
            .where("resultDate")
            .equals(formatted);

        return res.status(201).json({
            status: true,
            message: "Digits inserted successfully",
            data: result,
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Server error occurred while processing the request.",
            error: e.message,
        });
    }
});

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { providerId, providerName, session, resultDate, winningDigit } = req.body
        if (!providerId || !providerName || !session || !resultDate || !winningDigit) {
            return res.status(400).json({
                status: false,
                message: "all field require in api req",
            });
        }
        const dt = dateTime.create();
        let sendStatus = 0;
        let savedGames;
        let finalResult;

        const formatted1 = dt.format("m/d/Y I:M:S p");
        const todayDay = dt.format("W");
        const todayDate = dt.format("m/d/Y");
        const currentTime = dt.format("I:M p");
        if (session === "Close") {
            const openResult = await gameResult.findOne({
                providerId: providerId,
                resultDate: resultDate,
                session: "Open",
            });
            if (!openResult) {
                return res.status(400).json({
                    status: false,
                    message: "Open result must be declared before declaring Close session.",
                    data: `Open Result Not Declared For: ${providerName}, Date: ${resultDate}`,
                });
            }
        }
        const findTime = await gameSetting.findOne(
            { providerId: providerId, gameDay: todayDay },
            session === "Open" ? { OBRT: 1 } : { CBRT: 1 }
        );
        if (!findTime) {
            return res.status(400).json({
                status: false,
                message: "Time settings not found for the provider and day.",
            });
        }

        const timeCheck = session === "Open" ? findTime.OBRT : findTime.CBRT;
        const beginningTime = moment(currentTime, "h:mm a");
        const endTime = moment(timeCheck, "h:mm a");
        if (todayDate === resultDate && beginningTime < endTime) {
            return res.status(400).json({
                status: false,
                message: "It is not time to declare the result yet.",
            });
        }
        const existingResult = await gameResult.findOne({
            providerId: providerId,
            resultDate: resultDate,
            session: session,
        });
        if (existingResult) {
            return res.status(200).json({
                status: false,
                message: `Details already filled for: ${providerName}, Session: ${session}, Date: ${resultDate}`,
            });
        }
        const digitFamily = await gameDigit.findOne({ Digit: winningDigit });
        if (!digitFamily) {
            return res.status(400).json({
                status: false,
                message: "Winning digit family not found.",
            });
        }
        const sumDigit = digitFamily.DigitFamily;
        const details = new gameResult({
            providerId: providerId,
            providerName: providerName,
            session: session,
            resultDate: resultDate,
            winningDigit: winningDigit,
            winningDigitFamily: sumDigit,
            status: "0",
            createdAt: formatted1,
        });
        savedGames = await details.save();

        if (session === "Open") {
            finalResult = `${winningDigit}-${sumDigit}`;
        } else {
            finalResult = `${sumDigit}-${winningDigit}`;
        }
        await gamesProvider.updateOne(
            { _id: providerId },
            {
                $set: {
                    providerResult: finalResult,
                    modifiedAt: formatted1,
                    resultStatus: 1,
                },
            }
        );
        sendStatus = 1;
        if (sendStatus === 1) {
            let token = [];
            //notification(req, res, finalResult, token);
            return res.status(201).json({
                status: true,
                message: "Result declared successfully.",
                data: {
                    providerId: providerId,
                    session: session,
                    resultDate: resultDate,
                    winningDigit: winningDigit,
                    resultId: savedGames._id,
                    status: savedGames.status,
                    digitFamily: sumDigit,
                    providerName: providerName,
                    time: savedGames.createdAt,
                },
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request.",
            error: error.message,
        });
    }
});

router.post("/paymentRevert", authMiddleware, async (req, res) => {
    try {
        const { resultId: id, providerId: provider, session: gameSession, digit, family: digitFamily, date: gameDate, adminId, adminName } = req.body;
        const dt = dateTime.create();
        const formattedDate = dt.format("d/m/Y");
        const formattedTime = dt.format("I:M:S p");

        let updateResult = "***-**-***";
        let statusValue = 0;
        let historyArray = [];
        let historyDataArray = [];

        const winnerList = await gameBids.find({
            providerId: provider,
            gameDate,
            gameSession,
            $or: [{ bidDigit: digit }, { bidDigit: digitFamily }],
        }).sort({ _id: -1, bidDigit: 1 });

        if (gameSession === "Close") {
            const openResult = await gameResult.findOne({
                providerId: provider,
                resultDate: gameDate,
                session: "Open",
            });

            if (openResult) {
                const { winningDigitFamily: openFamily, winningDigit: openPana } = openResult;
                updateResult = `${openPana}-${openFamily}`;
                const jodiDigit = `${openFamily}${digitFamily}`;
                const halfSangam1 = `${openFamily}-${digit}`;
                const halfSangam2 = `${openPana}-${digitFamily}`;
                const fullSangam = `${openPana}-${digit}`;

                const closeWinnerList = await gameBids.find({
                    providerId: provider,
                    gameDate,
                    gameSession,
                    $or: [
                        { bidDigit: jodiDigit },
                        { bidDigit: halfSangam1 },
                        { bidDigit: halfSangam2 },
                        { bidDigit: fullSangam },
                    ],
                }).sort({ bidDigit: 1 });

                for (const winner of closeWinnerList) {
                    const { _id: rowId, userId: userid, gameWinPoints: winAmount, providerId, gameTypeId, providerName, gameTypeName, userName, mobileNumber } = winner;

                    const user = await mainUser.findOne({ _id: userid }, { wallet_balance: 1 });
                    if (!user) continue;

                    const walletBal = user.wallet_balance;
                    const revertBalance = walletBal - winAmount;

                    await mainUser.updateOne({ _id: userid }, { $set: { wallet_balance: revertBalance } });

                    historyDataArray.push({
                        userId: userid,
                        bidId: rowId,
                        filterType: 8,
                        reqType: "main",
                        previous_amount: walletBal,
                        current_amount: revertBalance,
                        transaction_amount: winAmount,
                        provider_id: providerId,
                        username: userName,
                        provider_ssession: gameSession,
                        description: "Amount Reverted",
                        transaction_date: formattedDate,
                        transaction_status: "Success",
                        win_revert_status: 0,
                        transaction_time: formattedTime,
                        admin_id: adminId,
                        addedBy_name: adminName,
                    });

                    historyArray.push({
                        userId: userid,
                        providerId,
                        gameTypeId,
                        providerName,
                        username: userName,
                        mobileNumber,
                        gameTypeName,
                        wallet_bal_before: walletBal,
                        wallet_bal_after: revertBalance,
                        revert_amount: winAmount,
                        date: formattedDate,
                        dateTime: formattedTime,
                    });
                }
            }
            statusValue = 1;
        }

        for (const winner of winnerList) {
            const { _id: rowId, userId: userid, gameWinPoints: winAmount, providerId, gameTypeId, providerName, gameTypeName, userName, mobileNumber } = winner;

            const user = await mainUser.findOne({ _id: userid }, { wallet_balance: 1 });
            if (!user) continue;

            const walletBal = user.wallet_balance;
            const revertBalance = walletBal - winAmount;

            await mainUser.updateOne({ _id: userid }, { $set: { wallet_balance: revertBalance } });

            historyDataArray.push({
                userId: userid,
                bidId: rowId,
                filterType: 3,
                reqType: "main",
                previous_amount: walletBal,
                current_amount: revertBalance,
                transaction_amount: winAmount,
                provider_id: providerId,
                username: userName,
                provider_ssession: gameSession,
                description: "Amount Reverted",
                transaction_date: formattedDate,
                transaction_status: "Success",
                win_revert_status: 0,
                transaction_time: formattedTime,
                admin_id: adminId,
                addedBy_name: adminName,
            });

            historyArray.push({
                userId: userid,
                providerId,
                gameTypeId,
                providerName,
                username: userName,
                mobileNumber,
                gameTypeName,
                wallet_bal_before: walletBal,
                wallet_bal_after: revertBalance,
                revert_amount: winAmount,
                date: formattedDate,
                dateTime: formattedTime,
            });
        }
        await revertEntries.insertMany(historyArray);
        await history.insertMany(historyDataArray);

        await gameBids.updateMany({ providerId: provider, gameDate, gameSession }, { $set: { winStatus: 0, gameWinPoints: 0 } });
        await gamesProvider.updateOne({ _id: provider }, { $set: { providerResult: updateResult, resultStatus: statusValue } });

        await gameResult.deleteOne({ _id: id });
        return res.status(200).json({
            status: true,
            message: "Reverted Successfully"
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred",
            error: error.message,
        });
    }
});

router.get("/refundPayment", authMiddleware, async (req, res) => {
    try {
        const provider = await gamesProvider.find().sort({ _id: 1 });

        return res.status(201).json({
            status: true,
            message: "Provider List Successfully",
            data: provider,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred.",
            error: error.message
        });
    }
});

router.post("/refundList", authMiddleware, async (req, res) => {
    try {
        const { providerId, resultDate } = req.body;
        if (!providerId || !resultDate) {
            return res.status(400).json({
                status: false,
                message: "Provider ID and result date are required.",
            });
        }
        const userlist = await gameBids.find({
            providerId: providerId,
            gameDate: resultDate,
            winStatus: 0,
        });

        if (userlist.length === 0) {
            return res.status(400).json({
                status: true,
                message: "No records found for the specified criteria.",
            });
        }
        return res.status(200).json({
            status: true,
            message: "Refund list retrieved successfully.",
            data: userlist,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
            error: error.message,
        });
    }
});

router.post("/refundAll", authMiddleware, async (req, res) => {
    try {
        const { type, providerId, resultDate, providerName, userid, biddingPoints, adminId, adminName } = req.body;

        if (!providerId || !resultDate || !providerName) {
            return res.status(400).json({
                status: false,
                message: "Provider ID, result date, and provider name are required.",
            });
        }

        if (type === 1 && (!userid || !biddingPoints)) {
            return res.status(400).json({
                status: false,
                message: "User ID and bidding points are required for single refund.",
            });
        }

        const formattedDateTime = moment().format("DD/MM/YYYY hh:mm:ss A");
        const [transactionDate, transactionTime] = formattedDateTime.split(" ");
        let tokenArray = [];

        if (type === 1) {
            // Single user refund
            const findUser = await mainUser.findOne({ _id: userid }, { wallet_balance: 1 });
            if (!findUser) {
                return res.status(404).json({
                    status: false,
                    message: "User not found.",
                });
            }

            const currentAmount = findUser.wallet_balance;

            const singleUserUpdate = await mainUser.findOneAndUpdate(
                { _id: userid },
                {
                    $inc: { wallet_balance: parseInt(biddingPoints) },
                    wallet_bal_updated_at: formattedDateTime,
                },
                { new: true }
            );

            const firebaseId = singleUserUpdate.firebaseId;

            const singleUserBid = await gameBids.findOne({
                userId: userid,
                providerId,
                gameDate: resultDate,
                winStatus: 0,
            });

            if (!singleUserBid) {
                return res.status(404).json({
                    status: false,
                    message: "No bid found for the user with the given details.",
                });
            }

            await gameBids.deleteOne({
                userId: userid,
                providerId,
                gameDate: resultDate,
                winStatus: 0,
            });

            const historyEntry = new history({
                userId: userid,
                bidId: singleUserBid._id,
                reqType: "main",
                filterType: 3,
                previous_amount: currentAmount,
                current_amount: singleUserUpdate.wallet_balance,
                provider_id: singleUserBid.providerId,
                transaction_amount: biddingPoints,
                username: singleUserUpdate.name,
                description: `Amount Refunded For ${singleUserBid.providerName} Game`,
                transaction_date: transactionDate,
                transaction_status: "Success",
                transaction_time: transactionTime,
                admin_id: adminId,
                addedBy_name: adminName,
            });

            await historyEntry.save();

            tokenArray.push(firebaseId);

            const notificationBody = `Hello ${singleUserUpdate.username}, Your Bid Amount ${biddingPoints}/- RS is refunded successfully to your wallet!`;
            sendRefundNotification(tokenArray, singleUserBid.providerName, notificationBody);

        } else {
            const userlist = await gameBids.find({
                providerId,
                gameDate: resultDate,
                winStatus: 0,
            });

            if (!userlist.length) {
                return res.status(404).json({
                    status: false,
                    message: "No bids found for the specified provider and date.",
                });
            }

            for (const userBid of userlist) {
                const { _id: bidId, userId, biddingPoints } = userBid;

                const findUser = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
                if (!findUser) continue;

                const currentAmount = findUser.wallet_balance;

                const updatedUser = await mainUser.findOneAndUpdate(
                    { _id: userId },
                    {
                        $inc: { wallet_balance: parseInt(biddingPoints) },
                        wallet_bal_updated_at: formattedDateTime,
                    },
                    { new: true }
                );

                await gameBids.deleteOne({ _id: bidId });

                const historyEntry = new history({
                    userId,
                    bidId,
                    reqType: "main",
                    filterType: 3,
                    previous_amount: currentAmount,
                    current_amount: updatedUser.wallet_balance,
                    transaction_amount: biddingPoints,
                    username: updatedUser.username,
                    description: `Amount Refunded For ${providerName} Game`,
                    transaction_date: transactionDate,
                    transaction_status: "Success",
                    transaction_time: transactionTime,
                    admin_id: adminId,
                    addedBy_name: adminName,
                });

                await historyEntry.save();

                const firebaseId = updatedUser.firebaseId;
                if (firebaseId) tokenArray.push(firebaseId);
            }

            const notificationBody = `Hello Khatri Games User, Your refund for date: ${resultDate} has been processed successfully.`;
            sendRefundNotification(tokenArray, providerName, notificationBody);
        }

        return res.status(200).json({
            status: true,
            message: "Refund initiated successfully.",
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
            error: error.message,
        });
    }
});

async function sendRefundNotification(tokenArray, name, body) {
    if (!Array.isArray(tokenArray) || tokenArray.length === 0) {
        return {
            status: false,
            message: "No valid tokens provided for notification.",
        };
    }

    try {
        // Filter out empty tokens and divide tokens into chunks of 500 (Firebase limit).
        let finalArr = tokenArray.filter(token => token.trim() !== "");
        if (finalArr.length === 0) {
            return {
                status: false,
                message: "All provided tokens are empty or invalid.",
            };
        }

        let tokenChunks = lodash.chunk(finalArr, 500);
        let messageTemplate = {
            android: {
                priority: "high",
            },
            data: {
                title: `Refund For ${name}`,
                body: body,
                icon: "ic_launcher",
                type: "Notification",
            },
        };

        let failedTokens = [];

        // Loop through each chunk of tokens and send messages.
        for (let chunk of tokenChunks) {
            let message = { ...messageTemplate, tokens: chunk };
            try {
                //const response = await messaging.sendMulticast(message);

                // Check for falses and collect failed tokens.
                if (response.falseCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.error(`Failed to send to ${chunk[idx]}: ${resp.error}`);
                            failedTokens.push(chunk[idx]);
                        }
                    });
                }
            } catch (error) {
                console.error("Error sending message to chunk:", error);
                return {
                    status: false,
                    message: "Failed to send notifications due to an internal error.",
                    error: error.message,
                };
            }
        }

        // Return the status of the operation.
        if (failedTokens.length > 0) {
            return {
                status: 207,
                message: "Notifications sent with partial falses.",
                failedTokens: failedTokens,
            };
        }

        return {
            status: 200,
            message: "Notifications sent successfully.",
        };

    } catch (error) {
        console.error("Error in sendRefundNotification:", error);
        return {
            status: 500,
            message: "An unexpected error occurred while sending notifications.",
            error: error.message,
        };
    }
}

module.exports = router