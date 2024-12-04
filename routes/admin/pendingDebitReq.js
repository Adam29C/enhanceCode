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
const AdminModel = require("../../model/dashBoard/AdminModel");


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

router.post("/getBal", async (req, res) => {
    try {
        const user_id = req.body.id;
        if (!user_id) {
            return res.status(400).json({ status: false, message: "User ID is required" });
        }


        const userbal = await User.findOne(
            { _id: user_id },
            { username: 1, wallet_balance: 1, mobile: 1, email: 1, last_login: 1, _id: 0 }
        );

        if (!userbal) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        let data = {
            username: userbal.username,
            wallet_balance: userbal.wallet_balance,
            mobile: userbal.mobile,  
            email: userbal.email,    
            last_login: userbal.last_login 
        };
        res.status(200).json({
            status: true,
            data: data,
            // number: "9876543210",  
        });
    } catch (e) {
        console.error("Error in /getBal API:", e);
        res.status(500).json({ status: false, message: "An error occurred while fetching user balance" });
    }
});

router.post("/updateWallet", async (req, res) => {
    try {
        const { userId, rowId, amount: bal, particular, id, adminId } = req.body;

        // Check if required fields are missing
        if (!userId || !rowId || !bal || !id || !adminId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Fetch admin info correctly (await the promise)
        const admin = await AdminModel.findOne({ _id: adminId });  // Use AdminModel instead of 'admin'
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { username, wallet_balance, firebaseId, mobile } = user;
        let update_bal = 0;
        let detail;
        let reqType;
        let filter;
        let title;
        let body;

        const dt = dateTime.create();
        const formatted = dt.format("d/m/Y");
        const dt56 = dateTime.create();
        const time = dt56.format("I:M:S p");
        const updateTime = `${formatted} ${time}`;

        if (id === 1) { 
            update_bal = wallet_balance + parseInt(bal);
            if (update_bal < 0) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
            // Using admin's name from the fetched admin info
            detail = `Amount Added To Wallet By ${admin.name}`;
            reqType = "Credit";
            filter = 4;
            title = `Your Credit Request Of Rs. ${bal} is Approved`;
            body = "Wallet Notification";
        } else if (id === 2) { 
            update_bal = wallet_balance - parseInt(bal);
            if (update_bal < 0) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
            // Using admin's name for withdrawal as well
            detail = `Amount Withdrawn From Wallet By ${admin.name}`;
            reqType = "Debit";
            filter = 5;
            title = `Your Debit (Withdrawal) Request Of Rs.${bal} is Approved ✔️🤑💰`;
            body = `Hello ${username} 🤩🤩`;
        } else {
            return res.status(400).json({ message: "Invalid action" });
        }

        // Update the user's wallet balance
        await User.updateOne(
            { _id: userId },
            {
                $set: { wallet_balance: update_bal, wallet_bal_updated_at: updateTime }
            }
        );

        // Update the fund request status to 'Approved'
        await fundReq.updateOne(
            { _id: rowId },
            {
                $set: {
                    reqStatus: "Approved",
                    reqUpdatedAt: updateTime,
                    UpdatedBy: admin.name,  // Using admin name in the updatedBy field
                    adminId: adminId,
                    fromExport: false,
                    from: 2
                }
            }
        );

        // Save the transaction history
        const history = new wallet_hstry({
            userId,
            bidId: rowId,
            filterType: filter,
            previous_amount: wallet_balance,
            current_amount: update_bal,
            transaction_amount: parseInt(bal),
            transaction_time: time,
            description: detail,
            transaction_date: formatted,
            transaction_status: "Success",
            adminId,
            addedBy_name: admin.name,  // Using admin name in addedBy_name
            particular,
            reqType,
            username,
            mobile
        });

        await history.save();

        // Send notifications
        let userToken = [firebaseId];
        notification(userToken, title, body);

        res.json({
            status: 1,
            message: "Points Updated Successfully"
        });

    } catch (e) {
        console.error("Error in updating wallet:", e);
        res.status(500).json({ message: e.message || "An error occurred" });
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