const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const analysisCol = require("../../../model/games/Analysis");
const user = require("../../../model/API/Users");
const provider = require("../../../model/games/Games_Provider");
const bids = require("../../../model/games/gameBids");
const starBids = require("../../../model/starline/StarlineBids");
const abBids = require("../../../model/AndarBahar/ABbids");
const moment = require("moment");
const fundsreq = require('../../../model/API/FundRequest')

router.get("/analysis", authMiddleware, async (req, res) => {
    try {
        const providerData = await provider.find().sort({ _id: 1 });

        if (!providerData || providerData.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No provider data found.",
            });
        }

        return res.status(200).json({
            status: true,
            title: "Sales Report",
            data: providerData,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
            error: error.message,
        });
    }
});

// router.get("/analysisReport", authMiddleware, async (req, res) => {
//     try {
//         const { userName, limit, page } = req.query;

//         // Validate required inputs
//         if (!userName||!limit||!page) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Invalid input. 'userId', 'start', and 'length' are required.",
//             });
//         }
//         let query = userName ? { username: userName } : {};
//         let recordIndex = parseInt(start) + 1;

//         const [bidsData, abBidsData, starBidsData, amountCreditDebit, userData] = await Promise.all([
//             bids.aggregate([
//                 { $match: { userName } },
//                 {
//                     $group: {
//                         _id: null,
//                         BiddingPoints: { $sum: "$biddingPoints" },
//                         GameWinPoints: { $sum: "$gameWinPoints" },
//                     },
//                 },
//             ]),
//             abBids.aggregate([
//                 { $match: { userName } },
//                 {
//                     $group: {
//                         _id: null,
//                         BiddingPoints: { $sum: "$biddingPoints" },
//                         GameWinPoints: { $sum: "$gameWinPoints" },
//                     },
//                 },
//             ]),
//             starBids.aggregate([
//                 { $match: { userName } },
//                 {
//                     $group: {
//                         _id: null,
//                         BiddingPoints: { $sum: "$biddingPoints" },
//                         GameWinPoints: { $sum: "$gameWinPoints" },
//                     },
//                 },
//             ]),
//             fundsreq.aggregate([
//                 { $match: { username: userName, reqStatus: "Approved" } },
//                 {
//                     $group: {
//                         _id: "$reqType",
//                         totalAmount: { $sum: "$reqAmount" },
//                     },
//                 },
//             ]),
//             user.findOne({ username: userName }).lean(),
//         ]);

//         let totalDebitAmount = 0,
//             totalCreditAmount = 0;
//         amountCreditDebit.forEach((elem) => {
//             if (elem._id === "Debit") totalDebitAmount = elem.totalAmount;
//             if (elem._id === "Credit") totalCreditAmount = elem.totalAmount;
//         });

//         await analysisCol.updateOne(
//             { username: userName },
//             {
//                 $set: {
//                     username: userName,
//                     gameBidPoint: bidsData.length ? bidsData[0].BiddingPoints : 0,
//                     gameWinPoints: bidsData.length ? bidsData[0].GameWinPoints : 0,
//                     AbWinPoints: abBidsData.length ? abBidsData[0].GameWinPoints : 0,
//                     AbBidPoint: abBidsData.length ? abBidsData[0].BiddingPoints : 0,
//                     starWinPoints: starBidsData.length ? starBidsData[0].GameWinPoints : 0,
//                     starBidPoint: starBidsData.length ? starBidsData[0].BiddingPoints : 0,
//                     totalPointsDebited: totalDebitAmount,
//                     totalPointsCredited: totalCreditAmount,
//                     updatedAt: userData ? userData.lastLoginDate : "",
//                 },
//             },
//             { upsert: true }
//         );

//         const tableData = await analysisCol.dataTables({
//             find: query,
//             limit: length,
//             skip: start,
//             columns,
//             search: {
//                 value: search?.value || "",
//                 fields: ["username"],
//             },
//             sort: {
//                 gameWinPoints: -1,
//                 totalPointsDebited: -1,
//                 totalPointsCredited: -1,
//             },
//             order,
//         });

//         const data = tableData.data.map((item, index) => {
//             const {
//                 gameBidPoint = 0,
//                 gameWinPoints = 0,
//                 starBidPoint = 0,
//                 starWinPoints = 0,
//                 AbBidPoint = 0,
//                 AbWinPoints = 0,
//                 totalPointsDebited = 0,
//                 totalPointsCredited = 0,
//                 updatedAt = "",
//                 username,
//             } = item;

//             const totalBid = gameBidPoint + starBidPoint + AbBidPoint;
//             const totalWin = gameWinPoints + starWinPoints + AbWinPoints;
//             const profitLoss = totalBid - totalWin;
//             const clrName = profitLoss > 0 ? "Green" : "Red";

//             return {
//                 sno: recordIndex + index,
//                 username,
//                 totalPointsCredited,
//                 totalPointsDebited,
//                 gameBidPoint,
//                 totalBidPoint: totalBid,
//                 totalWinPoint: totalWin,
//                 profit: `<p style='color:${clrName};font-weight:Bold'>${profitLoss}</p>`,
//                 updatedAt,
//             };
//         });

