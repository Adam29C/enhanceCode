const router = require("express").Router();
const ABbids = require("../../../model/AndarBahar/ABbids");
const abPorvider = require("../../../model/AndarBahar/ABProvider");
const abGameType = require("../../../model/AndarBahar/ABGameList");
const authMiddleware = require("../../helpersModule/athetication");

const user = require('../../../model/API/Users');
const history = require('../../../model/wallet_history');
const abResult = require('../../../model/AndarBahar/ABGameResult');
const notification = require('../../helpersModule/sendNotification');
const dateTime = require('node-datetime');
const Pusher = require('pusher');
const admins = require("../../../model/dashBoard/AdminModel.js");

router.get("/abWinnerList", authMiddleware, async (req, res) => {
    try {
        const { digit, provider, date, resultId, resultStatus, page = 1, limit = 10 } = req.query;

        if (!digit || !provider || !date || resultId === undefined || resultStatus === undefined) {
            return res.status(400).json({
                status: false,
                message: "All required fields must be provided."
            });
        }

        const totalCount = await ABbids.countDocuments({
            providerId: provider,
            gameDate: date,
            bidDigit: digit
        });

        const resultList = await ABbids.find({
            providerId: provider,
            gameDate: date,
            bidDigit: digit
        })
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

        const ABProvider = await abPorvider.findOne({ _id: provider });
        const gameType = await abGameType.find();

        const pageData = {
            dispData: ABProvider,
            gametype: gameType,
            resultId,
            resultStatus: parseInt(resultStatus, 10),
        };

        return res.status(200).json({
            status: true,
            message: "AB Game Winners List",
            data: pageData,
            resultData: resultList,
            gameDate: date,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
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

router.post('/abWinners', authMiddleware, async (req, res) => {
    try {
        const { providerId, windigit, gameDate, gamePrice, resultId, adminId, page = 1, limit = 10 } = req.body;
        let namefor = '';
        let historyDataArray = [];
        let tokenArray = [];

        const totalCount = await ABbids.countDocuments({
            providerId: providerId,
            bidDigit: windigit,
            gameDate: gameDate
        });

        const resultList = await ABbids.find({
            providerId: providerId,
            bidDigit: windigit,
            gameDate: gameDate
        })
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

        const dt0 = dateTime.create();
        const todayDate = dt0.format('d/m/Y');
        let formatted = dt0.format('m/d/Y I:M:S p');
        let formatted2 = dt0.format('d/m/Y I:M:S p');

        for (let index in resultList) {
            let bidPoint = resultList[index].biddingPoints;
            let bal = bidPoint * gamePrice;
            let userID = resultList[index].userId;
            let id = resultList[index]._id;
            let gameName = resultList[index].providerName;
            let gameType = resultList[index].gameTypeName;
            namefor = 'Jackpot (' + gameName + ')';

            await ABbids.updateOne(
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
            const username = userBal.username;
            const userToken = userBal.firebaseId;

            await user.updateOne(
                { _id: userID },
                { $inc: { wallet_balance: bal } },
                {
                    $set: {
                        wallet_bal_updated_at: formatted2
                    }
                });

            let time = dt0.format('I:M:S p');
            let arrValue = {
                userId: userID,
                bidId: id,
                reqType: "andarBahar",
                previous_amount: previous_amount,
                current_amount: current_amount,
                provider_id: providerId,
                transaction_amount: bal,
                username: username,
                description: "Amount Added To Wallet For " + gameName + " : " + gameType + " Jackpot Game Win",
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

        await abResult.updateOne(
            { _id: resultId },
            { $set: { status: 1 } });

        await ABbids.updateMany(
            { winStatus: 0, providerId: providerId, gameDate: gameDate },
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
            totalPages: Math.ceil(totalCount / limit),
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
