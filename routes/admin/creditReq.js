const router = require("express").Router();
const fundReq = require("../../model/API/FundRequest");
const UPIlist = require("../../model/API/upiPayments");
const userProfile = require("../../model/API/Profile");
const dateTime = require("node-datetime");
const moment = require("moment");
const mongoose = require("mongoose");
const authMiddleware = require("../helpersModule/athetication");

router.get("/creditUPI", authMiddleware, async (req, res) => {
    try {
        const { date_cust, page = 1, limit = 10 } = req.query;
        const dt = dateTime.create();
        const currentDate = dt.format("d/m/Y");

        const dateToUse = date_cust ? moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY") : currentDate;

        const skip = (page - 1) * limit;

        const report = await UPIlist.find({
            reqDate: dateToUse,
            $and: [
                { $or: [{ reqStatus: "submitted" }, { reqStatus: "pending" }] }
            ]
        })
            .skip(skip)
            .limit(parseInt(limit))
            .exec();

        const totalCount = await UPIlist.countDocuments({
            reqDate: dateToUse,
            $and: [
                { $or: [{ reqStatus: "submitted" }, { reqStatus: "pending" }] }
            ]
        });

        return res.status(200).json({
            status: true,
            message: "Report fetched successfully.",
            approvedData: report,
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            limit: parseInt(limit),
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the report. Please contact support.",
            error: error.message,
        });
    }
});

module.exports = router;