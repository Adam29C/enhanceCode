const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { MongoClient } = require("mongodb");
const User = require("../../model/API/Users");
const deletedUser = require("../../model/API/Deleted_User");
const session = require("../helpersModule/session");
const moment = require("moment");
const abBids = require("../../model/AndarBahar/ABbids");
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
const walletHistories = require("../../model/wallet_history");

// const uri = process.env.DB_CONNECT;
// const certPath = path.join(__dirname, '../../global-bundle.pem');
// const client = new MongoClient(uri, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     tls: true,
//     tlsCAFile: certPath
// });

const client = new MongoClient(process.env.DB_CONNECT, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})


router.get("/userAjax", session, async (req, res) => {
    try {
        const { pageCount, pageLimit, search } = req.query;
        let returnJson = {};
        let query = {};
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search, 'i');
            const sanitizedSearch = search.replace(/\D/g, "");
            console.log("sanitizedSearch::", sanitizedSearch);
            query = {
                $or: [
                    { name: { $regex: searchRegex } },
                    { username: { $regex: searchRegex } },
                    {
                        mobileNumber: {
                            $regex: new RegExp(`^(\\+?91)?${sanitizedSearch}$`)
                        }
                    }
                ]
            };
        }
        const usersTotalList = await User.find(query)
            .skip((pageCount - 1) * pageLimit)
            .limit(parseInt(pageLimit));

        const totalUsers = await User.countDocuments();

        returnJson = {
            usersTotalList,
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / pageLimit),
                currentPage: pageCount,
                pageSize: pageLimit,
            },
        };

        return res.status(200).json(returnJson);

    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "Something Bad Happened. Please Contact Support",
            error: error.message,
        });
    }
});

router.post("/blockUser", session, async (req, res) => {
    try {
        const { id, blockStatus, blockReason } = req.body;
        if (!id || typeof blockStatus === 'undefined') {
            return res.status(400).json({
                status: 0,
                message: "Bad Request: 'id' and 'blockStatus' are required fields.",
            });
        }

        const updateResult = await User.updateOne(
            { _id: id },
            { $set: { banned: blockStatus, blockReason } }
        );

        if (updateResult.nModified === 0) {
            return res.status(404).json({
                status: 0,
                message: "User not found or no changes made.",
            });
        }

        res.status(200).json({
            status: 1,
            message: blockStatus ? "User blocked successfully" : "User unblocked successfully",
        });
    } catch (err) {
        res.status(500).json({
            status: 0,
            message: "Internal Server Error",
            error: err.message,
        });
    }
});

router.post("/deleteUserByAdmin", session, async (req, res) => {
    try {
        const { id } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                statusCode: 400,
                status: "Failure",
                message: "Invalid user ID format.",
            });
        }

        const userData = await User.findById(id);
        if (!userData) {
            return res.status(404).json({
                statusCode: 404,
                status: "Failure",
                message: "User Data Not Found",
            });
        }

        const filter = { userId: new ObjectId(id) };
        const formattedDate = moment().format("DD/MM/YYYY HH:mm:ss");

        await Promise.all([
            abBids.deleteMany({ userId: id }),
            chats.deleteOne({ users: { $in: [id] } }),
            foundRequest.deleteMany({ userId: id }),
            gameBids.deleteMany({ userId: id }),
            gatewayPayments.deleteMany({ userId: id }),
            ideasUser.deleteMany({ userid: id }),
            manualPayments.deleteMany({ userId: id }),
            revertPayments.deleteMany(filter),
            starlineBids.deleteMany(filter),
            upiPayments.deleteMany(filter),
            userProfiles.deleteOne(filter),
            walletHistories.deleteMany(filter),
        ]);

        await client.connect();
        const database = client.db("admin");
        const mappingCollection = database.collection("mapping_tables");
        const messageCollection = database.collection("messages");

        await Promise.all([
            mappingCollection.deleteMany(filter),
            messageCollection.deleteMany(filter),
        ]);
        await client.close();

        const deletedUserData = {
            userId: userData._id,
            name: userData.name,
            username: userData.username,
            mobile: userData.mobile,
            CreatedAt: formattedDate,
        };
        await deletedUser.insertOne(deletedUserData);

        await User.deleteOne({ _id: id });

        return res.status(200).json({
            statusCode: 200,
            status: "Success",
            message: "User deleted successfully",
        });
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            status: "Failure",
            message: "Internal Server Error",
            error: err.message,
        });
    }
});

router.post("/getProfile", async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({
                statusCode: 400,
                status: "Failure",
                message: "User ID is required.",
            });
        }
        const userProfile = await userProfiles.findOne({ userId: id });

        if (!userProfile) {
            return res.status(404).json({
                statusCode: 404,
                status: "Failure",
                message: "User profile not found.",
            });
        }
        return res.status(200).json({
            statusCode: 200,
            status: "Success",
            message: "User profile retrieved successfully.",
            userData: userProfile,
        });
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            statusCode: 500,
            status: "Failure",
            message: "Internal Server Error",
            error: err.message,
        });
    }
});


module.exports = router;