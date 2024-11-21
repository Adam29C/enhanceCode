const router = require("express").Router();
const User = require("../../model/API/Users");
const kgdg = require("../../model/kgdbuser");
const deletedUser = require("../../model/API/Deleted_User");
const profile = require("../../model/API/Profile");
const session = require("../helpersModule/session");
const permission = require("../helpersModule/permission");
const dateTime = require("node-datetime");
const abBids = require("../../model/AndarBahar/ABbids")
const chats = require("../../model/chat");
const foundRequest = require("../../model/API/FundRequest");
const gameBids = require("../../model/games/gameBids");
const gatewayPayments = require("../../model/onlineTransaction");
const ideasUser = require("../../model/UserSuggestion");
const manualPayments = require("../../model/manualPayment");
const revertPayments = require("../../model/revertPayment");
const starlineBids = require("../../model/starline/StarlineBids");
const upiPayments = require("../../model/API/upiPayments");
const userProfiles = require("../../model/API/Profile");
const walletHistories = require("../../model/wallet_history")
const { MongoClient } = require("mongodb");
const { ObjectId } = require('mongodb');
const moment = require("moment");
const fs = require('fs');
const path = require('path');

router.post("/deleteduser", async function (req, res) {
    try {
        const { start, length, search} = req.body;
        const startIndex = parseInt(start) + 1;
        const { value: searchValue } = search || '';

        const searchFields = ["username", "name", "mobile"];
        const searchQuery = searchValue
            ? {
                $or: searchFields.map(field => ({
                    [field]: { $regex: searchValue, $options: 'i' }
                }))
            }
            : {};

        const deletedUsers = await deletedUser
            .find(searchQuery)
            .skip(parseInt(start))
            .limit(parseInt(length))
            .sort({ _id: 1 });

        const totalRecords = await deletedUser.countDocuments(searchQuery);

        const formattedData = deletedUsers.map((user, index) => {
            return {
                sno: startIndex + index,
                name: user.name,
                username: user.username,
                email: user.email,
                mobile: user.mobile,
            };
        });

        if (deletedUsers.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No deleted users found matching the search criteria.",
                recordsFiltered: 0,
                recordsTotal: totalRecords,
            });
        }

        return res.status(200).json({
            status: true,
            message: "Deleted users fetched successfully.",
            data: formattedData,
            recordsFiltered: totalRecords,
            recordsTotal: totalRecords,
        });
    } catch (error) {
        console.log(error, "Error fetching deleted users");
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
        });
    }
});

module.exports = router;


