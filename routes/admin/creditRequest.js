const router = require("express").Router();
const fundReq = require("../../model/API/FundRequest");
const UPIlist = require("../../model/API/upiPayments");
const userProfile = require("../../model/API/Profile");

const moment = require("moment");
const session = require("../helpersModule/session");
const permission = require("../helpersModule/permission");
const mongoose = require("mongoose");
const authMiddleware=require("../../../helpersModule/athetication")


router.get("/creditUPI",authMiddleware, async (req, res) => {
    try {
        //const date = moment().format("D/MM/YYYY");
        const date = "06/09/2024";
     
        const result = await UPIlist.aggregate([
            {
                $match: {
                    reqDate: date,
                    reqStatus: { $in: ["submitted", "pending"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" }
                }
            }
        ]);

        if (result.length > 0) {
            return res.json({
                status: true,
                message: "Data fetched successfully.",
                data: result[0].data,
                total: result[0].total
            });
        } else {
            return res.json({
                status: true,
                message: "No records found for the given date and status.",
                data: [],
                total: 0
            });
        }
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error. Please try again later.",
            error: e.message
        });
    }
});

router.get("/creditUPI_ajax",authMiddleware,  async (req, res) => {
    try {
        const requestedDate = req.query.date_cust;

        if (!requestedDate) {
            return res.json({
                status: false,
                message: "The date parameter 'date_cust' is required.",
                approvedData: [],
                total: 0
            });
        }

        const formattedDate = moment(requestedDate, "MM/DD/YYYY").format("DD/MM/YYYY");

        const aggregationResult = await UPIlist.aggregate([
            {
                $match: {
                    reqDate: formattedDate,
                    reqStatus: { $in: ["submitted", "pending"] }
                }
            },
            {
                $project: {
                    _id: 0,
                    reqDate: 1,
                    reqStatus: 1,
                }
            },
            {
                $group: {
                    _id: "$reqStatus",
                    data: { $push: "$$ROOT" },
                    total: { $sum: 1 }
                }
            }
        ]);

        if (aggregationResult.length > 0) {
            return res.json({
                status: true,
                message: "Data fetched successfully.",
                approvedData: aggregationResult[0].data,
                total: aggregationResult[0].total
            });
        } else {
            return res.json({
                status: true,
                message: "No data available for the provided date.",
                approvedData: [],
                total: 0
            });
        }
    } catch (error) {
        return res.json({
            status: false,
            message: "An unexpected error occurred. Please try again later.",
            error: error.message
        });
    }
});



module.exports =router