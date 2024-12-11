const router = require("express").Router();
const starBIds = require("../../../model/starline/StarlineBids");
const authMiddleware = require("../../helpersModule/athetication")
const user = require('../../../model/API/Users');
const history = require('../../../model/wallet_history');
const starResult = require('../../../model/starline/GameResult');
const notification = require('../../helpersModule/sendNotification');
const dateTime = require('node-datetime');
const admins = require("../../../model/dashBoard/AdminModel.js");

router.post("/starLineWinnerList", authMiddleware, async (req, res) => {
    try {
        const { digit, provider, date, resultId, resultStatus, digitFamily, page = 1, limit = 10 } = req.body;

        if (!digit || !provider || !date || !resultId || resultStatus === undefined) {
            return res.status(400).json({
                status: false,
                message: "All required fields must be provided."
            });
        }

        // Get the total count of winners for pagination
        const totalCount = await starBIds.countDocuments({
            providerId: provider,
            gameDate: date,
            $and: [{ $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] }]
        });

        // Fetch the paginated winner list
        const winnerList = await starBIds
            .find({
                providerId: provider,
                gameDate: date,
                $and: [{ $or: [{ bidDigit: digit }, { bidDigit: digitFamily }] }]
            })
            .sort({ _id: -1 })
            .skip((page - 1) * limit) // Skip records for pagination
            .limit(limit); // Limit the number of records per page

        const pageData = {
            winnerList,
            resultId,
            resultStatus: parseInt(resultStatus, 10),
            winDigit: digit,
            digitFamily,
            gameDate: date,
            provider
        };

        return res.status(200).json({
            status: true,
            message: "Star Game Winner List",
            data: pageData,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit), // Calculate total pages
            totalCount
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred. Please contact support.",
            error: error.message
        });
    }
});

router.post('/starWinners', authMiddleware, async (req, res) => {
    try {
        const { providerId, windigit, gameDate, digitFamily, resultId, adminId, page = 1, limit = 10 } = req.body;
        let namefor = '';
        let historyDataArray = [];
        let tokenArray = [];

        // Count the total number of results for pagination
        const totalCount = await starBIds.countDocuments({
            $and: [
                { $or: [{ bidDigit: windigit }, { bidDigit: digitFamily }] }
            ],
            providerId: providerId,
            gameDate: gameDate
        });

        // Fetch the paginated results
        const resultList = await starBIds.find({
            $and: [
                { $or: [{ bidDigit: windigit }, { bidDigit: digitFamily }] }
            ],
            providerId: providerId,
            gameDate: gameDate
        })
        .sort({ _id: -1 })
        .skip((page - 1) * limit) // Skip records for pagination
        .limit(limit); // Limit the number of records per page

        const dt0 = dateTime.create();
        const todayDate = dt0.format('d/m/Y');
        const formatted = dt0.format('m/d/Y I:M:S p');
        const formatted2 = dt0.format('d/m/Y I:M:S p');

        for (let index in resultList) {
            let bidPoint = resultList[index].biddingPoints;
            let gamePrice = resultList[index].gameTypePrice;
            let bal = bidPoint * gamePrice;
            let userID = resultList[index].userId;
            let id = resultList[index]._id;
            let gameName = resultList[index].providerName;
            let gameType = resultList[index].gameTypeName;

            namefor = 'Starline (' + gameName + ')';

            await starBIds.updateOne(
                { _id: id },
                {
                    $set: {
                        winStatus: 1,
                        gameWinPoints: bal,
                        updatedAt: formatted
                    }
                });

            const userBal = await user.findOne({ _id: userID }, {
                wallet_balance: 1, username: 1,
                firebaseId: 1
            });

            const previous_amount = userBal.wallet_balance;
            const current_amount = previous_amount + bal;
            const name = userBal.username;
            const userToken = userBal.firebaseId;

            await user.updateOne(
                { _id: userID },
                { $inc: { wallet_balance: bal } },
                {
                    $set: {
                        wallet_bal_updated_at: formatted2
                    }
                });

            let dt1 = dateTime.create();
            let time = dt1.format('I:M:S p');
            let arrValue = {
                userId: userID,
                bidId: id,
                reqType: "star",
                previous_amount: previous_amount,
                current_amount: current_amount,
                provider_id: providerId,
                transaction_amount: bal,
                username: name,
                description: "Amount Added To Wallet For " + gameName + " : " + gameType + " Khatri Starline Game Win",
                transaction_date: todayDate,
                filterType: 1,
                transaction_time: time,
                transaction_status: "Success",
                win_revert_status: 1,
                admin_id: adminId,
                addedBy_name: adminId ? (await admins.findById(adminId)).adminName : null,
            };
            historyDataArray.push(arrValue);

            let token = {
                firebaseId: userToken,
                amount: bal
            };
            tokenArray.push(token);
        }

        await history.insertMany(historyDataArray);

        await starResult.updateOne(
            { _id: resultId },
            { $set: { status: 1 } });

        await starBIds.updateMany(
            { providerId: providerId, gameDate: gameDate, winStatus: 0, gameSession: 'Open' },
            {
                $set: {
                    winStatus: 2,
                    updatedAt: formatted
                }
            }
        );

        let sumDgit = namefor;
        await notification(req, res, sumDgit, tokenArray);

        res.status(200).send({
            status: true,
            message: 'Points Added Successfully',
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit), // Calculate total pages
            totalCount
        });

    } catch (error) {
        res.status(500).send({
            status: false,
            message: 'Something Bad Happened',
            error: error
        });
    }
});

module.exports = router;
