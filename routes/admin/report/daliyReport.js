const router = require("express").Router();
const userInfo = require("../../../model/API/Users");
const fundReport = require("../../../model/API/FundRequest");
const bids = require("../../../model/games/gameBids");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.post("/dailyData", authMiddleware, async (req, res) => {
    try {
        const { reqType, sdate, edate, username } = req.body;
        if (!reqType || !sdate || !edate) {
            return res.status(400).json({
                status: false,
                message: "reqType, sdate, and edate are required.",
            });
        }

        // Format the start and end dates to DD/MM/YYYY
        const startDate = moment(sdate, "MM/DD/YYYY", true).format("DD/MM/YYYY");
        const endDate = moment(edate, "MM/DD/YYYY", true).format("DD/MM/YYYY");

        // Validate the date formats
        if (!moment(startDate, "DD/MM/YYYY", true).isValid() || !moment(endDate, "DD/MM/YYYY", true).isValid()) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format. Use MM/DD/YYYY.",
            });
        }

        // Define the date range query (string comparison)
        const dateQuery = {
            $gte: startDate,
            $lte: endDate,
        };

        let data;

        // Handle different reqType cases
        switch (reqType) {
            case "PG":
                const gameQuery = { gameDate: dateQuery };
                if (username && username.trim()) {
                    gameQuery.userName = username.trim();
                }
                data = await bids.find();
                break;

            case "UR":
                data = await userInfo.find({ CtreatedAt: dateQuery });
                break;

            case "RDP":
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Credit",
                });
                break;

            case "RWP":
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Debit",
                });
                break;

            case "CRDP":
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Credit",
                    reqStatus: "Declined",
                });
                break;

            case "CRWP":
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Debit",
                    reqStatus: "Declined",
                });
                break;

            default:
                return res.status(400).json({
                    status: false,
                    message: "Invalid reqType provided.",
                });
        }

        // Check if no data was found
        if (!data || data.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No data found for the given criteria.",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Data retrieved successfully.",
            data,
            reqType:reqType
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
        });
    }
});



module.exports = router;