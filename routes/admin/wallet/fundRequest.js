const router = require("express").Router();
const User = require("../../../model/API/Users");
const fundReq = require("../../../model/API/FundRequest");
const Userprofile = require("../../../model/API/Profile");
const wallet_hstry = require("../../../model/wallet_history");
const Users = require("../../../model/API/Users");
const manualPayment = require("../../../model/manualPayment");
const authMiddleware = require("../../helpersModule/athetication")
const bank = require("../../../model/bank");
const dateTime = require("node-datetime");
const notification = require("../../helpersModule/creditDebitNotification");
const moment = require("moment");

router.get("/", session, permission, async (req, res) => {
    try {
        const dt = dateTime.create();
        const formatted = dt.format("d/m/Y");
        const [pendingCredit, bankList] = await Promise.all([
            fundReq
                .find({ reqStatus: "Pending", reqType: "Debit", reqDate: formatted })
                .sort({ _id: -1 }),
            bank.find()
        ]);
        return res.status(200).json({
            status: true,
            message: "Pending Fund Request Data fetched successfully",
            data: pendingCredit,
            bankList: bankList,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching data",
            error: error.message,
        });
    }
});

router.get("/getManualPaymentList", async (req, res) => {
    try {
        const { status } = req.query;
        if (!status) {
            return res.status(400).json({
                statusCode: 400,
                status: "Failure",
                message: "Status is required",
            });
        }
        const manualPaymentList = await manualPayment.find({
            status: status.toLowerCase(),
        });
        const finalArr = manualPaymentList.map((manualDetails) => ({
            _id: manualDetails._id,
            status: manualDetails.status,
            userId: manualDetails.userId,
            upiId: manualDetails.upiId,
            amount: manualDetails.amount,
            utrNumber: manualDetails.utrNumber,
            imageUrl: manualDetails.imageUrl,
            userName: manualDetails.userName,
            mobileNumber: manualDetails.mobileNumber,
            createdAt: moment(manualDetails.createTime).format("DD-MM-YYYY, h:mm:ss a"),
            updatedAt: moment(manualDetails.updatedTime).format("DD-MM-YYYY, h:mm:ss a"),
        }));
        return res.status(200).json({
            statusCode: 200,
            status: true,
            data: finalArr,
        });
    } catch (error) {
        return res.status(500).json({
            tatus: false,
            status: "Failure",
            message: "An unexpected error occurred",
            error: error.message,
        });
    }
});

router.patch("/approveManualPayment", async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({
                statusCode: 400,
                status: "Failure",
                message: "Manual Payment ID is required",
            });
        }
        const manualPaymentDetails = await manualPayment.findById(id);
        if (!manualPaymentDetails) {
            return res.status(404).json({
                statusCode: 404,
                status: "Failure",
                message: "Manual Payment Details Not Found",
            });
        }
        const userDetails = await Users.findById(manualPaymentDetails.userId);
        if (!userDetails) {
            return res.status(404).json({
                statusCode: 404,
                status: "Failure",
                message: "User Details Not Found",
            });
        }
        const formattedDate = moment().format("DD/MM/YYYY");
        const formattedTime = moment().format("hh:mm:ss a");
        const timestamp = moment().unix();
        const fundRequest = new fundReq({
            userId: manualPaymentDetails.userId,
            reqAmount: manualPaymentDetails.amount,
            fullname: userDetails.name,
            username: userDetails.username,
            mobile: userDetails.mobile,
            reqType: "Credit",
            reqStatus: "Approved",
            reqDate: formattedDate,
            reqTime: formattedTime,
            withdrawalMode: "manualPayment",
            reqUpdatedAt: `${formattedDate} ${formattedTime}`,
            fromExport: false,
            from: 1,
            timestamp,
        });
        const savedFundRequest = await fundRequest.save();
        const updatedBalance =
            userDetails.wallet_balance + parseInt(manualPaymentDetails.amount);
        await Users.updateOne(
            { _id: manualPaymentDetails.userId },
            {
                $set: {
                    wallet_balance: updatedBalance,
                    wallet_bal_updated_at: `${formattedDate} ${formattedTime}`,
                },
            }
        );
        const walletHistory = new wallet_history({
            userId: manualPaymentDetails.userId,
            bidId: savedFundRequest._id,
            filterType: 4,
            previous_amount: userDetails.wallet_balance,
            current_amount: updatedBalance,
            transaction_amount: parseInt(manualPaymentDetails.amount),
            description: `${manualPaymentDetails.amount} rs approved by manual deposit slip`,
            transaction_date: formattedDate,
            transaction_time: formattedTime,
            transaction_status: "Success",
            particular: "paymentManual",
            upiId: null,
            timestamp,
            username: userDetails.username,
            reqType: "Credit",
            addedBy_name: "admin",
            mobile: userDetails.mobile,
            transaction_id: manualPaymentDetails.utrNumber,
        });
        await walletHistory.save();

        await manualPayment.findByIdAndUpdate(id, { status: "approve" });

        const userToken = [userDetails.firebaseId];
        const title = `${manualPaymentDetails.amount} rs deposit request is approved ✅`;
        const body = `Hello ${userDetails.username}`;
        notification(userToken, title, body);

        res.status(200).json({
            statusCode: 200,
            status: "Success",
            message: "Manual Payment successfully approved",
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            status: "Failure",
            message: error.message || "Internal Server Error",
        });
    }
});

router.patch("/declineManualPayment", async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({
                statusCode: 400,
                status: "Failure",
                message: "Manual Payment ID is required",
            });
        }
        const manualPaymentDetails = await manualPayment.findById(id);
        if (!manualPaymentDetails) {
            return res.status(404).json({
                statusCode: 404,
                status: "Failure",
                message: "Manual Payment Details Not Found",
            });
        }
        const userDetails = await Users.findById(manualPaymentDetails.userId);
        if (!userDetails) {
            return res.status(404).json({
                statusCode: 404,
                status: "Failure",
                message: "User Details Not Found",
            });
        }
        await manualPayment.findByIdAndUpdate(id, { status: "decline" });

        const userToken = [userDetails.firebaseId];
        const title = `Your deposit request is cancelled due to invalid details ❎`;
        const body = `Hello ${userDetails.username}`;
        notification(userToken, title, body);

        res.status(200).json({
            statusCode: 200,
            status: "Success",
            message: "Manual Payment successfully declined",
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            status: "Failure",
            message: error.message || "Internal Server Error",
        });
    }
});

module.exports = router;