//         return res.status(200).json({
//             status: true,
//             data,
//             recordsFiltered: tableData.total,
//             recordsTotal: tableData.total,
//         });
//     } catch (error) {
//         return res.status(500).json({
//             status: false,
//             message: "An internal server error occurred. Please contact support.",
//             error: error.message,
//         });
//     }
// });



router.get("/analysisReport", authMiddleware, async (req, res) => {
    try {
        const { userName, limit = 10, page = 1 } = req.query;
        // Validate required inputs
        if (!userName) {
            return res.status(400).json({
                status: false,
                message: "'userName' is required.",
            });
        }

        const pageNumber = parseInt(page); // Page number for pagination
        const limitNumber = parseInt(limit); // Limit number for pagination
        const skip = (pageNumber - 1) * limitNumber; // Calculate skip

        // Query for user
        let query = userName === 'all' ? {} : { username: userName };

        // Aggregation queries
        const [bidsData, abBidsData, starBidsData, amountCreditDebit, userData] = await Promise.all([
            bids.aggregate([
                { $match: userName === 'all' ? {} : { userName } },
                {
                    $group: {
                        _id: null,
                        BiddingPoints: { $sum: "$biddingPoints" },
                        GameWinPoints: { $sum: "$gameWinPoints" },
                    },
                },
            ]),
            abBids.aggregate([
                { $match: userName === 'all' ? {} : { userName } },
                {
                    $group: {
                        _id: null,
                        BiddingPoints: { $sum: "$biddingPoints" },
                        GameWinPoints: { $sum: "$gameWinPoints" },
                    },
                },
            ]),
            starBids.aggregate([
                { $match: userName === 'all' ? {} : { userName } },
                {
                    $group: {
                        _id: null,
                        BiddingPoints: { $sum: "$biddingPoints" },
                        GameWinPoints: { $sum: "$gameWinPoints" },
                    },
                },
            ]),
            fundsreq.aggregate([
                { $match: userName === 'all' ? {} : { username: userName, reqStatus: "Approved" } },
                {
                    $group: {
                        _id: "$reqType",
                        totalAmount: { $sum: "$reqAmount" },
                    },
                },
            ]),
            userName === 'all' ? null : user.findOne({ username: userName }).lean(),
        ]);

        let totalDebitAmount = 0,
            totalCreditAmount = 0;

        amountCreditDebit.forEach((elem) => {
            if (elem._id === "Debit") totalDebitAmount = elem.totalAmount;
            if (elem._id === "Credit") totalCreditAmount = elem.totalAmount;
        });

        if (userName !== 'all' && userData) {
            // Update or insert analysis report data for the user
            await analysisCol.updateOne(
                { username: userName },
                {
                    $set: {
                        username: userName,
                        gameBidPoint: bidsData.length ? bidsData[0].BiddingPoints : 0,
                        gameWinPoints: bidsData.length ? bidsData[0].GameWinPoints : 0,
                        AbWinPoints: abBidsData.length ? abBidsData[0].GameWinPoints : 0,
                        AbBidPoint: abBidsData.length ? abBidsData[0].BiddingPoints : 0,
                        starWinPoints: starBidsData.length ? starBidsData[0].GameWinPoints : 0,
                        starBidPoint: starBidsData.length ? starBidsData[0].BiddingPoints : 0,
                        totalPointsDebited: totalDebitAmount,
                        totalPointsCredited: totalCreditAmount,
                        updatedAt: userData ? userData.lastLoginDate : "",
                    },
                },
                { upsert: true }
            );
        }

        // DataTables query for pagination and sorting
        const tableData = await analysisCol.dataTables({
            find: query,
            limit: limitNumber,
            skip: skip,
            columns: req.query.columns,
            sort: {
                gameWinPoints: -1,
                totalPointsDebited: -1,
                totalPointsCredited: -1,
            },
            order: req.query.order,
        });

        // Map data for response
        const data = tableData.data.map((item, index) => {
            const {
                gameBidPoint = 0,
                gameWinPoints = 0,
                starBidPoint = 0,
                starWinPoints = 0,
                AbBidPoint = 0,
                AbWinPoints = 0,
                totalPointsDebited = 0,
                totalPointsCredited = 0,
                updatedAt = "",
                username,
            } = item;

            const totalBid = gameBidPoint + starBidPoint + AbBidPoint;
            const totalWin = gameWinPoints + starWinPoints + AbWinPoints;
            const profitLoss = totalBid - totalWin;
            const clrName = profitLoss > 0 ? "Green" : "Red";

            return {
                sno: skip + index + 1,
                username,
                totalPointsCredited,
                totalPointsDebited,
                gameBidPoint,
                totalBidPoint: totalBid,
                totalWinPoint: totalWin,
                profit: `<p style='color:${clrName};font-weight:Bold'>${profitLoss}</p>`,
                updatedAt,
            };
        });

        return res.status(200).json({
            status: true,
            data,
            recordsFiltered: tableData.total,
            recordsTotal: tableData.total,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
            error: error.message,
        });
    }
});



module.exports = router;