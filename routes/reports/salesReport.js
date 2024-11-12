const router = require("express").Router();
const mongodb = require("mongodb");
// const mongodb = require("mongodb");
const { ObjectId } = require('mongodb');
const KGDG = require("../../model/kgdbuser");
const user = require("../../model/API/Users");
const provider = require("../../model/games/Games_Provider");
const starProvider = require("../../model/starline/Starline_Provider");
const abProvider = require("../../model/AndarBahar/ABProvider");
const providerSetting = require("../../model/games/AddSetting")
const bids = require("../../model/games/gameBids");
const starBids = require("../../model/starline/StarlineBids");
const slProviderSetting = require("../../model/starline/AddSetting")
const abBids = require("../../model/AndarBahar/ABbids");
const abProviderSetting = require("../../model/AndarBahar/ABAddSetting")
const session = require("../helpersModule/session");
const permission = require("../helpersModule/permission");
const analysisCol = require("../../model/games/Analysis");
const moment = require("moment");
const fundsreq = require('../../model/API/FundRequest')

router.get("/", session, permission, async (req, res) => {
    try {
        const providerData = await provider.find().sort({ _id: 1 });
        const userInfo = req.session.details;
        const permissionArray = req.view;

        const check = permissionArray["salesReport"].showStatus;
        if (check === 1) {
            res.render("./reports/salesReport", {
                data: providerData,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Sales Report",
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard",
            });
        }
    } catch (e) {
        res.json({
            status: 0,
            message: "contact Support",
            data: e,
        });
    }
});

router.get("/analysis", session, permission, async (req, res) => {
    try {
        const providerData = await provider.find().sort({ _id: 1 });
        const userInfo = req.session.details;
        const permissionArray = req.view;

        const check = permissionArray["salesReport"].showStatus;
        if (check === 1) {
            res.render("./reports/analysis", {
                data: providerData,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Sales Report",
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard",
            });
        }
    } catch (e) {
        res.json({
            status: 0,
            message: "contact Support",
            data: e,
        });
    }
});

router.get("/starline", session, permission, async (req, res) => {
    try {
        const providerData = await starProvider.find().sort({ _id: 1 });
        const userInfo = req.session.details;
        const permissionArray = req.view;

        const check = permissionArray["starLineSaleReport"].showStatus;
        if (check === 1) {
            res.render("./reports/starlineSalesReport", {
                data: providerData,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Starline Sales Report",
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard",
            });
        }
    } catch (e) {
        res.json({
            status: 0,
            message: "contact Support",
            data: e,
        });
    }
});

router.get("/andarBahar", session, permission, async (req, res) => {
    try {
        const providerData = await abProvider.find().sort({ _id: 1 });
        const userInfo = req.session.details;
        const permissionArray = req.view;

        const check = permissionArray["abSalesReport"].showStatus;
        if (check === 1) {
            res.render("./reports/andarBaharReport", {
                data: providerData,
                userInfo: userInfo,
                permission: permissionArray,
                title: "AB Sales Report",
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard",
            });
        }
    } catch (e) {
        res.json({
            status: 0,
            message: "contact Support",
            data: e,
        });
    }
});

router.post("/getUsername", session, async (req, res) => {
    try {
        var searchInputTable = req.body.term;
        serachQuery = { username: { $regex: searchInputTable } };
        const userData = await user.find(serachQuery, { _id: 1, username: 1 });
        res.json(userData);
    } catch (error) {
        res.json({
            status: 0,
            message: "contact Support",
            data: error,
        });
    }
});

// router.post("/userReport", session,async (req, res) => {
// 	try {
// 		const userName = req.body.userId;
// 		const gameId = req.body.gameId;
// 		const sDate = req.body.startDate;
// 		const eDate = req.body.endDate;

// 		const startDate0 = moment(sDate, "MM-DD-YYYY").format("DD/MM/YYYY");
// 		const endDate0 = moment(eDate, "MM-DD-YYYY").format("DD/MM/YYYY");

