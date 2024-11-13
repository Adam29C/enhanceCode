const trakpay = require("../../model/onlineTransaction");
const upi_entries = require("../../model/API/upiPayments");
const session = require("../helpersModule/session");
const express =require("express");
const router = express.Router()
const mainPage = require("../../model/MainPage");
const walletTrace = require("../../model/Wallet_Bal_trace");
const permission = require("../helpersModule/permission");
const deleteduser = require("../../model/API/Deleted_User");


router.post("/getBriefDeposit", session, async (req, res) => {
    try {
        const startOfDay = moment().startOf('day').unix();
        const gatewayAmount = await trakpay.aggregate([
            { $match: { timestamp: startOfDay } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$reqAmount" },
                    upiName: { $first: "$reqType" },
                },
            },
        ]);
        const upiAmount = await upi_entries.aggregate([
            { $match: { timestamp: startOfDay, reqStatus: "Approved" } },
            {
                $group: {
                    _id: "$upi_name_id",
                    totalAmount: { $sum: "$reqAmount" },
                    upiName: { $first: "$upi_name" },
                },
            },
        ]);

        const bindData = [...gatewayAmount, ...upiAmount];
        return res.status(200).json({
            status: true,
            statusCode: 200,
            message: bindData.length > 0 ? "Data retrieved successfully" : "No data found",
            data: bindData
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            statusCode: 500,
            message: "Server error occurred",
            error: error.message,
        });
    }
});

router.get("/dashboardCount", session, permission, async (req, res) => {
    try {
        const userInfo = req.session.details;
        const permissionArray = req.view;
        const pageData = await mainPage.findOne({});
        const traceBal = await walletTrace.findOne({}).sort({ _id: -1 }).limit(1);
        const countDlt = await deleteduser.countDocuments();

        // Destructure necessary data from session and permission
        const check = permissionArray["main"]?.showStatus;
        const username = userInfo.username;

        // Fetch users data
        const usersData = await users.find({});
        const allUsersCount = usersData.length;

        // Count banned users
        const bannedUsersCount = usersData.filter(user => user.banned).length;

        // Update page data
        pageData.banned_Users = bannedUsersCount;
        pageData.total_user = allUsersCount;
        pageData.active_count = 0;

        // Count active users (last login within 30 days)
        usersData.forEach(user => {
            if (user.lastLoginDate) {
                const startDate = moment(user.lastLoginDate, "DD.MM.YYYY");
                const endDate = moment();
                const days = endDate.diff(startDate, 'days');
                if (days <= 30) {
                    pageData.active_count++;
                }
            }
        });

        // Update IP (Assuming this function is correctly defined elsewhere)
        updateIp(username);

        // Prepare response data
        const responseData = {
            userInfo,
            permission: permissionArray,
            data: pageData,
            yesTerday: traceBal,  // If 'yesTerday' is intended as variable name, leave it as is.
            countDlt,
            title: "Dashboard"
        };

        // Send JSON response
        if (check === 1) {
            return res.status(200).json({
                success: true,
                message: "Dashboard data fetched successfully",
                data: responseData
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "You do not have the required permissions to access this dashboard."
            });
        }
    } catch (error) {
        console.error('Error in dashboard route:', error); // Log error for debugging
        return res.status(500).json({
            success: false,
            message: 'An error occurred while loading the dashboard.',
            error: error.message,
        });
    }
});

module.exports =router;