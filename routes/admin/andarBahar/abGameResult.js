const router = require("express").Router();
const ABgamesProvider = require("../../../model/AndarBahar/ABProvider");
const ABgameResult = require("../../../model/AndarBahar/ABGameResult");
const ABbids = require("../../../model/AndarBahar/ABbids");
const noti = require("../../helpersModule/sendNotification");
const permission = require("../../helpersModule/permission");
const gameSetting = require("../../../model/AndarBahar/ABAddSetting");
const mainUser = require("../../../model/API/Users");
const revertEntries = require("../../../model/revertPayment");
const history = require("../../../model/wallet_history");
const moment = require("moment");
const messaging = require("../../../firebase");
const lodash = require('lodash');
const authMiddleware=require("../../helpersModule/athetication")

const gcm = require("node-gcm");
const sender = new gcm.Sender(
	"AAAAz-Vezi4:APA91bHNVKatfjZiHl13fcF1xzWK5pLOixdZlHE8KVRwIxVHLJdWGF973uErxgjL_HkzzD1K7a8oxgfjXp4StlVk_tNOTYdFkSdWe6vaKw6hVEDdt0Dw-J0rEeHpbozOMXd_Xlt-_dM1"
);
//const sender = new gcm.Sender(process.env.FIREBASE_SENDER_KEY);

router.get("/",authMiddleware, async (req, res) => {
    try {
        const name = req.query.name;
        if (name && typeof name !== "string") {
            return res.status(400).json({ status: false, message: "Invalid 'name' parameter" });
        }

        const formattedDate = moment().format("M/D/YYYY");

        const provider = await ABgamesProvider.aggregate([
            { $sort: { _id: 1 } }
        ]);

        const result = await ABgameResult.aggregate([
            { $match: { resultDate: formattedDate } },
            { $sort: { _id: -1 } }
        ]);

        return res.json({
            data: provider,
            result: result,
            title: "AB Game Result",
        });

    } catch (error) {
        console.error("Error fetching AB game result:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the data. Please try again later."
        });
    }
});

router.get("/revertPayment",authMiddleware, async (req, res) => {
    try {
        const formattedDate = moment().format("M/D/YYYY");

        const result = await ABgameResult.aggregate([
            { $match: { resultDate: formattedDate } },
            { $sort: { _id: -1 } }
        ]);

        if (result.length === 0) {
            return res.json({
                status: false,
                message: "No results found for the current date.",
                result: []
            });
        }

        return res.json({
            status: true,
            message: "Results fetched successfully.",
            result: result,
            title: "AB Revert Result"
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request. Please try again later.",
            error: e.message
        });
    }
});

router.delete("/delete", async (req, res) => {
    try {
        const { resultId, providerId, dltPast } = req.body;
        const formattedDate = moment().format("M/D/YYYY h:mm:ss A");

        const dltResult = await ABgameResult.deleteOne({ _id: resultId });

        if (dltPast == 0) {
            await ABgamesProvider.updateOne(
                { _id: providerId },
                {
                    $set: {
                        providerResult: "**",
                        modifiedAt: formattedDate,
                        resultStatus: 0,
                    },
                }
            );
        }

        res.json({
            status: true,
            message: "Result Deleted Successfully",
            data: dltResult,
        });
    } catch (e) {
        console.error("Error deleting result:", e);
        res.status(500).json({
            status: false,
            message: "Server Error. Contact Support.",
            error: e.message,
        });
    }
});




router.get("/pastResult",authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;
        
        // Validate 'date' query parameter
        if (!date || typeof date !== "string") {
            return res.status(400).json({
                status: false,
                message: "Invalid or missing 'date' query parameter."
            });
        }

        // Fetch results for the given date
        const result = await ABgameResult.find({ resultDate: date });
        const countResult = await ABgameResult.countDocuments({ resultDate: date });
        const providerCount = await ABgamesProvider.countDocuments();
        const pendingCount = providerCount - countResult;

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No results found for the specified date.",
                date: date
            });
        }

        return res.json({
            status: true,
            message: "Results fetched successfully.",
            data: {
                result: result,
                countResult: countResult,
                providerCount: providerCount,
                pendingCount: pendingCount
            }
        });

    } catch (error) {
        console.error("Error fetching past results:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching past results. Please try again later.",
            error: error.message
        });
    }
});

router.get("/getWinner",authMiddleware,async (req, res) => {
    try {
        const formattedDate = moment().format("M/D/YYYY");

        const todayResult = await ABgameResult.findOne({ resultDate: formattedDate });

        if (!todayResult) {
            return res.status(404).json({
                status: false,
                message: "No result found for today.",
                date: formattedDate
            });
        }

        const winDigit = todayResult.winningDigit;

        const winnerList = await ABbids.find({
            bidDigit: winDigit,
            gameDate: formattedDate
        });

        if (winnerList.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No winners found for today's result.",
                date: formattedDate,
                winningDigit: winDigit
            });
        }

        return res.json({
            status: true,
            message: "Winners fetched successfully.",
            data: winnerList
        });

    } catch (error) {
        console.error("Error fetching winners:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the winners. Please try again later.",
            error: error.message
        });
    }
});