// 		var startDate = moment(startDate0, "DD/MM/YYYY").unix();
// 		var endDate = moment(endDate0, "DD/MM/YYYY").unix();
// 		let providerList = await provider.find();
// 		if (userName == "" && gameId == 0) {
// 			let finalArr = [];
// 			if (providerList.length > 0) {
// 				for (let providerData of providerList) {
// 					const bidsData = await bids.aggregate([
// 						{
// 							$match: {
// 								providerId: providerData._id,
// 								gameDate: {
// 									$gte: sDate,
// 									$lte: eDate,
// 								},
// 							},
// 						},
// 						{
// 							$group: {
// 								_id: null,
// 								GameWinPoints: { $sum: "$gameWinPoints" },
// 								BiddingPoints: { $sum: "$biddingPoints" },
// 							},
// 						},
// 					]);
// 					if (bidsData.length > 0) {
// 						finalArr.push({
// 							_id: null,
// 							GameWinPoints: bidsData[0].GameWinPoints,
// 							BiddingPoints: bidsData[0].BiddingPoints,
// 							providerName: providerData.providerName
// 						});
// 					}
// 				}
// 			}
// 			return res.json(finalArr);
// 		} else if (gameId == 0) {
// 			let finalArr = []
// 			if (providerList.length > 0) {
// 				for (let providerData of providerList) {
// 					const bidsData = await bids.aggregate([
// 						{

// 							$match: {
// 								providerId: new ObjectId(providerData._id),
// 								gameDate: {
// 									$gte: sDate,
// 									$lte: eDate
// 								},
// 								userName: userName,
// 							},
// 						},
// 						{
// 							$group: {
// 								_id: null,
// 								GameWinPoints: { $sum: "$gameWinPoints" },
// 								BiddingPoints: { $sum: "$biddingPoints" },
// 							},
// 						},
// 					]);
// 					if (bidsData.length > 0) {
// 						finalArr.push({
// 							_id: null,
// 							GameWinPoints: bidsData[0].GameWinPoints,
// 							BiddingPoints: bidsData[0].BiddingPoints,
// 							providerName: providerData.providerName
// 						});
// 					}
// 				}
// 			}
// 			return res.json(finalArr);
// 		} else if (gameId != 0 && userName == "") {
// 			let finalArr = [];
// 			let providerData = await provider.findOne({ _id: gameId }, { providerName: 1 });
// 			const data1 = await bids.aggregate([
// 				{
// 					$match: {
// 						providerId: new ObjectId(gameId),
// 						gameDate: {
// 							$gte: sDate,
// 							$lte: eDate
// 						},
// 					},
// 				},
// 				{
// 					$group: {
// 						_id: null,
// 						GameWinPoints: { $sum: "$gameWinPoints" },
// 						BiddingPoints: { $sum: "$biddingPoints" },
// 					},
// 				},
// 			]);
// 			if (data1.length > 0) {
// 				finalArr.push({
// 					_id: null,
// 					GameWinPoints: data1[0].GameWinPoints,
// 					BiddingPoints: data1[0].BiddingPoints,
// 					providerName: providerData.providerName
// 				});
// 			}
// 			return res.json(finalArr);
// 		} else {
// 			let finalArr = [];
// 			let providerData = await provider.findOne({ _id: gameId }, { providerName: 1 });
// 			const bidsData = await bids.aggregate([
// 				{
// 					$match: {
// 						providerId: new ObjectId(gameId),
// 						gameDate: {
// 							$gte: sDate,
// 							$lte: eDate
// 						},
// 						userName: userName,
// 					},
// 				},
// 				{
// 					$group: {
// 						_id: null,
// 						GameWinPoints: { $sum: "$gameWinPoints" },
// 						BiddingPoints: { $sum: "$biddingPoints" },
// 					},
// 				},
// 			]);
// 			if (bidsData.length > 0) {
// 				finalArr.push({
// 					_id: null,
// 					GameWinPoints: bidsData[0].GameWinPoints,
// 					BiddingPoints: bidsData[0].BiddingPoints,
// 					providerName: providerData.providerName
// 				});
// 			}
// 			return res.json(finalArr);
// 		}
// 	} catch (error) {
// 		res.json({
// 			status: 0,
// 			message: "contact Support",
// 			data: error,
// 		});
// 	}
// });

