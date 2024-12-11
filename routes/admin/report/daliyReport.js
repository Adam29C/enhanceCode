const router = require("express").Router();
const userInfo = require("../../../model/API/Users");
const fundReport = require("../../../model/API/FundRequest");
const bids = require("../../../model/games/gameBids");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.post("/dailyData", authMiddleware, async (req, res) => {
    try {
        const { reqType, sdate, edate, username, page = 1, limit = 10 } = req.body;

        if (!reqType || !sdate || !edate) {
            return res.status(400).json({
                status: false,
                message: "reqType, sdate, and edate are required.",
            });
        }

        const startDate = moment(sdate, "MM/DD/YYYY", true).format("DD/MM/YYYY");
        const endDate = moment(edate, "MM/DD/YYYY", true).format("DD/MM/YYYY");

        if (!moment(startDate, "DD/MM/YYYY", true).isValid() || !moment(endDate, "DD/MM/YYYY", true).isValid()) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format. Use MM/DD/YYYY.",
            });
        }

        const dateQuery = {
            $gte: startDate,
            $lte: endDate,
        };

        let data;
        let totalItems;

        switch (reqType) {
            case "PG":
                const gameQuery = { gameDate: dateQuery };
                if (username && username.trim()) {
                    gameQuery.userName = username.trim();
                }

                totalItems = await bids.countDocuments(gameQuery);
                data = await bids.find(gameQuery).skip((page - 1) * limit).limit(limit);
                break;

            case "UR":
                totalItems = await userInfo.countDocuments({ CreatedAt: dateQuery });
                data = await userInfo.find({ CreatedAt: dateQuery }).skip((page - 1) * limit).limit(limit);
                break;

            case "RDP":
                totalItems = await fundReport.countDocuments({
                    reqDate: dateQuery,
                    reqType: "Credit",
                });
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Credit",
                }).skip((page - 1) * limit).limit(limit);
                break;

            case "RWP":
                totalItems = await fundReport.countDocuments({
                    reqDate: dateQuery,
                    reqType: "Debit",
                });
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Debit",
                }).skip((page - 1) * limit).limit(limit);
                break;

            case "CRDP":
                totalItems = await fundReport.countDocuments({
                    reqDate: dateQuery,
                    reqType: "Credit",
                    reqStatus: "Declined",
                });
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Credit",
                    reqStatus: "Declined",
                }).skip((page - 1) * limit).limit(limit);
                break;

            case "CRWP":
                totalItems = await fundReport.countDocuments({
                    reqDate: dateQuery,
                    reqType: "Debit",
                    reqStatus: "Declined",
                });
                data = await fundReport.find({
                    reqDate: dateQuery,
                    reqType: "Debit",
                    reqStatus: "Declined",
                }).skip((page - 1) * limit).limit(limit);
                break;

            default:
                return res.status(400).json({
                    status: false,
                    message: "Invalid reqType provided.",
                });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No data found for the given criteria.",
            });
        }

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            status: true,
            message: "Data retrieved successfully.",
            data,
            reqType,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
        });
    }
});

module.exports = router;