router.post("/paymentRevert",authMiddleware,async (req, res) => {
    try {
        const { resultId, providerId, digit, date } = req.body;
        if (!resultId || !providerId || !digit || !date) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields: resultId, providerId, digit, or date."
            });
        }

        const formattedDate = moment().format("D/M/YYYY");
        const formattedTime = moment().format("HH:mm:ss A");

        let historyArray = [];
        let historyDataArray = [];
        const updateResult = "**"; 

        const winnerList = await ABbids.find({
            providerId,
            gameDate: date,
            bidDigit: digit,
        }).sort({ _id: -1, bidDigit: 1 });

        if (winnerList.length > 0) {

            for (const winner of winnerList) {
                const { _id: rowId, userId, gameWinPoints, providerId, gameTypeId, providerName, gameTypeName, userName, mobileNumber } = winner;

                const user = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
                const walletBal = user.wallet_balance;

                const revertBalance = walletBal - gameWinPoints;

                await mainUser.updateOne({ _id: userId }, { $set: { wallet_balance: revertBalance } });

                const transactionHistory = {
                    userId,
                    bidId: rowId,
                    filterType: 8,
                    reqType: "andarBahar",
                    previous_amount: walletBal,
                    current_amount: revertBalance,
                    transaction_amount: gameWinPoints,
                    provider_id: providerId,
                    username: userName,
                    description: "Amount Reverted",
                    transaction_date: formattedDate,
                    transaction_status: "Success",
                    win_revert_status: 0,
                    transaction_time: formattedTime,
                    admin_id: req.user.id,  
                    addedBy_name: req.user.name  
                   
                };

                historyDataArray.push(transactionHistory);

                const providerHistory = {
                    userId,
                    providerId,
                    gameTypeId,
                    providerName,
                    username: userName,
                    mobileNumber,
                    gameTypeName,
                    wallet_bal_before: walletBal,
                    wallet_bal_after: revertBalance,
                    revert_amount: gameWinPoints,
                    date: formattedDate,
                    dateTime: formattedTime,
                };
                historyArray.push(providerHistory);
            }
        }
        await revertEntries.insertMany(historyArray);
        await history.insertMany(historyDataArray);

        await ABbids.updateMany(
            { providerId, gameDate: date },
            { $set: { winStatus: 0, gameWinPoints: 0 } }
        );

        await ABgamesProvider.updateOne(
            { _id: providerId },
            { $set: { providerResult: updateResult, resultStatus: 0 } }
        );

        await ABgameResult.deleteOne({ _id: resultId });

        return res.json({
            status: true,
            message: "Payment reverted successfully."
        });

    } catch (error) {
        console.error("Error in payment revert:", error);

        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the payment revert. Please try again later.",
            error: error.message
        });
    }
});

router.get("/refundPayment",authMiddleware, async (req, res) => {
    try {
        const provider = await ABgamesProvider.find().sort({ _id: 1 });
        return res.json({
            status: true,
            title: "Refund Payment",
            data: provider
        });

    } catch (error) {
        console.error("Error in refundPayment API:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request. Please try again later.",
            error: error.message
        });
    }
});

router.post("/refundList",authMiddleware, async (req, res) => {
    try {
        const { providerId, resultDate: gameDate } = req.body;
        const userlist = await ABbids.find({
            providerId: providerId,
            gameDate: gameDate,
            winStatus: 0, 
        });
        return res.json({
            status: true,
            data: userlist,
        });

    } catch (error) {
        console.error("Error in refundList API:", error);
        return res.json({
            status: false,
            message: "Something Went Wrong. Please contact support.",
            err: error.message,
        });
    }
});