router.post("/userReport", session, async (req, res) => {
    try {
        const { userId, gameId, startDate, endDate } = req.body;

        if (!startDate || !endDate || !moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({ message: "Invalid startDate or endDate format" });
        }

        const today = moment();
        const dayOfWeek = today.format('dddd');
        const gameSettings = await providerSetting.find({
            gameDay: dayOfWeek,
            // isClosed: '1'
        }, {
            providerId: 1,
            OBT: 1,
            _id: 0
        });
        gameSettings.sort((a, b) => moment(a.OBT, 'hh:mm A') - moment(b.OBT, 'hh:mm A'));

        const providerList = await provider.find();

        const arrangedProviderList = gameSettings.map(game => {
            return providerList.find(provider => provider._id.toString() === game.providerId.toString());
        }).filter(Boolean);
        const fetchBidsData = async (providerId, userName = null) => {
            const matchCriteria = {
                providerId: new ObjectId(providerId),
                gameDate: { $gte: startDate, $lte: endDate }
            };
            if (userName) {
                matchCriteria.userName = userName;
            }

            const finalData = await bids.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: null,
                        GameWinPoints: { $sum: "$gameWinPoints" },
                        BiddingPoints: { $sum: "$biddingPoints" }
                    }
                }
            ]);
            return finalData;
        };

        const processProvider = async (providerData, index) => {
            const bidData = await fetchBidsData(providerData._id, userId);
            return {
                index,
                GameWinPoints: bidData.length > 0 ? bidData[0].GameWinPoints || 0 : 0,
                BiddingPoints: bidData.length > 0 ? bidData[0].BiddingPoints || 0 : 0,
                providerName: providerData.providerName
            };
        };

        let finalResult = [];
        if (!userId && gameId === "0") {
            finalResult = await Promise.all(arrangedProviderList.map((providerData, index) => processProvider(providerData, index)));
        } else if (gameId === "0") {
            finalResult = await Promise.all(arrangedProviderList.map((providerData, index) => processProvider(providerData, index)));
        } else {
            const providerData = await provider.findOne({ _id: new ObjectId(gameId) }, { providerName: 1 });
            if (!providerData) {
                return res.status(404).json({ message: "Game not found" });
            }
            const result = await processProvider(providerData, 0);
            finalResult.push({
                GameWinPoints: result.GameWinPoints,
                BiddingPoints: result.BiddingPoints,
                providerName: result.providerName
            });
        }
        finalResult.sort((a, b) => a.index - b.index);

        return res.json(finalResult);

    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "An error occurred while generating the report. Please contact support.",
            error: error.message,
        });
    }
});

// router.post("/userReportStar", session, async (req, res) => {
// 	try {
// 		const userName = req.body.userId;
// 		const gameId = req.body.gameId;
// 		const sDate = req.body.startDate;
// 		const eDate = req.body.endDate;

// 		const startDate0 = moment(sDate, "MM-DD-YYYY").format("DD/MM/YYYY");
// 		const endDate0 = moment(eDate, "MM-DD-YYYY").format("DD/MM/YYYY");

