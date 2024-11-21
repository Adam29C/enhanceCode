const router = require("express").Router();
const mongoose = require("mongoose");
const fundReq = require("../../model/API/FundRequest");
const dateTime = require("node-datetime");
const moment = require("moment");
const authMiddleware = require("../helpersModule/athetication")

router.post("/declined", authMiddleware, async (req, res) => {
    try {
        const { page, limit, date_cust,search } = req.query;
        const dt = dateTime.create();
        let date = dt.format("d/m/Y");

        if (date_cust) {
            date = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");
        }

        if (page <= 0 || limit <= 0) {
            return res.status(400).json({
                status: false,
                message: "Page and limit must be positive integers.",
            });
        }
        const skip = (page - 1) * limit;

        const query = {
            reqDate: date,
            reqType: "Debit",
            reqStatus: "Declined"
        };

        if (search) {
            const searchValue = search;
            const normalizedSearch = searchValue.startsWith("+91") ? searchValue : "+91" + searchValue;

            query.$or = [
                { username: { $regex: searchValue, $options: "i" } },
                { name: { $regex: searchValue, $options: "i" } },
                { mobile: { $regex: normalizedSearch, $options: "i" } }
            ];
        }

        const report = await fundReq.find(query)
            .skip(skip)
            .limit(limit);

        const totalCount = await fundReq.countDocuments(query);

        res.status(200).json({
            status: true,
            message: "Declined Report fetched successfully.",
            data: report,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit: limit,
        });
    } catch (err) {
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
});

module.exports = router;