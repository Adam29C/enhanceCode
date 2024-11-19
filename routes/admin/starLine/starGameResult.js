const router = require("express").Router();
const StarlineProvider = require("../../../model/starline/Starline_Provider");
const StarlinegameResult = require("../../../model/starline/GameResult");
const starBids = require("../../../model/starline/StarlineBids");
const gameDigit = require("../../../model/digits");
const dateTime = require("node-datetime");
const noti = require("../../helpersModule/sendNotification");
const gameSetting = require("../../../model/starline/AddSetting");
const mainUser = require("../../../model/API/Users");
const revertEntries = require("../../../model/revertPayment");
const history = require("../../../model/wallet_history");
const moment = require("moment");
const messaging = require("../../../firebase");
const lodash = require("lodash");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
  const formatted = moment().format("M/D/YYYY");
  try {
    const provider = await StarlineProvider.find().sort({ _id: 1 });
    const result = await StarlinegameResult.find({
      resultDate: formatted,
    }).sort({ _id: -1 });

    if (!provider || provider.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No providers found.",
      });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No game results found for today.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Starline game results fetched successfully.",
      data: {
        providers: provider,
        results: result,
      },
    });
  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching the data.",
      error: e.message,
    });
  }
});

router.get("/revertPayment",authMiddleware, async (req, res) => {
  try {
    const formatted = moment().format("MM/DD/YYYY");
    const result = await StarlinegameResult.find()
      .sort({ _id: -1 })
      .where("resultDate")
      .equals(formatted);

    return res.status(200).json({
      status: true,
      message: "Starline Payment Report fetched successfully.",
      data: result,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching the data.",
      error: e.message,
    });
  }
});