// 		var startDate = moment(startDate0, "DD/MM/YYYY").unix();
// 		var endDate = moment(endDate0, "DD/MM/YYYY").unix();
// 		let providerList = await starProvider.find();
// 		if (userName == "" && gameId == 0) {
// 			let finalArr = [];
// 			if (providerList.length > 0) {
// 				for (let providerData of providerList) {
// 					const bidsData = await starBids.aggregate([
// 						{
// 							$match: {
// 								providerId: providerData._id,
// 								gameDate: {
// 									$gte: sDate,
// 									$lte: eDate
// 								},
// 							},
// 						},
// 						{
// 							$group: {
// 								_id: null,
// 								GameWinPoints: { $sum: "$gameWinPoints" },
// 								BiddingPoints: { $sum: "$biddingPoints" },
// 							},
// 						},
// 					]);
// 					if (bidsData.length > 0) {
// 						finalArr.push({
// 							_id: null,
// 							GameWinPoints: bidsData[0].GameWinPoints,
// 							BiddingPoints: bidsData[0].BiddingPoints,
// 							providerName: providerData.providerName
// 						});
// 					}
// 				}
// 			}
// 			return res.json(finalArr);
// 		} else if (gameId == 0) {
// 			let finalArr = []
// 			if (providerList.length > 0) {
// 				for (let providerData of providerList) {
// 					const bidsData = await starBids.aggregate([
// 						{
// 							$match: {
// 								gameDate: {
// 									$gte: sDate,
// 									$lte: eDate
// 								},
// 								userName: userName,
// 							},
// 						},
// 						{
// 							$group: {
// 								_id: null,
// 								GameWinPoints: { $sum: "$gameWinPoints" },
// 								BiddingPoints: { $sum: "$biddingPoints" },
// 							},
// 						},
// 					]);
// 					if (bidsData.length > 0) {
// 						finalArr.push({
// 							_id: null,
// 							GameWinPoints: bidsData[0].GameWinPoints,
// 							BiddingPoints: bidsData[0].BiddingPoints,
// 							providerName: providerData.providerName
// 						});
// 					}
// 				}
// 			}
// 			return res.json(finalArr);
// 		} else if (provider != 0 && userName == "") {
// 			let finalArr = [];
// 			let providerData = await starProvider.findOne({ _id: gameId }, { providerName: 1 });
// 			const bidsData = await starBids.aggregate([
// 				{
// 					$match: {
// 						providerId: new ObjectId(gameId),
// 						gameDate: {
// 							$gte: sDate,
// 							$lte: eDate
// 						},
// 					},
// 				},
// 				{
// 					$group: {
// 						_id: null,
// 						GameWinPoints: { $sum: "$gameWinPoints" },
// 						BiddingPoints: { $sum: "$biddingPoints" },
// 					},
// 				},
// 			]);
// 			if (bidsData.length > 0) {
// 				finalArr.push({
// 					_id: null,
// 					GameWinPoints: bidsData[0].GameWinPoints,
// 					BiddingPoints: bidsData[0].BiddingPoints,
// 					providerName: providerData.providerName
// 				});
// 			}
// 			return res.json(finalArr);
// 		} else {
// 			let finalArr = [];
// 			let providerData = await starProvider.findOne({ _id: gameId }, { providerName: 1 });
// 			const bidsData = await starBids.aggregate([
// 				{
// 					$match: {
// 						providerId: new ObjectId(gameId),
// 						gameDate: {
// 							$gte: sDate,
// 							$lte: eDate
// 						},
// 						userName: userName,
// 					},
// 				},
// 				{
// 					$group: {
// 						_id: null,
// 						GameWinPoints: { $sum: "$gameWinPoints" },
// 						BiddingPoints: { $sum: "$biddingPoints" },
// 					},
// 				},
// 			]);

// 			if (bidsData.length > 0) {
// 				finalArr.push({
// 					_id: null,
// 					GameWinPoints: bidsData[0].GameWinPoints,
// 					BiddingPoints: bidsData[0].BiddingPoints,
// 					providerName: providerData.providerName
// 				});
// 			}
// 			return res.json(finalArr);
// 		}
// 	} catch (error) {
// 		res.json({
// 			status: 0,
// 			message: "contact Support",
// 			data: error,
// 		});
// 	}
// });

