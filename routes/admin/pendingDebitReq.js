const router = require("express").Router();
const User = require("../../model/API/Users");
const fundReq = require("../../model/API/FundRequest");
const Userprofile = require("../../model/API/Profile");
const wallet_hstry = require("../../model/wallet_history");
const authMiddleware = require("../helpersModule/athetication");
const bank = require("../../model/bank");
const dateTime = require("node-datetime");
const notification = require("../helpersModule/creditDebitNotification");
const moment = require("moment");

router.post("/pendingBank", authMiddleware, async (req, res) => {
    try {
        // Destructuring parameters from the request body
        const { page = 1, limit = 10, search } = req.body;

        const skip = (page - 1) * limit;
        const dt = dateTime.create();
        const formatted = dt.format("d/m/Y");

        let query = {
            reqStatus: "Pending",
            reqType: "Debit",
            withdrawalMode: "Bank",
            reqDate: formatted
        };

        // Handling search query if provided
        if (search) {
            const normalizedSearch = search.startsWith('+91') ? search : '+91' + search;

            query = {
                ...query,
                $or: [
                    { fullname: { $regex: search, $options: "i" } },
                    { username: { $regex: search, $options: "i" } },
                    { mobile: { $regex: normalizedSearch, $options: "i" } },
                    { reqStatus: { $regex: search, $options: "i" } },
                    { withdrawalMode: { $regex: search, $options: "i" } },
                    { reqAmount: search },
                    { reqType: { $regex: search, $options: "i" } }
                ]
            };
        }

        const pendingCreditList = await fundReq
            .find()//.find(query)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        const totalRecords = await fundReq.countDocuments(query);

        let finalArray = [];
        if (pendingCreditList.length > 0) {
            for (let pendingCredit of pendingCreditList) {
                let reqTime = moment(pendingCredit.reqTime);
                finalArray.push({
                    toAccount: pendingCredit.toAccount,
                    _id: pendingCredit._id,
                    userId: pendingCredit.userId,
                    reqAmount: pendingCredit.reqAmount,
                    fullname: pendingCredit.fullname,
                    username: pendingCredit.username,
                    mobile: pendingCredit.mobile,
                    reqType: pendingCredit.reqType,
                    reqStatus: pendingCredit.reqStatus,
                    reqDate: pendingCredit.reqDate,
                    reqTime: reqTime.format('DD/MM/YYYY hh:mm A'),
                    withdrawalMode: pendingCredit.withdrawalMode,
                    UpdatedBy: pendingCredit.UpdatedBy,
                    reqUpdatedAt: pendingCredit.reqUpdatedAt,
                    timestamp: pendingCredit.timestamp,
                    createTime: pendingCredit.createTime,
                    updatedTime: pendingCredit.updatedTime,
                    adminId: pendingCredit.adminId,
                    from: pendingCredit.from,
                    fromExport: pendingCredit.fromExport
                });
            }

            finalArray.sort((a, b) => {
                return new Date(a.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + a.reqTime.split(' ').slice(1).join(' ')) - 
                    new Date(b.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + b.reqTime.split(' ').slice(1).join(' '));
            });
        }

        return res.status(200).json({
            status: true,
            data: finalArray,
            totalRecords: totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: page,
            title: "Pending Request(Bank)"
        });

    } catch (e) {
        return res.status(500).json({
            status: false,
            message: e.message || "An error occurred"
        });
    }
});

router.get("/pendingPaytm", authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const dt = dateTime.create();
        const formatted = dt.format("d/m/Y");

        let query = {
            reqStatus: "Pending",
            reqType: "Debit",
            withdrawalMode: "Paytm",
            reqDate: formatted
        };

        if (req.query.search) {
            const searchValue = req.query.search;

            const normalizedSearch = searchValue.startsWith('+91') ? searchValue : '+91' + searchValue;

            query = {
                ...query,
                $or: [
                    { fullname: { $regex: searchValue, $options: "i" } },
                    { username: { $regex: searchValue, $options: "i" } },
                    { mobile: { $regex: normalizedSearch, $options: "i" } },
                    { reqStatus: { $regex: searchValue, $options: "i" } },
                    { withdrawalMode: { $regex: searchValue, $options: "i" } },
                    { reqAmount: searchValue },
                    { reqType: { $regex: searchValue, $options: "i" } }
                ]
            };
        }

        const pendingCreditList = await fundReq
            .find(query)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        const totalRecords = await fundReq.countDocuments(query);

        return res.status(200).json({
            status: true,
            message: "Report fetched successfully.",
            data: pendingCreditList,
            totalRecords: totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: page,
            title: "Pending Paytm Requests"
        });

    } catch (e) {
        return res.status(500).json({
            status: false,
            message: e.message || "An error occurred"
        });
    }
});

module.exports = router;