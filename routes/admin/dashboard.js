const trakpay = require("../../model/onlineTransaction");
const upi_entries = require("../../model/API/upiPayments");
const session = require("../helpersModule/session");
const express = require("express");
const router =express.Router()
router.post("/getBriefDeposit", async (req, res) => {
    console.log(1)
    try {
        const startOfDay = moment().startOf('day').unix();
        const gatewayAmount = await trakpay.aggregate([
            { $match: { timestamp: startOfDay } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$reqAmount" },
                    upiName: { $first: "$reqType" },
                },
            },
        ]);
        const upiAmount = await upi_entries.aggregate([
            { $match: { timestamp: startOfDay, reqStatus: "Approved" } },
            {
                $group: {
                    _id: "$upi_name_id",
                    totalAmount: { $sum: "$reqAmount" },
                    upiName: { $first: "$upi_name" },
                },
            },
        ]);

        const bindData = [...gatewayAmount, ...upiAmount];
        return res.status(200).json({
            status: true,
            statusCode: 200,
            message: bindData.length > 0 ? "Data retrieved successfully" : "No data found",
            data: bindData
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            statusCode: 500,
            message: "Server error occurred",
            error: error.message,
        });
    }
});