router.post("/userReportStar", session, async (req, res) => {
    try {
        const { userId, gameId, startDate, endDate } = req.body;
        if (!startDate || !endDate || !moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({ message: "Invalid startDate or endDate format" });
        }

        const today = moment();
        const dayOfWeek = today.format('dddd');

        const gameSettings = await slProviderSetting.find({
            gameDay: dayOfWeek,
            isClosed: '1'
        }, {
            providerId: 1,
            OBT: 1,
            _id: 0
        });
        gameSettings.sort((a, b) => moment(a.OBT, 'hh:mm A') - moment(b.OBT, 'hh:mm A'));

        const providerList = await starProvider.find();

        const arrangedProviderList = gameSettings.map(game => {
            return providerList.find(provider => provider._id.toString() === game.providerId.toString());
        }).filter(Boolean);
        const fetchBidsData = async (providerId, userName = null) => {
            const matchCriteria = {
                providerId: new ObjectId(providerId),
                gameDate: { $gte: startDate, $lte: endDate }
            };
            if (userName) {
                matchCriteria.userName = userName;
            }

            const finalData = await starBids.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: null,
                        GameWinPoints: { $sum: "$gameWinPoints" },
                        BiddingPoints: { $sum: "$biddingPoints" }
                    }
                }
            ]);
            return finalData;
        };
        const processProvider = async (providerData, index) => {
            const bidData = await fetchBidsData(providerData._id, userId);
            return {
                index,
                GameWinPoints: bidData.length > 0 ? bidData[0].GameWinPoints || 0 : 0,
                BiddingPoints: bidData.length > 0 ? bidData[0].BiddingPoints || 0 : 0,
                providerName: providerData.providerName
            };
        };
        let finalResult = [];
        if (!userId && gameId === "0") {
            finalResult = await Promise.all(arrangedProviderList.map((providerData, index) => processProvider(providerData, index)));
        } else if (gameId === "0") {
            finalResult = await Promise.all(arrangedProviderList.map((providerData, index) => processProvider(providerData, index)));
        } else {
            const providerData = await starProvider.findOne({ _id: new ObjectId(gameId) }, { providerName: 1 });
            if (!providerData) {
                return res.status(404).json({ message: "Game not found" });
            }
            const result = await processProvider(providerData, 0);
            finalResult.push({
                GameWinPoints: result.GameWinPoints,
                BiddingPoints: result.BiddingPoints,
                providerName: result.providerName
            });
        }
        finalResult.sort((a, b) => a.index - b.index);

        return res.json(finalResult);
    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "An error occurred while generating the report. Please contact support.",
            error: error.message,
        });
    }
})

// router.post("/userReportAB", async (req, res) => {
// 	try {
// 		const userName = req.body.userId;
// 		const providerId = req.body.gameId;
// 		const sDate = req.body.startDate;
// 		const eDate = req.body.endDate;

// 		const startDate0 = moment(sDate, "MM-DD-YYYY").format("DD/MM/YYYY");
// 		const endDate0 = moment(eDate, "MM-DD-YYYY").format("DD/MM/YYYY");

// 		var startDate = moment(startDate0, "DD/MM/YYYY").unix();
// 		var endDate = moment(endDate0, "DD/MM/YYYY").unix();
// 		let providerList = await abProvider.find();