router.post("/refundAll",authMiddleware, async (req, res) => {
    try {
        const { type, providerId, resultDate, providerName, userId, biddingPoints } = req.body;
        const formatted2 = moment().format("DD/MM/YYYY hh:mm:ss A");
        let tokenArray = [];
        console.log("a")
        if (type === 1) {
            // Single user refund
            const findUser = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
            const current_amount = findUser.wallet_balance;

            const updatedUser = await mainUser.findOneAndUpdate(
                { _id: userId },
                {
                    $inc: { wallet_balance: parseInt(biddingPoints) },
                    wallet_bal_updated_at: formatted2,
                },
                { new: true, upsert: true }
            );

            const firebaseId = updatedUser.firebaseId;

            const userBid = await ABbids.findOne({ 
                userId: userId, 
                providerId: providerId, 
                gameDate: resultDate, 
                winStatus: 0 
            });

            await ABbids.deleteOne({
                userId: userId,
                providerId: providerId,
                gameDate: resultDate,
                winStatus: 0
            });

            const dateTime = formatted2.split(" ");
            const historyEntry = new history({
                userId: userId,
                bidId: userBid._id,
                reqType: "andarBahar",
                filterType: 3,
                previous_amount: current_amount,
                current_amount: updatedUser.wallet_balance,
                provider_id: userBid.providerId,
                transaction_amount: biddingPoints,
                username: updatedUser.name,
                description: `Amount Refunded For ${userBid.providerName} Game`,
                transaction_date: dateTime[0],
                transaction_status: "Success",
                transaction_time: dateTime[1],
                admin_id: updatedUser.user_id, // Use adminId if applicable, for now using userId.
                addedBy_name: updatedUser.username, // Use adminName if applicable, for now using username.
            });

            await historyEntry.save();
            tokenArray.push(firebaseId);
            
            const body = `Hello ${updatedUser.username}, Your Bid Amount ${biddingPoints}/- RS Is Refund Successful In Your Wallet!`;
            sendRefundNotification(tokenArray, userBid.providerName, body);

        } else {
            // Bulk refund for all users
            const userList = await ABbids.find({
                providerId: providerId,
                gameDate: resultDate,
                winStatus: 0,
            });

            if (userList.length > 0) {
                for (let index = 0; index < userList.length; index++) {
                    const userBid = userList[index];
                    const userId = userBid.userId;
                    const biddingPoints = userBid.biddingPoints;

                    const findUser = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
                    const current_amount = findUser.wallet_balance;

                    const updatedUser = await mainUser.findOneAndUpdate(
                        { _id: userId },
                        {
                            $inc: { wallet_balance: parseInt(biddingPoints) },
                            wallet_bal_updated_at: formatted2,
                        },
                        { new: true, upsert: true }
                    );

                    const dateTime = formatted2.split(" ");
                    const historyEntry = new history({
                        userId: userId,
                        bidId: userBid._id,
                        reqType: "andarBahar",
                        filterType: 3,
                        previous_amount: current_amount,
                        current_amount: updatedUser.wallet_balance,
                        transaction_amount: biddingPoints,
                        username: updatedUser.username,
                        description: `Amount Refunded For ${providerName} Game`,
                        transaction_date: dateTime[0],
                        transaction_status: "Success",
                        transaction_time: `${dateTime[1]} ${dateTime[2]}`,
                        admin_id: updatedUser.user_id, // Use adminId if applicable, for now using userId.
                        addedBy_name: updatedUser.username, // Use adminName if applicable, for now using username.
                    });

                    await historyEntry.save();
                    await ABbids.deleteOne({ _id: userBid._id });

                    let firebaseId = updatedUser.firebaseId;
                    tokenArray.push(firebaseId);
                }

                const body = `Hello Khatri User, Your Refund For Date : ${resultDate}, is Processed Successfully`;
                sendRefundNotification(tokenArray, providerName, body);
            }
        }

        res.json({
            status: true,
            message: "Refund Initiated Successfully",
        });
    } catch (error) {
        console.error("Error in refundAll API:", error);
        res.json({
            status: false,
            message: "Something Went Wrong. Please contact support.",
            error: error.message,
        });
    }
});

async function sendRefundNotification(tokenArray, name, body) {
	let finalArr = []
	for (let arr of tokenArray) {
		if (arr !== "") {
			finalArr.push(arr)
		}
	}
	let message = {
		android: {
			priority: 'high',
		},
		data: {
			title: `Refund Jackpot game (${name})`,
			body: body,
			icon: 'ic_launcher',
			type: 'Notification',
		},
		token: finalArr,
	};
	try {
		const response = await messaging.sendMulticast(message);
		console.log('Successfully sent message:', response);
		if (response.failureCount > 0) {
			response.responses.forEach((resp, idx) => {
				if (!resp.success) {
					console.error(`Failed to send to ${tokenArr[idx]}: ${resp.error}`);
				}
			});
		}
	} catch (error) {
		console.log('Error sending message:', error);
	}
}

async function sendRefundNotification(tokenArray, name, body) {
	let finalArr = tokenArray.filter(token => token !== "");
	let tokenChunks = lodash.chunk(finalArr, 500);
	let message = {
		android: {
			priority: 'high',
		},
		data: {
			title: `Refund Jackpot game (${name})`,
			body: body,
			icon: 'ic_launcher',
			type: 'Notification',
		},
	};
	for (let chunk of tokenChunks) {
		message.tokens = chunk;
        console.log(message,"message")
		try {
			const response = await messaging.sendMulticast(message);
			if (response.failureCount > 0) {
				response.responses.forEach((resp, idx) => {
					if (!resp.success) {
						console.error(`Failed to send to ${chunk[idx]}: ${resp.error}`);
					}
				});
			}
		} catch (error) {
			console.log('Error sending message:', error);
		}
	}
}

module.exports = router;