router.delete("/delete",authMiddleware, async (req, res) => {
  try {
    const { resultId, providerId, dltPast } = req.body;
    const formatted1 = moment().format("MM/DD/YYYY hh:mm:ss A");

    const dltResult = await StarlinegameResult.deleteOne({ _id: resultId });

    if (dltPast === 0) {
      await StarlineProvider.updateOne(
        { _id: providerId },
        {
          $set: {
            providerResult: "***-**",
            modifiedAt: formatted1,
            resultStatus: 0,
          },
        }
      );
    }

    return res.status(200).json({
      status: true,
      message: "Result deleted successfully.",
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

//ye api inhance hui hai but testing karna hai ye game result ko add karne baki api hai
router.post("/",authMiddleware, async (req, res) => {
  const { providerId, resultDate, winningDigit, session } = req.body;

  if (!providerId || !resultDate || !winningDigit || !session) {
    return res.status(400).json({
      status: false,
      message:
        "Missing required fields: providerId, resultDate, winningDigit, session",
    });
  }

  try {
    const [id, name] = providerId.split("|");
    const formattedTime = moment().format("MM/DD/YYYY hh:mm:ss A");
    const todayDay = moment().format("W");
    const todayDate = moment().format("MM/DD/YYYY");
    const currentTime = moment().format("hh:mm a");

    // Fetch game settings for the provider
    const findTime = await gameSetting.findOne(
      { providerId: id, gameDay: todayDay },
      { OBRT: 1 }
    );

    if (!findTime) {
      return res.status(404).json({
        status: false,
        message: `Game settings not found for provider ID: ${id}`,
      });
    }

    const timeCheck = findTime.OBRT;
    const beginningTime = moment(currentTime, "hh:mm a");
    const endTime = moment(timeCheck, "hh:mm a");

    // Check if the result date matches today's date
    if (todayDate === resultDate) {
      if (beginningTime >= endTime) {
        const existingResult = await StarlinegameResult.find({
          providerId: id,
          resultDate,
        });

        if (existingResult.length === 0) {
          const digitFamily = await gameDigit.findOne({ Digit: winningDigit });
          if (!digitFamily) {
            return res.status(404).json({
              status: false,
              message: `Digit family not found for winning digit: ${winningDigit}`,
            });
          }

          const sumDigit = digitFamily.DigitFamily;

          // Save the game result
          const gameResult = new StarlinegameResult({
            providerId: id,
            providerName: name,
            session,
            resultDate,
            winningDigit,
            winningDigitFamily: sumDigit,
            status: 0,
            createdAt: formattedTime,
          });

          const savedGame = await gameResult.save();
          const result = `${winningDigit}-${sumDigit}`;

          // Update the provider with the result
          await StarlineProvider.updateOne(
            { _id: id },
            {
              $set: {
                providerResult: result,
                modifiedAt: formattedTime,
                resultStatus: 1,
              },
            }
          );

          const responseData = {
            providerId: id,
            resultDate,
            status: 0,
            winningDigit,
            digitFamily: sumDigit,
            resultId: savedGame._id,
            providerName: name,
            time: formattedTime,
          };

          // Send notifications
          let token = [];
          noti(req, res, result, token);

          return res.status(200).json({
            status: true,
            message: "Result declared successfully",
            data: responseData,
          });
        } else {
          return res.status(400).json({
            status: false,
            message: `Result for provider ${name}, session ${session}, date ${resultDate} already declared.`,
          });
        }
      } else {
        return res.status(400).json({
          status: false,
          message: "It is not yet time to declare the result.",
        });
      }
    } else {
      // For dates that are not today, check if the result already exists
      const existingResult = await StarlinegameResult.find({
        providerId: id,
        resultDate,
      });

      if (existingResult.length === 0) {
        const digitFamily = await gameDigit.findOne({ Digit: winningDigit });
        if (!digitFamily) {
          return res.status(404).json({
            status: false,
            message: `Digit family not found for winning digit: ${winningDigit}`,
          });
        }

        const sumDigit = digitFamily.DigitFamily;

        // Save the game result
        const gameResult = new StarlinegameResult({
          providerId: id,
          providerName: name,
          session,
          resultDate,
          winningDigit,
          winningDigitFamily: sumDigit,
          status: 0,
        });

        const savedGame = await gameResult.save();

        // Calculate the count for pending and completed results
        const countResult = await StarlinegameResult.find({
          resultDate,
        }).countDocuments();
        const providerCount = await StarlineProvider.find().countDocuments();
        const pendingCount = providerCount - countResult;

        return res.status(200).json({
          status: true,
          message: "Result declared successfully",
          data: {
            countResult,
            providerCount,
            pendingCount,
          },
        });
      } else {
        return res.status(400).json({
          status: false,
          message: `Result for provider ${name}, session ${session}, date ${resultDate} already declared.`,
        });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
});

router.get("/pastResult",authMiddleware,  async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        status: "Failure",
        message: "Date query parameter is required",
      });
    }

    const result = await StarlinegameResult.find({ resultDate: date });

    const countResult = await StarlinegameResult.countDocuments({
      resultDate: date,
    });
    const providerCount = await StarlineProvider.countDocuments();
    const pendingCount = providerCount - countResult;

    return res.status(200).json({
      status: "Success",
      message: "Results fetched successfully",
      data: {
        result: result,
        countResult: countResult,
        providerCount: providerCount,
        pendingCount: pendingCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "Failure",
      message: "An error occurred while fetching the past results.",
      error: error.message,
    });
  }
});

//ye api inhance hui hai but testing karna hai ye payment Revert ki api hai
router.post("/paymentRevert",authMiddleware, async (req, res) => {
  try {
      const { resultId, providerId, digit, date, family } = req.body;

      // Check if required fields are provided
      if (!resultId || !providerId || !digit || !date || !family) {
          return res.status(400).json({
              status: "Failure",
              message: "Missing required parameters: resultId, providerId, digit, date, family"
          });
      }

      const dt = dateTime.create();
      const formattedDate = dt.format("d/m/Y");
      const formattedTime = dt.format("I:M:S p");

      // Initialize the update result placeholder
      const updateResult = "***-*";
      
      // Fetch the list of winning bids
      const winnerList = await starBids
          .find({
              providerId: providerId,
              gameDate: date,
              $or: [{ bidDigit: digit }, { bidDigit: family }]
          })
          .sort({ _id: -1, bidDigit: 1 });

      if (winnerList.length > 0) {
          let historyArray = [];
          let historyDataArray = [];

          for (let index = 0; index < winnerList.length; index++) {
              const winner = winnerList[index];
              const { _id: rowId, userId, gameWinPoints, providerName, gameTypeName, userName, mobileNumber, gameTypeId } = winner;

              // Fetch the user's wallet balance
              const user = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
              const walletBal = user.wallet_balance;
              const revertBalance = walletBal - gameWinPoints;

              // Update the wallet balance of the user
              await mainUser.updateOne({ _id: userId }, { $set: { wallet_balance: revertBalance } });

              // Create transaction history for revert
              const historyEntry = {
                  userId,
                  bidId: rowId,
                  filterType: 8,  // Assuming 8 represents a specific type of transaction
                  reqType: "star",
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
                  admin_id: req.user.id,  // Assuming the admin ID is in the request object from `authMiddleware`
                  addedBy_name: req.user.name  // Assuming the admin name is in the request object
              };

              historyDataArray.push(historyEntry);

              // History entry for wallet balance update
              const walletHistoryEntry = {
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
                  dateTime: formattedTime
              };

              historyArray.push(walletHistoryEntry);
          }

          // Insert history entries into respective collections
          await revertEntries.insertMany(historyArray);
          await history.insertMany(historyDataArray);

          // Update all winning bids to reset win status and game win points
          await starBids.updateMany(
              { providerId: providerId, gameDate: date },
              { $set: { winStatus: 0, gameWinPoints: 0 } }
          );

          // Update provider result
          await StarlineProvider.updateOne(
              { _id: providerId },
              { $set: { providerResult: updateResult, resultStatus: 0 } }
          );

          // Delete the game result entry
          await StarlinegameResult.deleteOne({ _id: resultId });

          return res.status(200).json({
              status: 1,
              message: "Reverted Successfully"
          });
      } else {
          return res.status(404).json({
              status: 0,
              message: "No matching winner found for the given criteria."
          });
      }
  } catch (error) {
      console.error("Error during payment revert:", error);

      return res.status(500).json({
          status: 0,
          message: "An error occurred while processing the payment revert.",
          error: error.message
      });
  }
});

router.get("/refundPayment",authMiddleware, async (req, res) => {
  try {
      const provider = await StarlineProvider.find().sort({ _id: 1 });
      return res.status(200).json({
          status: false,
          message: "Refund Payment Data",
          data: provider,
          title: "Refund Payment"
      });
  } catch (error) {
      return res.status(500).json({
          status: 0,
          message: "An error occurred while fetching refund payment data.",
          error: error.message
      });
  }
});

router.post("/refundList",authMiddleware, async (req, res) => {
  try {
      const { providerId, resultDate } = req.body;
      const userlist = await starBids.find({
          providerId: providerId,
          gameDate: resultDate,
          winStatus: 0,
      });

      return res.status(200).json({
          status: true,
          message: "Refund list fetched successfully",
          data: userlist,
      });
  } catch (error) {
      return res.status(500).json({
          status: false,
          message: "Something went wrong, please contact support",
          error: error.message,
      });
  }
});

//ye api inhance hui hai but testing karna hai ye refundAll ki api hai
router.post("/refundAll",authMiddleware, async (req, res) => {
  try {
      const { type, providerId, resultDate, providerName, userId, biddingPoints } = req.body;
      const formatted2 = moment().format("DD/MM/YYYY hh:mm:ss A");
      let tokenArray = [];

      // Single user refund (type 1)
      if (type == 1) {
          const findUser = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
          const currentAmount = findUser.wallet_balance;

          // Update user wallet balance
          const singleUserUpdate = await mainUser.findOneAndUpdate(
              { _id: userId },
              {
                  $inc: { wallet_balance: parseInt(biddingPoints) },
                  wallet_bal_updated_at: formatted2,
              },
              { new: true, upsert: true }
          );

          // Find the specific bid to update
          const singleUserBidUpdate = await starBids.findOne({
              userId: userId,
              providerId: providerId,
              gameDate: resultDate,
              winStatus: 0,
          });

          // Delete the bid entry
          await starBids.deleteOne({
              userId: userId,
              providerId: providerId,
              gameDate: resultDate,
              winStatus: 0,
          });

          // Create a history entry for this refund
          const dateTime = formatted2.split(" ");
          const historyEntry = new history({
              userId: userId,
              bidId: singleUserBidUpdate._id,
              reqType: "star",
              filterType: 3,
              previous_amount: currentAmount,
              current_amount: singleUserUpdate.wallet_balance,
              provider_id: singleUserBidUpdate.providerId,
              transaction_amount: biddingPoints,
              username: singleUserUpdate.name,
              description: `Amount Refunded For ${singleUserBidUpdate.providerName} Game`,
              transaction_date: dateTime[0],
              transaction_status: "Success",
              transaction_time: dateTime[1],
          });

          // Save the history entry
          await history.save(historyEntry);

          // Send notification
          tokenArray.push(singleUserUpdate.firebaseId);
          const body = `Hello ${singleUserUpdate.username}, Refund Successfully Done For ${singleUserBidUpdate.providerName}`;
          sendRefundNotification(tokenArray, providerName, body);
      } else {
          // Bulk refund (all users)
          const userlist = await starBids.find({
              providerId: providerId,
              gameDate: resultDate,
              winStatus: 0,
          });

          if (userlist.length > 0) {
              for (const user of userlist) {
                  const userId = user.userId;
                  const biddingPoints = user.biddingPoints;
                  const findUser = await mainUser.findOne({ _id: userId }, { wallet_balance: 1 });
                  const currentAmount = findUser.wallet_balance;

                  // Update user wallet balance
                  const singleUserUpdate = await mainUser.findOneAndUpdate(
                      { _id: userId },
                      {
                          $inc: { wallet_balance: parseInt(biddingPoints) },
                          wallet_bal_updated_at: formatted2,
                      },
                      { new: true, upsert: true }
                  );

                  // Create a history entry for this refund
                  const dateTime = formatted2.split(" ");
                  const historyEntry = new history({
                      userId: userId,
                      bidId: user._id,
                      filterType: 3,
                      reqType: "star",
                      previous_amount: currentAmount,
                      current_amount: singleUserUpdate.wallet_balance,
                      transaction_amount: biddingPoints,
                      username: singleUserUpdate.username,
                      description: `Amount Refunded For ${providerName} Game`,
                      transaction_date: dateTime[0],
                      transaction_status: "Success",
                      transaction_time: dateTime[1] + " " + dateTime[2],
                  });

                  // Save the history entry
                  await history.save(historyEntry);

                  // Delete the bid entry
                  await starBids.deleteOne({ _id: user._id });

                  // Send notification
                  tokenArray.push(singleUserUpdate.firebaseId);
              }

              // Send bulk refund notification
              const body = `Hello Khatri Games User, Your Refund For Date: ${resultDate} is Processed Successfully`;
              sendRefundNotification(tokenArray, providerName, body);
          }
      }

      // Success response
      res.json({
          status: true,
          message: "Refund Initiated Successfully",
      });
  } catch (error) {
      // Error response
      res.json({
          status: false,
          message: "Something Went Wrong, Contact Support",
          error: error.message,
      });
  }
});

async function sendRefundNotification(tokenArray, name, body) {
  let finalArr = tokenArray.filter(token => token !== "");
  let tokenChunks = lodash.chunk(finalArr, 500);
  let message = {
      android: {
          priority: 'high',
      },
      data: {
    title: `Refund For ${name}`,
    body: body,
    icon: 'ic_launcher',
    type: 'Notification',
      },
  };
  for (let chunk of tokenChunks) {
      message.tokens = chunk;
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
