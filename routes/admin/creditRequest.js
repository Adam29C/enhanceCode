const router = require("express").Router();
const fundReq = require("../../model/API/FundRequest");
const UPIlist = require("../../model/API/upiPayments");
const userProfile = require("../../model/API/Profile");

const moment = require("moment");
const session = require("../helpersModule/session");
const permission = require("../helpersModule/permission");
const mongoose = require("mongoose");


router.get("/creditUPI", async (req, res) => {
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



module.exports =router