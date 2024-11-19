const express = require("express");
const router = express.Router();
const User = require("../../model/API/Users");
const session = require("../helpersModule/session");
const Profile = require("../../model/API/Profile");
const mongoose = require("mongoose")
const { ObjectId } = mongoose.Types;
const moment = require("moment")
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
const authMiddleware=require("../helpersModule/athetication")
const client = new MongoClient(process.env.DB_CONNECT, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})


router.post("/getAllUsers", authMiddleware, async function (req, res) {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const skip = (page - 1) * limit;

        const searchValue = req.body.search || '';

        const searchFields = ["username", "name", "mobile", "deviceName"];
        const searchQuery = searchValue
            ? {
                $or: searchFields.map(field => ({
                    [field]: { $regex: searchValue, $options: 'i' }
                }))
            }
            : {};

        const users = await User.find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ _id: 1 });

        const totalRecords = await User.countDocuments(searchQuery);

        const tableArray = users.map((user, index) => {
            return {
                sno: skip + index + 1,
                name: user.name,
                username: user.username,
                mobile: user.mobile,
                deviceName: user.deviceName,
                deviceId: user.deviceId,
                CreatedAt: user.CreatedAt,
                id:user._id
            };
        });

        if (users.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No users found matching the search criteria.",
                recordsFiltered: 0,
                recordsTotal: totalRecords
            });
        }

        return res.status(200).json({
            status: true,
            message: "Users fetched successfully.",
            data: tableArray,
            recordsFiltered: totalRecords,
            recordsTotal: totalRecords
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Error fetching data or request too large. Please try again later."
        });
    }
});

router.post("/blockUser", authMiddleware, async (req, res) => {
    try {
        const { id, blockStatus, ression } = req.body;

        if (!id || !blockStatus || (blockStatus === undefined) || !blockReason) {
            return res.status(400).json({
                status: false,
                message: "Invalid input. 'id', 'blockStatus', and 'blockReason' are required."
            });
        }

        if (typeof blockStatus !== "boolean") {
            return res.status(400).json({
                status: false,
                message: "'blockStatus' must be a boolean (true or false)."
            });
        }

        if (typeof blockReason !== "string" || blockReason.trim().length === 0) {
            return res.status(400).json({
                status: false,
                message: "'blockReason' must be a non-empty string."
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                status: false,
                message: `User with id ${id} not found.`
            });
        }

        await User.updateOne(
            { _id: id },
            { $set: { banned: blockStatus, blockReason: blockReason } }
        );

        return res.status(200).json({
            status: true,
            message: "User blocked successfully."
        });
    } catch (err) {
        console.error("Error blocking user: ", err);
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request. Please try again later."
        });
    }
});

router.get("/getProfile", authMiddleware, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "id is required."
            });
        }

        const userProfile = await Profile.findOne({ userId: id });

        if (!userProfile) {
            return res.status(404).json({
                status: false,
                message: `Profile Not Filled By User.`
            });
        }

        return res.status(200).json({
            status: true,
            message: "User profile retrieved successfully.",
            userData: userProfile
        });
    } catch (err) {
        console.error("Error fetching user profile: ", err);

        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the profile. Please try again later."
        });
    }
});

router.post("/deleteUserByAdmin", authMiddleware, async (req, res) => {
    try {
        const { id,ression } = req.body;

        if (!id) {
            return res.status(400).json({
                status: false,
                message: "'id' is required to delete a user."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid 'id'. It must be a valid MongoDB ObjectId."
            });
        }

        const userData = await User.findOne({ _id: id });
        if (!userData) {
            return res.status(404).json({
                status: false,
                message: "User data not found for the provided ID."
            });
        }

        const filter = { userId: new ObjectId(id) };
        const formatted = moment().format("DD/MM/YYYY HH:mm:ss");

        await abBids.deleteMany({ userId: id });
        await chats.deleteOne({ users: { $in: [id] } });
        await foundRequest.deleteMany({ userId: id });
        await gameBids.deleteMany({ userId: id });
        await gatewayPayments.deleteMany({ userId: id });
        await ideasUser.deleteMany({ userid: id });
        await manualPayments.deleteMany({ userId: id });
        await revertPayments.deleteMany(filter);
        await starlineBids.deleteMany(filter);
        await upiPayments.deleteMany(filter);
        await userProfiles.deleteOne(filter);
        await walletHistories.deleteMany(filter);

        await client.connect();
        const database = client.db("admin");
        const mappingCollection = database.collection("mapping_tables");
        await mappingCollection.deleteMany(filter);
        const messageCollection = database.collection("messages");
        await messageCollection.deleteMany(filter);
        await client.close();

        const user = {
            userId: userData._id,
            name: userData.name,
            username: userData.username,
            mobile: userData.mobile,
            CreatedAt: formatted,
        };
        await deletedUser.insertMany([user]);

        await User.deleteOne({ _id: id });

        return res.status(200).json({
            status: true,
            message: "User deleted successfully along with all related data."
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while deleting the user. Please try again later."
        });
    }
});

module.exports = router