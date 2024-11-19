const router = require("express").Router();
const session = require("../../helpersModule/session");
const permission = require("../../helpersModule/permission");
const User = require("../../../model/API/Users");
const wallet_history = require("../../model/wallet_history");
const changeHistory = require("../../model/API/Profile");
const fundReq = require("../../../model/API/FundRequest");
const bank = require("../../../model/bank");
const dateTime = require("node-datetime");
const dotenv = require("dotenv");
const notification = require("../../helpersModule/creditDebitNotification");
const moment = require("moment");

router.post("/", session, permission, async (req, res) => {
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

router.post("/newHistroy", session, async (req, res) => {
    try {
        const { page = 1, limit = 10, id, search } = req.body;
        const skip = (page - 1) * limit;

        // Build the search query
        const searchQuery = { userId: id };

        if (search?.value) {
            const searchValue = search.value.trim();
            searchQuery["$or"] = [
                { username: { $regex: searchValue, $options: "i" } },
                { name: { $regex: searchValue, $options: "i" } },
                { mobile: { $regex: searchValue, $options: "i" } },
            ];
        }

        // Fetch the paginated and filtered wallet history
        const [walletHistory, totalRecords] = await Promise.all([
            wallet_history
                .find(searchQuery)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ _id: -1 })
                .lean(), // Use lean() to improve query performance
            wallet_history.countDocuments(searchQuery),
        ]);

        // Format the results
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

        // Send the response
        return res.status(200).json({
            data: formattedData,
            recordsFiltered: totalRecords,
            recordsTotal: totalRecords,
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
        });
    } catch (error) {
        console.error("Error in /newHistroy API:", error);
        return res.status(500).json({
            status: 0,
            message: "An error occurred while processing your request.",
            error: error.message,
        });
    }
});

router.post("/newCredit", session, async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const skip = (page - 1) * limit;

        const id = req.body.id;

        // Build search query
        const searchValue = req.body.search?.value?.trim();
        let searchQuery = { userId: id, reqType: { $in: ["Credit", "Debit"] } };

        if (searchValue) {
            searchQuery["$or"] = [
                { username: { $regex: searchValue, $options: "i" } },
                { name: { $regex: searchValue, $options: "i" } },
                { mobile: { $regex: searchValue, $options: "i" } },
            ];
        }

        // Query wallet history with pagination and sorting
        const walletHistory = await wallet_history
            .find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }) // Sort by most recent transaction
            .lean(); // Use lean to improve query performance

        // Count total matching documents for pagination
        const totalRecords = await wallet_history.countDocuments(searchQuery);

        // Format the result for output
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

        // Return paginated response
        return res.status(200).json({
            data: formattedData,
            recordsFiltered: totalRecords,
            recordsTotal: totalRecords,
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
        });
    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "An error occurred while processing your request.",
            error: error.message,
        });
    }
});