const router = require("express").Router();
const userInfo = require("../../../model/API/Users");
const fundReport = require("../../../model/API/FundRequest");
const bids = require("../../../model/games/gameBids");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.post("/dailyData",authMiddleware,  async (req, res) => {
	const type = req.body.reqType;
	const sdate = req.body.sdate;
	const edate = req.body.edate;
	const username = req.body.username;
	try {
		if (type === "PG") {
			//PG = PLAY GAME
			let query = {
				gameDate: {
					$gte: sdate,
					$lte: edate,
				},
			};
			if (username != "") {
				query = {
					gameDate: {
						$gte: sdate,
						$lte: edate,
					},
					userName: username,
				};
			}
			const gamebids = await bids.find(query);
			res.json(gamebids);
		} else if (type === "UR") {
			//UR = USER RESGISTRATION
			const userData = await userInfo.find({
				CtreatedAt: {
					$gte: sdate,
					$lte: edate,
				},
			});
			res.json(userData);
		} else if (type === "RDP") {
			//RDP = Request For Deposite Point
			const FundData = await fundReport.find({
				reqDate: {
					$gte: sdate,
					$lte: edate,
				},
				reqType: "Credit",
			});
			res.json(FundData);
		} else if (type === "RWP") {
			// RWP = Request For Withdraw Point
			const FundData = await fundReport.find({
				reqDate: {
					$gte: sdate,
					$lte: edate,
				},
				reqType: "Debit",
			});
			res.json(FundData);
		} else if (type === "CRDP") {
			// CRDP = Cancel Request For Deposite Point
			const FundData = await fundReport.find({
				reqDate: {
					$gte: sdate,
					$lte: edate,
				},
				reqType: "Credit",
				reqStatus: "Declined",
			});
			res.json(FundData);
		} //CRWP = Cancel Request For Withdraw Point
		else {
			const FundData = await fundReport.find({
				reqDate: {
					$gte: sdate,
					$lte: edate,
				},
				reqType: "Debit",
				reqStatus: "Declined",
			});
			res.json(FundData);
		}
	} catch (error) {
		res.json(error);
	}
});

module.exports = router;