// 		if (userName == "" && providerId == 0) {
// 			let finalArr = [];
// 			if (providerList.length > 0) {
// 				for (let providerData of providerList) {
// 					const bidsData = await abBids.aggregate([
// 						{
// 							$match: {
// 								providerId: providerData._id,
// 								gameDate: {
// 									$gte: sDate,
// 									$lte: eDate
// 								},
// 							},
// 						},
// 						{
// 							$group: {
// 								_id: null,
// 								GameWinPoints: { $sum: "$gameWinPoints" },
// 								BiddingPoints: { $sum: "$biddingPoints" },
// 							},
// 						},
// 					]);
// 					if (bidsData.length > 0) {
// 						finalArr.push({
// 							_id: null,
// 							GameWinPoints: bidsData[0].GameWinPoints,
// 							BiddingPoints: bidsData[0].BiddingPoints,
// 							providerName: providerData.providerName
// 						});
// 					}
// 				}
// 			}
// 			return res.json(finalArr);
// 		} else if (providerId == 0) {
// 			let finalArr = []
// 			if (providerList.length > 0) {
// 				for (let providerData of providerList) {
// 					const bidsData = await abBids.aggregate([
// 						{
// 							$match: {
// 								providerId: new ObjectId(providerData._id),
// 								gameDate: {
// 									$gte: sDate,
// 									$lte: eDate
// 								},
// 								userName: userName,
// 							},
// 						},
// 						{
// 							$group: {
// 								_id: null,
// 								GameWinPoints: { $sum: "$gameWinPoints" },
// 								BiddingPoints: { $sum: "$biddingPoints" },
// 							},
// 						},
// 					]);
// 					if (bidsData.length > 0) {
// 						finalArr.push({
// 							_id: null,
// 							GameWinPoints: bidsData[0].GameWinPoints,
// 							BiddingPoints: bidsData[0].BiddingPoints,
// 							providerName: providerData.providerName
// 						});
// 					}
// 				}
// 			}

// 			return res.json(finalArr);
// 		} else if (providerId != 0 && userName == "") {
// 			let finalArr = [];
// 			let providerDetails = await abProvider.findOne({ _id: providerId }, { providerName: 1 });
// 			const bidsData = await abBids.aggregate([
// 				{
// 					$match: {
// 						providerId: new ObjectId(providerId),
// 						gameDate: {
// 							$gte: sDate,
// 							$lte: eDate
// 						},
// 					},
// 				},
// 				{
// 					$group: {
// 						_id: null,
// 						GameWinPoints: { $sum: "$gameWinPoints" },
// 						BiddingPoints: { $sum: "$biddingPoints" },
// 					},
// 				},
// 			]);
// 			if (bidsData.length > 0) {
// 				finalArr.push({
// 					_id: null,
// 					GameWinPoints: bidsData[0].GameWinPoints,
// 					BiddingPoints: bidsData[0].BiddingPoints,
// 					providerName: providerDetails.providerName
// 				});
// 			}
// 			return res.json(finalArr);
// 		} else {
// 			let finalArr = [];
// 			let providerData = await abProvider.findOne({ _id: providerId }, { providerName: 1 });
// 			const bidsData = await abBids.aggregate([
// 				{
// 					$match: {
// 						providerId: new ObjectId(providerId),
// 						gameDate: {
// 							$gte: sDate,
// 							$lte: eDate
// 						},
// 						userName: userName,
// 					},
// 				},
// 				{
// 					$group: {
// 						_id: null,
// 						GameWinPoints: { $sum: "$gameWinPoints" },
// 						BiddingPoints: { $sum: "$biddingPoints" },
// 					},
// 				},
// 			]);
// 			if (bidsData.length > 0) {
// 				finalArr.push({
// 					_id: null,
// 					GameWinPoints: bidsData[0].GameWinPoints,
// 					BiddingPoints: bidsData[0].BiddingPoints,
// 					providerName: providerData.providerName
// 				});
// 			}
// 			return res.json(finalArr);
// 		}
// 	} catch (error) {
// 		res.json({
// 			status: 0,
// 			message: "contact Support",
// 			data: error,
// 		});
// 	}
// });

