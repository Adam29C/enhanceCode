const trakpay = require("../../model/onlineTransaction");
const upi_entries = require("../../model/API/upiPayments");
const session = require("../helpersModule/session");
const express = require("express");
const router = express.Router();
const mainPage = require("../../model/MainPage");
const walletTrace = require("../../model/Wallet_Bal_trace");
const permission = require("../helpersModule/permission");
const deleteduser = require("../../model/API/Deleted_User");
const Users = require("../../model/API/Users");
const moment =require("moment");

router.post("/getBriefDeposit", session, async (req, res) => {
  try {
    const startOfDay = moment().startOf("day").unix();
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
      message:
        bindData.length > 0 ? "Data retrieved successfully" : "No data found",
      data: bindData,
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

router.get("/dashboardCount", async (req, res) => {
  try {
    const pageData = await mainPage.findOne({});
    const traceBal = await walletTrace.findOne({}).sort({ _id: -1 }).limit(1);
    const countDlt = await deleteduser.countDocuments();
    // Fetch users data
    const usersData = await Users.find({});
    const allUsersCount = usersData.length;

    // Count banned users
    const bannedUsersCount = usersData.filter((user) => user.banned).length;

    // Update page data
    pageData.banned_Users = bannedUsersCount;
    pageData.total_user = allUsersCount;
    pageData.active_count = 0;

    // Count active users (last login within 30 days)
    usersData.forEach((user) => {
      if (user.lastLoginDate) {
        const startDate = moment(user.lastLoginDate, "DD.MM.YYYY");
        const endDate = moment();
        const days = endDate.diff(startDate, "days");
        if (days <= 30) {
          pageData.active_count++;
        }
      }
    });

    // Update IP (Assuming this function is correctly defined elsewhere)

    // Prepare response data
    const responseData = {
      data: pageData,
      yesTerday: traceBal, // If 'yesTerday' is intended as variable name, leave it as is.
      countDlt,
      title: "Dashboard",
    };

    // Send JSON response

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error in dashboard route:", error); // Log error for debugging
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading the dashboard.",
      error: error.message,
    });
  }
});

router.get("/getRegisteredUser/:reqType", session, async (req, res) => {
  try {
    const { reqType } = req.params; // Get the request type from the URL parameter
    const { page = 1, limit = 10, searchQuery = "" } = req.query; // Pagination and search parameters
    const todayDate = moment().format("DD/MM/YYYY"); // Get today's date in the format "DD/MM/YYYY"

    let query = {}; // The main query object
    let userFundArr = {}; // Object to hold user funds mapping
    let returnJson = {}; // Response object to send back

    // Prepare the base query for today’s registered users
    query.CreatedAt = { $regex: todayDate };

    // If search query is provided, add it to the search criteria
    if (searchQuery) {
      query.$or = [
        { username: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for 'username'
        { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for 'email'
      ];
    }

    // For request type 1 (users with 0 wallet balance)
    if (reqType == "1") {
      query.wallet_balance = 0;

      // Fetch paginated users who match the query
      const todayRegistered = await Users
        .find(query)
        .skip((page - 1) * limit) // Skip the records for pagination
        .limit(parseInt(limit)); // Limit the number of records returned

      // Get the total count of users matching the query for pagination
      const totalUsers = await Users.countDocuments(query);

      returnJson = {
        todayRegistered,
        pagination: {
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    } else {
      // For request type 2 (users with wallet balance > 0)
      query.wallet_balance = { $gt: 0 };

      // Fetch paginated users who match the query
      const todayRegistered = await users
        .find(query)
        .skip((page - 1) * limit) // Skip the records for pagination
        .limit(parseInt(limit)); // Limit the number of records returned

      // Extract userIds from the registered users
      const userIds = todayRegistered.map((user) => user._id);

      // Fetch all funds for the users with 'Credit' requests that are 'Approved' for today
      const userFunds = await total.find({
        userId: { $in: userIds },
        reqDate: todayDate,
        reqType: "Credit",
        reqStatus: "Approved",
      });

      // Map user funds to the userFundArr object
      userFunds.forEach((fund) => {
        const userId = fund.userId.toString(); // Ensure userId is treated as a string for consistency
        const reqAmount = fund.reqAmount;

        // Sum the requested amounts for each user
        if (!userFundArr[userId]) {
          userFundArr[userId] = reqAmount;
        } else {
          userFundArr[userId] += reqAmount; // Accumulate funds if user already exists in the object
        }
      });

      // Get the total count of users matching the query for pagination
      const totalUsers = await users.countDocuments(query);

      returnJson = {
        todayRegistered,
        userFundArr,
        pagination: {
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    }

    // Send the response back to the client
    return res.json({
      success: true,
      message: "Data fetched successfully",
      data: returnJson,
    });
  } catch (error) {
    console.error("Error in getRegisteredUser route:", error); // Log error for debugging
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching registered users.",
      error: error.message,
    });
  }
});

module.exports = router;
