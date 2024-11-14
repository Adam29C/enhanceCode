const express =require("express");
const router = express.Router();
const User =require("../../model/API/Users");
const session = require("../helpersModule/session");
const Profile = require("../../model/API/Profile");
const mongoose =require ("mongoose")
const { ObjectId } = mongoose.Types;
const moment =require("moment")
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

const client = new MongoClient(process.env.DB_CONNECT, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})


router.post("/getAllUsers",session, async function (req, res) {
    try {
        // Page and limit parameters for pagination
        const page = parseInt(req.body.page) || 1;  // Default to page 1 if not provided
        const limit = parseInt(req.body.limit) || 10; // Default to 10 if not provided
        const skip = (page - 1) * limit;  // Calculate the skip value for pagination

        // Get the search term (if provided)
        const searchValue = req.body.search || '';

        // Build the search query if a search term is provided
        const searchFields = ["username", "name", "mobile", "deviceName"];
        const searchQuery = searchValue
            ? {
                $or: searchFields.map(field => ({
                    [field]: { $regex: searchValue, $options: 'i' } // Case-insensitive regex search
                }))
            }
            : {};  // If no search term, searchQuery is empty (no filtering)

        // Query to get users with pagination, search query and sorting
        const users = await User.find(searchQuery)
            .skip(skip)    // Skip records for pagination
            .limit(limit)  // Limit records per page
            .sort({ _id: 1 });  // Sorting by _id (you can modify this as needed)

        // Count the total number of records after applying the search query (for filtered count)
        const totalRecords = await User.countDocuments(searchQuery);

        // Format the data for the response
        const tableArray = users.map((user, index) => {
            return {
                sno: skip + index + 1,  // Increment serial number (pagination)
                name: user.name,
                username: user.username,
                mobile: user.mobile,
                deviceName: user.deviceName,
                deviceId: user.deviceId,
                CreatedAt: user.CreatedAt
            };
        });

        // Check if no users found
        if (users.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No users found matching the search criteria.",
                recordsFiltered: 0,
                recordsTotal: totalRecords
            });
        }

        // Send the response with data, total records, and filtered records
        return res.status(200).json({
            status: true,
            message: "Users fetched successfully.",
            data: tableArray,
            recordsFiltered: totalRecords,  // Total records after search filter
            recordsTotal: totalRecords      // Total records before any search filter
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Error fetching data or request too large. Please try again later."
        });
    }
});

router.post("/blockUser",session,async (req, res) => {
    try {
        // Input validation
        const { id, blockStatus, blockReason } = req.body;

        // Validate that the id, blockStatus, and blockReason are provided
        if (!id || !blockStatus || (blockStatus === undefined) || !blockReason) {
            return res.status(400).json({
                status: false,
                message: "Invalid input. 'id', 'blockStatus', and 'blockReason' are required."
            });
        }

        // Validate blockStatus (assuming it's a boolean)
        if (typeof blockStatus !== "boolean") {
            return res.status(400).json({
                status: false,
                message: "'blockStatus' must be a boolean (true or false)."
            });
        }

        // Validate blockReason (must be a string and not empty)
        if (typeof blockReason !== "string" || blockReason.trim().length === 0) {
            return res.status(400).json({
                status: false,
                message: "'blockReason' must be a non-empty string."
            });
        }

        // Attempt to find and update the user
        const user = await User.findById(id);

        if (!user) {
            // If the user is not found
            return res.status(404).json({
                status: false,
                message: `User with id ${id} not found.`
            });
        }

        // Update the user status
        await User.updateOne(
            { _id: id },
            { $set: { banned: blockStatus, blockReason: blockReason } }
        );

        // Successful response
        return res.status(200).json({
            status: true,
            message: "User blocked successfully."
        });

    } catch (err) {
        console.error("Error blocking user: ", err);  // Log error for debugging
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the request. Please try again later."
        });
    }
});

router.get("/getProfile",session, async (req, res) => {
    try {
        const { id } = req.query;
        // Validation: Check if the 'id' is provided and is a valid MongoDB ObjectId
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "id is required."
            });
        }

        // Attempt to find the user's profile based on the userId
        const userProfile = await Profile.findOne({ userId: id });

        if (!userProfile) {
            // If no profile is found for the provided userId
            return res.status(404).json({
                status: false,
                message: `Profile not found for user with id ${id}.`
            });
        }

        // If profile is found, return the user profile data
        return res.status(200).json({
            status: true,
            message: "User profile retrieved successfully.",
            userData: userProfile
        });
    } catch (err) {
        console.error("Error fetching user profile: ", err);  // Log error for debugging

        // If an unexpected error occurs, send a 500 Internal Server Error
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the profile. Please try again later."
        });
    }
});

router.post("/deleteUserByAdmin",session, async (req, res) => {
    try {
        // Destructuring the 'id' from the request body
        const { id } = req.body;

        // Validation: Check if 'id' is provided
        if (!id) {
            return res.status(400).json({
                status: false,
                message: "'id' is required to delete a user."
            });
        }

        // Validation: Check if 'id' is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid 'id'. It must be a valid MongoDB ObjectId."
            });
        }

        // Check if the user exists in the database
        const userData = await User.findOne({ _id: id });
        if (!userData) {
            return res.status(404).json({
                status: false,
                message: "User data not found for the provided ID."
            });
        }

        // Define the filter to delete related data from other collections
        const filter = { userId: new ObjectId(id) };
        const formatted = moment().format("DD/MM/YYYY HH:mm:ss");

        // Delete associated data from multiple collections
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

        // Deleting data from the "mapping_tables" and "messages" collections
        await client.connect();
        const database = client.db("admin");
        const mappingCollection = database.collection("mapping_tables");
        await mappingCollection.deleteMany(filter);
        const messageCollection = database.collection("messages");
        await messageCollection.deleteMany(filter);
        await client.close();

        // Add user details to the deleted user collection for auditing or record purposes
        const user = {
            userId: userData._id,
            name: userData.name,
            username: userData.username,
            mobile: userData.mobile,
            CreatedAt: formatted,
        };
        await deletedUser.insertMany([user]);

        // Finally, delete the user from the User collection
        await User.deleteOne({ _id: id });

        // Respond with success message
        return res.status(200).json({
            status: true,
            message: "User deleted successfully along with all related data."
        });

    } catch (err) {
        console.error("Error in deleting user:", err); // Log error for debugging

        // Respond with server error message if something goes wrong
        return res.status(500).json({
            status: false,
            message: "An error occurred while deleting the user. Please try again later."
        });
    }
});

module.exports =router