router.post("/userReportAB", session, async (req, res) => {
    try {
        const { userId, gameId, startDate, endDate } = req.body;

        if (!startDate || !endDate || !moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({ message: "Invalid startDate or endDate format" });
        }
        const today = moment();
        const dayOfWeek = today.format('dddd');
        const gameSettings = await abProviderSetting.find({
            gameDay: dayOfWeek,
            isClosed: '1'
        }, {
            providerId: 1,
            OBT: 1,
            _id: 0
        });
        gameSettings.sort((a, b) => moment(a.OBT, 'hh:mm A') - moment(b.OBT, 'hh:mm A'));

        const providerList = await abProvider.find();

        const arrangedProviderList = gameSettings.map(game => {
            return providerList.find(provider => provider._id.toString() === game.providerId.toString());
        }).filter(Boolean);
        const fetchBidsData = async (providerId, userName = null) => {
            const matchCriteria = {
                providerId: new ObjectId(providerId),
                gameDate: { $gte: startDate, $lte: endDate }
            };
            if (userName) {
                matchCriteria.userName = userName;
            }

            const finalData = await abBids.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: null,
                        GameWinPoints: { $sum: "$gameWinPoints" },
                        BiddingPoints: { $sum: "$biddingPoints" }
                    }
                }
            ]);
            return finalData;
        };

        const processProvider = async (providerData, index) => {
            const bidData = await fetchBidsData(providerData._id, userId);
            return {
                index,
                GameWinPoints: bidData.length > 0 ? bidData[0].GameWinPoints || 0 : 0,
                BiddingPoints: bidData.length > 0 ? bidData[0].BiddingPoints || 0 : 0,
                providerName: providerData.providerName
            };
        };

        let finalResult = [];
        if (!userId && gameId === "0") {
            finalResult = await Promise.all(arrangedProviderList.map((providerData, index) => processProvider(providerData, index)));
        } else if (gameId === "0") {
            finalResult = await Promise.all(arrangedProviderList.map((providerData, index) => processProvider(providerData, index)));
        } else {
            const providerData = await abProvider.findOne({ _id: new ObjectId(gameId) }, { providerName: 1 });
            if (!providerData) {
                return res.status(404).json({ message: "Game not found" });
            }
            const result = await processProvider(providerData, 0);
            finalResult.push({
                GameWinPoints: result.GameWinPoints,
                BiddingPoints: result.BiddingPoints,
                providerName: result.providerName
            });
        }
        finalResult.sort((a, b) => a.index - b.index);

        return res.json(finalResult);

    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "An error occurred while generating the report. Please contact support.",
            error: error.message,
        });
    }
})

