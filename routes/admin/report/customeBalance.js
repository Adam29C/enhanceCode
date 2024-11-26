const router = require("express").Router();
const User = require("../../../model/API/Users");
const wallet_history = require("../../../model/wallet_history");
const Userprofile = require("../../../model/API/Profile")
const fundReq = require("../../../model/API/FundRequest");
const bank = require("../../../model/bank");
const dateTime = require("node-datetime");
const notification = require("../../helpersModule/creditDebitNotification");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { page = 1, perPage = 50, search } = req.body;
        const skip = (page - 1) * perPage;

        let searchQuery = { banned: false };

        if (search) {
            const searchRegex = new RegExp(search.replace("+91", "").trim(), "i");
            searchQuery = {
                ...searchQuery,
                $or: [
                    { fullname: searchRegex },
                    { username: searchRegex },
                    { mobileNumber: { $regex: searchRegex } },
                ],
            };
        }

        const users = await User.find(searchQuery)
            .skip(skip)
            .limit(parseInt(perPage))
            .sort({ wallet_balance: -1 });

        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / perPage);
        const showEntry = skip + users.length;

        const banklist = await bank.find({ status: "1" });

        return res.status(200).json({
            statusCode: 200,
            status: true,
            records: users,
            currentPage: page,
            totalPages,
            perPage,
            totalRecords: totalUsers,
            showEntry,
            data: banklist,
            title: "View Wallet",
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: "Something went wrong while fetching wallet data.",
            error: error.message,
        });
    }
});

router.post("/newHistroy", authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, id, search } = req.body;
        const skip = (page - 1) * limit;

        const searchQuery = { userId: id };

        if (search?.value) {
            const searchValue = search.value.trim();
            searchQuery["$or"] = [
                { username: { $regex: searchValue, $options: "i" } },
                { name: { $regex: searchValue, $options: "i" } },
                { mobile: { $regex: searchValue, $options: "i" } },
            ];
        }

        const walletHistory = await wallet_history
            .find(searchQuery)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ _id: -1 })
            .lean();

        const totalRecords = await wallet_history.countDocuments(searchQuery);

        const formattedData = walletHistory.map((item, index) => ({
            sno: skip + index + 1,
            Previous_Amount: item.previous_amount,
            Transaction_Amount: item.transaction_amount,
            Current_Amount: item.current_amount,
            Description: item.description,
            Transaction_Date: `${item.transaction_date} ${item.transaction_time}`,
            Transaction_Status: item.transaction_status,
            Added_by: item.addedBy_name || "Auto",
        }));

        return res.status(200).json({
            data: formattedData,
            recordsFiltered: totalRecords,
            recordsTotal: totalRecords,
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing your request.",
            error: error.message,
        });
    }
});

router.post("/newCredit", authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const skip = (page - 1) * limit;

        const id = req.body.id;

        const searchValue = req.body.search?.value?.trim();
        let searchQuery = { userId: id, reqType: { $in: ["Credit", "Debit"] } };

        if (searchValue) {
            searchQuery["$or"] = [
                { username: { $regex: searchValue, $options: "i" } },
                { name: { $regex: searchValue, $options: "i" } },
                { mobile: { $regex: searchValue, $options: "i" } },
            ];
        }

        const walletHistory = await wallet_history
            .find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 })
            .lean();
        const totalRecords = await wallet_history.countDocuments(searchQuery);

        const formattedData = walletHistory.map((item, index) => ({
            sno: skip + index + 1,
            Previous_Amount: item.previous_amount,
            Transaction_Amount: item.transaction_amount,
            Current_Amount: item.current_amount,
            Description: item.description,
            Transaction_Date: `${item.transaction_date} ${item.transaction_time}`,
            Transaction_Status: item.transaction_status,
            Added_by: item.addedBy_name || "Auto",
        }));

        return res.status(200).json({
            data: formattedData,
            recordsFiltered: totalRecords,
            recordsTotal: totalRecords,
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
        });
    } catch (error) {
        return res.status(500).json({
            status: fasle,
            message: "An error occurred while processing your request.",
            error: error.message,
        });
    }
});

router.get("/getProfile", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({
                status: fasle,
                message: "User ID is required.",
            });
        }
        const userprofile = await Userprofile.findOne({ userId }).lean();
        if (!userprofile) {
            return res.status(404).json({
                status: fasle,
                message: "Profile not filled by user.",
            });
        }
        const user = await User.findOne({ _id: userId }).lean();
        const userData = {
            userData1: user,
            userData2: userprofile,
        };
        return res.status(200).json({
            status: true,
            data: userData,
        });
    } catch (error) {
        return res.status(500).json({
            status: fasle,
            message: "An error occurred while fetching the profile.",
            error: error.message,
        });
    }
});

router.post("/walletUpdate", authMiddleware, async (req, res) => {
    try {
        const { id, amount: bal, type, particular, admin_id } = req.body;

        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(404).json({ status: fasle, message: "User not found." });
        }

        const { wallet_balance, firebaseId, mobile, username, name: fullname } = user;
        let update_bal, reqType, detail, filter;

        if (type === 1) {
            update_bal = wallet_balance + parseInt(bal);
            detail = `Amount Added To Wallet By ${adminName}`;
            reqType = "Credit";
            filter = 4;
        } else {
            update_bal = wallet_balance - parseInt(bal);
            detail = `Amount Withdrawn From Wallet By ${adminName}`;
            reqType = "Debit";
            particular = "Bank";
            filter = 5;
        }

        const dt = dateTime.create();
        const formatted = dt.format("d/m/Y");
        const time = dt.format("I:M:S p");
        const timestamp = moment(formatted, "DD/MM/YYYY").unix();
        const operations = [
            {
                updateOne: {
                    filter: { _id: id },
                    update: {
                        $set: {
                            wallet_balance: update_bal,
                            wallet_bal_updated_at: `${formatted} ${time}`,
                        },
                    },
                },
            },
            {
                insertOne: {
                    document: new fundReq({
                        userId: id,
                        reqAmount: bal,
                        fullname,
                        username,
                        mobile,
                        reqType,
                        reqStatus: "Approved",
                        reqDate: formatted,
                        reqTime: time,
                        withdrawalMode: particular,
                        UpdatedBy: adminName,
                        reqUpdatedAt: `${formatted} ${time}`,
                        fromExport: false,
                        from: 1,
                        timestamp,
                    }),
                },
            },
            {
                insertOne: {
                    document: new wallet_history({
                        userId: id,
                        filterType: filter,
                        previous_amount: wallet_balance,
                        current_amount: update_bal,
                        transaction_amount: parseInt(bal),
                        description: detail,
                        transaction_date: formatted,
                        transaction_time: time,
                        transaction_status: "Success",
                        admin_id,
                        particular,
                        timestamp,
                        username,
                        reqType,
                        addedBy_name: adminName,
                        mobile,
                    }),
                },
            },
        ];

        await User.bulkWrite(operations);

        const userToken = [firebaseId];
        const notificationTitle = type === 1
            ? `Your Credit (Deposit) Request Of Rs. ${bal}/- is Approved ✔️🤑💰`
            : `Your Debit (Withdrawal) Request Of Rs. ${bal}/- is Approved ✔️🤑💰`;
        const notificationBody = `Hello ${username} 🤩🤩`;
        notification(userToken, notificationTitle, notificationBody);

        res.json({
            status: true,
            username,
            transaction_date: `${formatted} ${time}`,
            balance: update_bal,
        });
    } catch (e) {
        console.error(e);
        res.json({ message: e.message });
    }
});

module.exports = router;