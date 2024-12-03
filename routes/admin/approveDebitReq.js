const router = require("express").Router();
const fundReq = require("../../model/API/FundRequest");
const UPIlist = require("../../model/API/upiPayments");
const userProfile = require("../../model/API/Profile");
const dateTime = require("node-datetime");
const moment = require("moment");
const mongoose = require("mongoose");
const authMiddleware = require("../helpersModule/athetication")

router.post("/bank_ajax", authMiddleware, async (req, res) => {
    try {
        const { date_cust, page = 1, limit = 10 } = req.body;
        const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");

        const skip = (page - 1) * limit;
        const parsedLimit = parseInt(limit);

        const userBebitReq = await fundReq.find({
            reqDate: dateFormat,
            reqStatus: "Approved",
            reqType: "Debit",
            $and: [{ $or: [{ withdrawalMode: "Bank" }, { withdrawalMode: "Paytm" }] }],
            fromExport: true,
        })
            .skip(skip)
            .limit(parsedLimit)
            .exec();

        if (!userBebitReq || userBebitReq.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No data found for the given date or filters."
            });
        }

        let userIdArray = [];
        let debitArray = {};
        let finalObject = {};

        userBebitReq.forEach(req => {
            let reqAmount = req.reqAmount;
            let withdrawalMode = req.withdrawalMode;
            let reqDate = req.reqDate;
            let user = req.userId;
            let rowId = req._id;
            let userKi = mongoose.mongo.ObjectId(user);
            let reqTime = moment(req.reqTime);

            userIdArray.push(userKi);
            debitArray[userKi] = {
                username: req.username,
                rowId: rowId,
                userId: userKi,
                reqAmount: reqAmount,
                withdrawalMode: withdrawalMode,
                reqDate: reqDate,
                mobile: req.mobile,
                reqTime: reqTime.format('DD/MM/YYYY hh:mm A'),
                reqUpdatedAt: req.reqUpdatedAt,
            };
        });

        let arr = Object.entries(debitArray).map(([key, value]) => ({ key, ...value }));
        arr.sort((a, b) => {
            return new Date(a.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + a.reqTime.split(' ').slice(1).join(' ')) -
                new Date(b.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + b.reqTime.split(' ').slice(1).join(' '));
        });

        finalObject = Object.fromEntries(arr.map(item => [item.key, item]));

        const userProfile = await userProfile.find({ userId: { $in: userIdArray } });

        userProfile.forEach(profile => {
            let id = profile.userId;
            if (finalObject[id]) {
                finalObject[id].address = profile.address;
                finalObject[id].city = profile.city;
                finalObject[id].pincode = profile.pincode;
                finalObject[id].name = profile.account_holder_name;
                finalObject[id].account_no = profile.account_no;
                finalObject[id].bank_name = profile.bank_name;
                finalObject[id].ifsc = profile.ifsc_code;
                finalObject[id].paytm_number = profile.paytm_number;
            }
        });

        return res.status(200).json({
            status: true,
            message: "Report fetched successfully.",
            approvedData: finalObject,
            total: await fundReq.countDocuments({
                reqDate: dateFormat,
                reqStatus: "Approved",
                reqType: "Debit",
                $and: [{ $or: [{ withdrawalMode: "Bank" }, { withdrawalMode: "Paytm" }] }],
                fromExport: true,
            }),
            page: parseInt(page),
            totalPages: Math.ceil(await fundReq.countDocuments({
                reqDate: dateFormat,
                reqStatus: "Approved",
                reqType: "Debit",
                $and: [{ $or: [{ withdrawalMode: "Bank" }, { withdrawalMode: "Paytm" }] }],
                fromExport: true,
            }) / parsedLimit),
            limit: parsedLimit,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the report. Please contact support.",
            error: error.message,
        });
    }
});

router.post("/bankManual", authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, search, date } = req.body;

        if (page <= 0 || limit <= 0) {
            return res.status(400).json({
                status: false,
                message: "Page and limit must be positive integers.",
            });
        }

        const skip = (page - 1) * limit;

        if (!date || !moment(date, "MM/DD/YYYY", true).isValid()) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format. Use MM/DD/YYYY.",
            });
        }

        const formattedDate = moment(date, "MM/DD/YYYY").format("DD/MM/YYYY");

        const query = {
            reqStatus: "Approved",
            reqType: "Debit",
            withdrawalMode: "Bank",
            fromExport: false,
            from: 2,
            reqDate: formattedDate,
        };

        if (search) {
            const normalizedSearch = search.startsWith("+91") ? search : "+91" + search;

            query.$or = [
                { fullname: { $regex: search, $options: "i" } },
                { username: { $regex: search, $options: "i" } },
                { mobile: { $regex: normalizedSearch, $options: "i" } },
                { reqAmount: parseFloat(search) || -1 },
                { withdrawalMode: { $regex: search, $options: "i" } },
            ];
        }

        const reportList = await fundReq.find(query)
            .skip(skip)
            .limit(limit);
        const totalRecords = await fundReq.countDocuments(query);

        const finalArray = reportList.map((report) => ({
            toAccount: report.toAccount,
            _id: report._id,
            userId: report.userId,
            reqAmount: report.reqAmount,
            fullname: report.fullname,
            username: report.username,
            mobile: report.mobile,
            reqType: report.reqType,
            reqStatus: report.reqStatus,
            reqDate: report.reqDate,
            reqTime: moment(report.reqTime).format("DD/MM/YYYY hh:mm A"),
            withdrawalMode: report.withdrawalMode,
            UpdatedBy: report.UpdatedBy,
            reqUpdatedAt: report.reqUpdatedAt,
            timestamp: report.timestamp,
            createTime: report.createTime,
            updatedTime: report.updatedTime,
            adminId: report.adminId,
            from: report.from,
            fromExport: report.fromExport,
        }));

        return res.status(200).json({
            status: true,
            message: "Approved Report",
            data: finalArray,
            total: totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: page,
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the report. Please contact support.",
            error: e.message,
        });
    }
});

module.exports = router;