router.post("/analysisReport", session, async (req, res) => {
    try {
        const userName = req.body.userId;
        let query = {};
        if (userName != "") {
            query = { username: userName };
        }

        let i = parseInt(req.body.start) + 1;



        const bidsData = await bids.aggregate([
            {
                $match: {
                    userName: userName
                },

            },
            { $group: { _id: null, BiddingPoints: { $sum: "$biddingPoints" }, GameWinPoints: { $sum: "$gameWinPoints" } } }
        ]);

        const abBidsData = await abBids.aggregate([
            {
                $match: {
                    userName: userName
                }
            },
            {
                $group: {
                    _id: null,
                    GameWinPoints: { $sum: "$gameWinPoints" },
                    BiddingPoints: { $sum: "$biddingPoints" },
                },
            },
        ]);

        const starBidsData = await starBids.aggregate([
            {
                $match: {
                    userName: userName
                },
            },
            {
                $group: {
                    _id: null,
                    GameWinPoints: { $sum: "$gameWinPoints" },
                    BiddingPoints: { $sum: "$biddingPoints" },
                },
            },
        ]);


        const amountCreditDebit = await fundsreq.aggregate([
            {
                $match: { username: userName, reqStatus: 'Approved' }
            },
            {
                $group: { _id: "$reqType", totalAmount: { $sum: "$reqAmount" } }

            }]);

        const userData = await user.findOne({ username: userName }).lean()


        let totalDebitAmount = 0, totalCreditAmont = 0;
        for (let elem of amountCreditDebit) {
            if (elem['_id'] == 'Debit') {
                totalDebitAmount = elem.totalAmount;
            }

            if (elem['_id'] == 'Credit') {
                totalCreditAmont = elem.totalAmount;
            }
        }

        await analysisCol.updateOne({ username: userName }, {
            $set: {
                username: userName,
                gameBidPoint: bidsData.length ? bidsData[0].BiddingPoints : 0,
                gameWinPoints: bidsData.length ? bidsData[0].GameWinPoints : 0,
                AbWinPoints: abBidsData.length ? abBidsData[0].GameWinPoints : 0,
                AbBidPoint: abBidsData.length ? abBidsData[0].BiddingPoints : 0,
                starWinPoints: starBidsData.length ? starBidsData[0].GameWinPoints : 0,
                starBidPoint: starBidsData.length ? starBidsData[0].BiddingPoints : 0,
                totalPointsDebited: totalDebitAmount,
                totalPointsCredited: totalCreditAmont,
                updatedAt: userData ? userData.lastLoginDate : ''
            }
        }, { upsert: true })




        analysisCol
            .dataTables({
                find: query,
                limit: req.body.length,
                skip: req.body.start,
                columns: req.body.columns,
                search: {
                    value: req.body.search.value,
                    fields: ["username"],
                },
                sort: {
                    gameWinPoints: -1,
                    totalPointsDebited: -1,
                    totalPointsCredited: -1,
                },
                order: req.body.order,
            })
            .then(function (table) {
                let dataTab = table.data;

                let tabelArray = [];
                let profitLoss = 0;
                let totalBid = 0;
                let totalWin = 0;
                for (index in dataTab) {
                    let gameBidPoint = dataTab[index].gameBidPoint;
                    let gameWinPoints = dataTab[index].gameWinPoints;
                    let starBidPoint = dataTab[index].starBidPoint;
                    let starWinPoints = dataTab[index].starWinPoints;
                    let AbBidPoint = dataTab[index].AbBidPoint;
                    let AbWinPoints = dataTab[index].AbWinPoints;
                    let debit = dataTab[index].totalPointsDebited;
                    if (gameBidPoint == undefined) {
                        gameBidPoint = 0;
                    }
                    if (gameWinPoints == undefined) {
                        gameWinPoints = 0;
                    }
                    if (debit == undefined) {
                        debit = 0;
                    }
                    if (starBidPoint == undefined) {
                        starBidPoint = 0;
                    }
                    if (starWinPoints == undefined) {
                        starWinPoints = 0;
                    }
                    if (AbBidPoint == undefined) {
                        AbBidPoint = 0;
                    }
                    if (AbWinPoints == undefined) {
                        AbWinPoints = 0;
                    }

                    totalBid =
                        parseInt(gameBidPoint) +
                        parseInt(starBidPoint) +
                        parseInt(AbBidPoint);
                    totalWin =
                        parseInt(gameWinPoints) +
                        parseInt(starWinPoints) +
                        parseInt(AbWinPoints);

                    profitLoss = totalBid - totalWin;

                    clrName = "Red";
                    if (profitLoss > 0) {
                        clrName = "Green";
                    }

                    let dataJson = {
                        sno: i,
                        username: dataTab[index].username,
                        totalPointsCredited: dataTab[index].totalPointsCredited || 0,
                        totalPointsDebited: debit,
                        gameBidPoint: gameBidPoint,
                        totalBidPoint: totalBid,
                        totalWinPoint: totalWin,
                        profit:
                            "<p style='color:" +
                            clrName +
                            ";font-weight:Bold'>" +
                            profitLoss +
                            "</p>",
                        updatedAt: dataTab[index].updatedAt || "",
                    };
                    tabelArray.push(dataJson);
                    i++;
                }


                res.json({
                    data: tabelArray,
                    recordsFiltered: table.total,
                    recordsTotal: table.total,
                });
            })
            .catch(function (error) {
                res.json({
                    status: 0,
                    message: "Request To Large",
                    error: error,
                });
            });


    } catch (error) {
        res.json({
            status: 0,
            message: "contact Support",
            data: error,
        });
    }
});

module.exports = router;