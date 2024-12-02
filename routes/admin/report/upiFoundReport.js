const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const moment = require("moment");
const UPI_list = require("../../../model/upi_ids");
const upiFundReport=require("../../../model/onlineUpiPayment")
const history = require("../../../model/wallet_history");

router.get("/upiReport", authMiddleware, async (req, res) => {
    try {
        const upiList = await UPI_list.find();

        if (upiList.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No UPI records found.",
                title: "UPI Report",
            });
        }

        return res.status(200).json({
            status: true,
            title: "UPI Report",
            data: upiList,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the UPI report.",
            error: error.message,
        });
    }
});

router.post("/getUPIReport", authMiddleware,async (req, res) => {
    try {
        const { id, date, dateStart, page = 1, limit = 10, search = '' } = req.body;

        const startDate0 = moment(dateStart, "MM-DD-YYYY").format("DD/MM/YYYY");
        const endDate0 = moment(date, "MM-DD-YYYY").format("DD/MM/YYYY");

        let query = {
            reqType: "Credit",
            particular: "UPI",
            transaction_date: {
                $gte: startDate0,
                $lte: endDate0,
            }
        };

        if (id !== '1') {
            let upiDetails = await UPI_list.findOne({ _id: id }, { UPI_ID: 1 });
            query.upiId = upiDetails?.UPI_ID;
        }

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { transaction_amount: { $regex: search, $options: 'i' } },
                { upiId: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const creditAmountDetails = await history.find(query)
            .skip(skip)
            .limit(limit);

        let newArra = [];
        if (creditAmountDetails.length !== 0) {
            creditAmountDetails.sort((a, b) => {
                let timeA = moment(a.reqDate, 'hh:mm:ss A');
                let timeB = moment(b.reqDate, 'hh:mm:ss A');
                return timeA - timeB;
            });

            for (let details of creditAmountDetails) {
                newArra.push({
                    _id: details._id,
                    username: details.username,
                    mobile: details.mobile,
                    reqAmount: details.transaction_amount,
                    reqDate: details.transaction_date,
                    reqTime: details.transaction_time,
                    transaction_id: details.transaction_id || null,
                    upi_name: details.upiId,
                    upi_app_name: "googlepay",
                    reqStatus: details?.transaction_status,
                });
            }
        }

        let finalArray = [];
        if (newArra.length > 0) {
            finalArray = newArra.sort((a, b) => {
                const timeA = moment(`${a.reqDate} ${a.reqTime}`, "DD/MM/YYYY hh:mm:ss A");
                const timeB = moment(`${b.reqDate} ${b.reqTime}`, "DD/MM/YYYY hh:mm:ss A");
                return timeA - timeB;
            });
        }

        const totalRecords = await history.countDocuments(query);
        const totalPages = Math.ceil(totalRecords / limit);

        return res.json({
            status: true,
            message: "Success",
            data: finalArray,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalRecords,
            },
        });
    } catch (error) {
        return res.json({
            status: false,
            message: "Something went wrong, please contact support.",
        });
    }
});

router.post("/getUPIFundReport", authMiddleware, async (req, res) => {
    try {
        const { id, date, dateStart, page = 1, limit = 10, search = '' } = req.body;
        const skip = (page - 1) * limit;

        let startDate0 = moment(dateStart, "MM-DD-YYYY").valueOf();
        let endDate0 = moment(date, "MM-DD-YYYY").valueOf();

        // Check if the parsed dates are valid
        if (isNaN(startDate0) || isNaN(endDate0)) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format. Please ensure the date is in MM-DD-YYYY format."
            });
        }

        // Build the query object
        let query = {
            reqType: "Credit",
            particular: "UPI",
            timestamp: { '$gte': startDate0, '$lte': endDate0 }, // Use valid date range
        };

        if (id !== '1') {
            const upiDetails = await UPI_list.findOne({ _id: id }, { UPI_ID: 1 });
            query.upiId = upiDetails?.UPI_ID;
        }

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { transaction_amount: { $regex: search, $options: 'i' } },
                { upiId: { $regex: search, $options: 'i' } },
            ];
        }

        const totalAmountData = await upiFundReport.aggregate([
            { $match: query },
            { $group: { _id: null, totalAmount: { $sum: "$transaction_amount" } } }
        ]);
        const totalAmount = totalAmountData.length > 0 ? totalAmountData[0].totalAmount : 0;

        const totalItems = await upiFundReport.countDocuments(query);

        const creditAmountDetails = await upiFundReport.find(query)
            .sort({ transaction_date: 1, transaction_time: 1 })
            .skip(skip)
            .limit(limit);
        const newArray = creditAmountDetails.map(details => ({
            _id: details._id,
            username: details.username,
            mobile: details.mobile,
            reqAmount: details.transaction_amount,
            reqDate: details.transaction_date,
            reqTime: details.transaction_time,
            transaction_id: details.transaction_id || null,
            upi_name: details.upiId,
            upi_app_name: "googlepay",
            reqStatus: details.transaction_status,
        }));

        return res.json({
            status: true,
            message: "Success",
            data: newArray,
            totalItems,
            totalAmount,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
        });
    } catch (error) {
        return res.json({
            status: false,
            message: "Something Bad Happened, Contact Support",
        });
    }
});

module.exports = router;


