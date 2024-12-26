const trakpay = require("../../model/onlineTransaction");
const upi_entries = require("../../model/API/upiPayments");
const express = require("express");
const router = express.Router();
const mainPage = require("../../model/MainPage");
const walletTrace = require("../../model/Wallet_Bal_trace");
const deleteduser = require("../../model/API/Deleted_User");
const Users = require("../../model/API/Users");
const moment =require("moment");
const total = require("../../model/API/FundRequest");
const dashboard = require("../../model/MainPage");
const authMiddleware=require("../helpersModule/athetication");
const bids = require("../../model/games/gameBids");
const fundReq = require("../../model/API/FundRequest");
const admins = require("../../model/dashBoard/AdminModel");
const ipTable = require("../../model/manageIP");
const loginRecord = require("../../model/loginRecords");
const Pusher = require("pusher");

router.get("/getBriefDeposit", authMiddleware,async (req, res) => {
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

// router.get("/dashboardCount", authMiddleware, async (req, res) => {
//   try {
//     // Define todayDate variables at the beginning
//     const todayDate = moment().format("DD/MM/YYYY");
//     const todayDate1 = moment().format("MM/DD/YYYY");
//     const datetime = moment().format("DD/MM/YYYY HH:mm:ss");

//     // Fetch all necessary data in parallel
//     const [
//       pageData, traceBal, countDlt, userCounts, balance, banned_Users,
//       Active_users, all_user, total_zero_bal_users, today_total_zero_bal_users,
//       todayRegistered, weekRegistered, monthRegistered, lastmonthRegistered,
//       lastweekRegistered, dataUpdate
//     ] = await Promise.all([
//       mainPage.findOne({}),
//       walletTrace.findOne({}).sort({ _id: -1 }).limit(1),
//       deleteduser.countDocuments(),
//       Users.aggregate([
//         {
//           $facet: {
//             totalUsers: [{ $count: "total" }],
//             bannedUsers: [{ $match: { banned: true } }, { $count: "banned" }],
//             activeUsers: [
//               { $match: { lastLoginDate: { $gte: moment().subtract(30, 'days').toDate() } } },
//               { $count: "active" }
//             ]
//           }
//         }
//       ]),
//       Users.aggregate([
//         { $match: { banned: false } },
//         { $group: { _id: null, sumdigit: { $sum: "$wallet_balance" } } },
//       ]),
//       Users.find({ banned: true }).count(),
//       Users.find({ loginStatus: { $in: [true, 'true'] } }).count(),
//       Users.find().count(),
//       Users.find({ wallet_balance: 0 }).count(),
//       Users.find({ wallet_balance: 0, CreatedAt: todayDate }).count(),
//       Users.find({ CreatedAt: { $regex: todayDate } }).count(),
//       Users.find({
//         timestamp: { $gte: moment().subtract(moment().diff(moment().startOf('week'), 'days'), 'd').unix() }
//       }).count(),
//       Users.find({
//         timestamp: { $gte: moment().startOf('month').unix() }
//       }).count(),
//       Users.find({
//         timestamp: { $gte: moment().subtract(1, 'months').startOf('month').unix(), $lte: moment().subtract(1, 'months').endOf('month').unix() }
//       }).count(),
//       Users.find({
//         timestamp: { $gte: moment().subtract(1, 'weeks').startOf('week').unix(), $lte: moment().subtract(1, 'weeks').endOf('week').unix() }
//       }).count(),
//       dashboard.find(),
//     ]);

//     // Extract counts and values from the aggregation results
//     const allUsersCount = userCounts[0]?.totalUsers[0]?.total || 0;
//     const bannedUsersCount = userCounts[0]?.bannedUsers[0]?.banned || 0;
//     const activeUsersCount = userCounts[0]?.activeUsers[0]?.active || 0;
//     const active_Wallet_Balance = balance[0]?.sumdigit || 0;
    
//     // Extract and set the page data values
//     pageData.banned_Users = bannedUsersCount;
//     pageData.total_user = allUsersCount;
//     pageData.active_count = activeUsersCount;

//     // Fetch the yesterday registration count with corrected date comparison
//     let yesterdayRegisterStart = moment().subtract(1, 'days').startOf('day').format("DD/MM/YYYY");
//     let yesterdayRegisterEnd = moment().subtract(1, 'days').endOf('day').format("DD/MM/YYYY");

//     // Query for yesterday's registrations using the corrected date range
//     const yesterdayRegistered = await Users.countDocuments({
//       CreatedAt: { $gte: yesterdayRegisterStart, $lte: yesterdayRegisterEnd }
//     });

//     // Fetch current week's start and end dates
//     const weekStart = moment().startOf('week').format("DD/MM/YYYY");
//     const weekEnd = moment().endOf('week').format("DD/MM/YYYY");

//     // Query for current week's registrations using the corrected date range
//     const currentWeekRegistered = await Users.countDocuments({
//       CreatedAt: { $gte: weekStart, $lte: weekEnd }
//     });

//     // Perform date comparison like the cron job (checking last updated date)
//     const lastUpdate = dataUpdate[0]?.lastUpdatedAt;
//     const split = lastUpdate && lastUpdate.split(" ");
//     const compareDate = split && split.length && split[0];

//     // If today's date matches last updated date, perform the necessary updates
//     if (todayDate === compareDate) {
//       // Perform all necessary updates directly here
//       await executeQuery5sec(todayDate, todayDate1, datetime);
//     } else {
//       const stattime = "12:30 AM";
//       const currentTime = moment().format("HH:mm:ss");
//       const beginningTime = moment(currentTime, "HH:mm:ss");
//       const endTime = moment(stattime, "HH:mm A");

//       if (beginningTime < endTime) {
//         const dateBefore = moment().subtract(1, "days").format("DD/MM/YYYY");
//         const dateBefore2 = moment().subtract(1, "days").format("MM/DD/YYYY");
//         const timeDate = dateBefore + currentTime;
//         await executeQuery5sec(dateBefore, dateBefore2, timeDate);
//       } else {
//         await executeQuery5sec(todayDate, todayDate1, datetime);
//       }
//     }

//     // Update the dashboard data
//     const update_id = dataUpdate[0]._id;
//     const updateFinal = await dashboard.findOneAndUpdate(
//       { _id: update_id },
//       {
//         $set: {
//           total_wallet_balance: parseInt(active_Wallet_Balance),
//           total_user: parseInt(allUsersCount),
//           banned_Users: parseInt(bannedUsersCount),
//           Active_users: parseInt(activeUsersCount),
//           total_zero_bal_users: parseInt(total_zero_bal_users),
//           today_total_zero_bal_users: parseInt(today_total_zero_bal_users),
//           todayRegistered: parseInt(todayRegistered),
//           current_Week_regis_user: parseInt(currentWeekRegistered), // Updated current week registration
//           current_month_Registered: parseInt(monthRegistered),
//           lastmonthRegistered: parseInt(lastmonthRegistered),
//           lastweekRegistered: parseInt(lastweekRegistered),
//           yesterdayRegistered: parseInt(yesterdayRegistered), // Added yesterdayRegistered
//           lastUpdatedAt: datetime,
//         },
//       },
//       { returnOriginal: false }
//     );

//     // Prepare the response data
//     const responseData = {
//       data: pageData,
//       yesTerday: traceBal,
//       countDlt,
//       title: "Dashboard",
//     };

//     return res.status(200).json({
//       status: true,
//       message: "Dashboard data fetched and updated successfully",
//       data: responseData,
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       status: false,
//       message: "An error occurred while loading the dashboard.",
//       error: error.message,
//     });
//   }
// });

// async function executeQuery5sec(todayDate0, todayDate1, datetime) {
//   if (process.env.pm_id == "1" || true) {
//     try {
//       const formattssssed = todayDate1;
//       const todayDate = todayDate0;

//       const total_paid = await bids.aggregate([
//         { $match: { gameDate: formattssssed } },
//         {
//           $group: {
//             _id: null,
//             Total_paid_sum: { $sum: "$gameWinPoints" },
//             Total_bid_sum: { $sum: "$biddingPoints" },
//           },
//         },
//       ]);

//       let totalBidwin = 0;
//       let totol_bids = 0;
//       if (Object.keys(total_paid).length > 0) {
//         totalBidwin = total_paid[0].Total_paid_sum;
//         totol_bids = total_paid[0].Total_bid_sum;
//       }

//       const total_deposit = await fundReq.aggregate([
//         {
//           $match: {
//             reqDate: todayDate,
//             reqStatus: "Approved",
//             reqType: "Credit",
//           },
//         },
//         { $group: { _id: "$reqType", sum: { $sum: "$reqAmount" } } },
//       ]);
//       let totalDeposite = 0;
//       if (Object.keys(total_deposit).length > 0) {
//         let total = total_deposit[0].sum;
//         totalDeposite = total;
//       }

//       const total_withdraw = await fundReq.aggregate([
//         {
//           $match: {
//             reqDate: todayDate,
//             reqStatus: "Approved",
//             reqType: "Debit",
//           },
//         },
//         { $group: { _id: "$reqType", sum: { $sum: "$reqAmount" } } },
//       ]);
//       let totalwithdraw = 0;
//       if (Object.keys(total_withdraw).length > 0) {
//         let total = total_withdraw[0].sum;
//         totalwithdraw = total;
//       }

//       let dataUpdate = await dashboard.find();
//       const update_id = dataUpdate[0]._id;
//       const currentTime = datetime;
//       const updateFinal = await dashboard.findOneAndUpdate(
//         { _id: update_id },
//         {
//           $set: {
//             totol_bids: parseInt(totol_bids),
//             total_paid_today: parseInt(totalBidwin),
//             total_withdraw_amount: parseInt(totalwithdraw),
//             total_deposit_amount: parseInt(totalDeposite),
//             lastUpdatedAt: currentTime,
//           },
//         },
//         { returnOriginal: false }
//       );

//       const channels_client = new Pusher({
//         appId: "1024162",
//         key: "c5324b557c7f3a56788a",
//         secret: "c75c293b0250419f6161",
//         cluster: "ap2",
//       });

//       channels_client.trigger("my-channel", "my-event", {
//         message: updateFinal,
//         toast: "Updated Balance",
//         type: 1,
//         from: "local",
//       });
//     } catch (error) {
//       console.log(error);
//     }
//   }
// }
router.get("/dashboardCount", authMiddleware, async (req, res) => {
  try {
    const adminDetails = await admins.findOne({ _id: req.user.key }, { username: 1 });
    if (!adminDetails) {
      return res.status(400).json({
        status: false,
        message: "Admin Details Not Found",
      });
    }

    // Start concurrent queries
    const [
      traceBal,
      countDlt,
      userStats,
      bidDetails,
      usersData,
    ] = await Promise.all([
      walletTrace.findOne({}, {}, { sort: { _id: -1 } }),
      deleteduser.countDocuments(),
      getUserStatistics(),
      getBidDetails(),
      Users.find({}, "lastLoginDate"),
    ]);

    // Calculate active users in the last 30 days
    const activeCount = usersData.reduce((count, user) => {
      if (user.lastLoginDate) {
        const lastLoginDate = moment(user.lastLoginDate, "DD.MM.YYYY");
        return moment().diff(lastLoginDate, "days") <= 30 ? count + 1 : count;
      }
      return count;
    }, 0);

    const pageData = {
      ...userStats,
      ...bidDetails,
      active_count: activeCount,
    };

    // Update IP asynchronously (non-blocking)
    updateIp(adminDetails.username).catch((err) =>
      console.error("IP update failed:", err.message)
    );

const responseData = {

  data: pageData,
  yesTerday: traceBal,
  countDlt,
  title: "Dashboard",
};

return res.status(200).json({
  status: true,
  message: "Dashboard data fetched and updated successfully",
  data: responseData,
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

const getUserStatistics = async () => {
  try {
    const startTime = "12:10 AM";
    const currentTime = moment();
    const dateToUse = currentTime.isBefore(moment(startTime, "h:mm A"))
      ? currentTime.subtract(1, "days").format("DD/MM/YYYY")
      : currentTime.format("DD/MM/YYYY");

    const [balance, totalUsers, bannedUsers, activeUsers, zeroBalUsers, todayZeroBalUsers, todayRegistered] = await Promise.all([
      Users.aggregate([
        { $match: { banned: false } },
        { $group: { _id: null, totalBalance: { $sum: "$wallet_balance" } } },
      ]),
      Users.countDocuments(),
      Users.countDocuments({ banned: true }),
      Users.countDocuments({ loginStatus: { $in: [true, "true"] } }),
      Users.countDocuments({ wallet_balance: 0 }),
      Users.countDocuments({ wallet_balance: 0, CreatedAt: dateToUse }),
      Users.countDocuments({ CreatedAt: { $regex: dateToUse } }),
    ]);

    const stats = {
      total_wallet_balance: balance[0]?.totalBalance || 0,
      total_user: totalUsers,
      banned_Users: bannedUsers,
      Active_users: activeUsers,
      total_zero_bal_users: zeroBalUsers,
      today_total_zero_bal_users: todayZeroBalUsers,
      todayRegistered,
      current_Week_regis_user: await Users.countDocuments({
        timestamp: { $gte: moment().startOf("week").unix() },
      }),
      current_month_Registered: await Users.countDocuments({
        timestamp: { $gte: moment().startOf("month").unix() },
      }),
      lastmonthRegistered: await Users.countDocuments({
        timestamp: {
          $gte: moment().subtract(1, "months").startOf("month").unix(),
          $lte: moment().subtract(1, "months").endOf("month").unix(),
        },
      }),
      lastweekRegistered: await Users.countDocuments({
        timestamp: {
          $gte: moment().subtract(1, "weeks").startOf("week").unix(),
          $lte: moment().subtract(1, "weeks").endOf("week").unix(),
        },
      }),
      yesterdayRegister: await Users.countDocuments({
        CreatedAt: moment().subtract(1, "days").format("DD/MM/YYYY"),
      }),
    };

    return stats;
  } catch (error) {
    console.error("Error in fetching user statistics:", error.message);
    throw error;
  }
};

const getBidDetails = async () => {
  try {
    const currentTime = moment();
    const statTime = moment("12:10 AM", "h:mm A");
    const targetDate = currentTime.isBefore(statTime)
      ? currentTime.subtract(1, "days").format("DD/MM/YYYY")
      : currentTime.format("DD/MM/YYYY");

    const [totalPaid, totalDeposits, totalWithdrawals] = await Promise.all([
      bids.aggregate([
        { $match: { gameDate: targetDate } },
        {
          $group: {
            _id: null,
            totalPaidSum: { $sum: "$gameWinPoints" },
            totalBidSum: { $sum: "$biddingPoints" },
          },
        },
      ]),
      fundReq.aggregate([
        { $match: { reqDate: targetDate, reqStatus: "Approved", reqType: "Credit" } },
        { $group: { _id: "$reqType", sum: { $sum: "$reqAmount" } } },
      ]),
      fundReq.aggregate([
        { $match: { reqDate: targetDate, reqStatus: "Approved", reqType: "Debit" } },
        { $group: { _id: "$reqType", sum: { $sum: "$reqAmount" } } },
      ]),
    ]);

    return {
      totol_bids: totalPaid[0]?.totalBidSum || 0,
      total_paid_today: totalPaid[0]?.totalPaidSum || 0,
      total_deposit_amount: totalDeposits[0]?.sum || 0,
      total_withdraw_amount: totalWithdrawals[0]?.sum || 0,
    };
  } catch (error) {
    console.error("Error in fetching bid details:", error.message);
    throw error;
  }
};

const updateIp = async (username) => {
  try {
    const now = moment();
    const todayDate = now.format("MM/DD/YYYY");
    const time = now.format("hh:mm:ss A");
    const ipInfo = ip.address();

    await Promise.all([
      ipTable.updateOne(
        { ipAddress: ipInfo },
        {
          $set: { ipCount: 0, modified: `${todayDate} ${time}` },
        }
      ),
      loginRecord.findOneAndUpdate(
        { loginAt: todayDate },
        {
          $set: { adminName: username, loginIp: ipInfo, loginAt: todayDate, loginTime: time },
          $inc: { loginCount: 1 },
        },
        { new: true, upsert: true }
      ),
    ]);
  } catch (error) {
    console.error("Error in updating IP details:", error.message);
    throw error;
  }
};


router.post("/getRegisteredUser", async (req, res) => {
  try {
    const { reqType, page = 1, limit = 10, searchQuery = "" } = req.body;
    const todayDate = "14/11/2024";

    let query = {};
    let userFundArr = {};
    let returnJson = {};

    query.CreatedAt = { $regex: todayDate };

    if (searchQuery) {
      query.$or = [
        { username: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (reqType == "1") {
      query.wallet_balance = 0;

      const todayRegistered = await Users
        .find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();  // Ensure that we're getting plain objects

      const totalUsers = await Users.countDocuments(query);

      // Add Sno to each user
      todayRegistered.forEach((user, index) => {
        user.Sno = (page - 1) * limit + index + 1;
      });

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
      query.wallet_balance = { $gt: 0 };

      const todayRegistered = await Users
        .find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();  // Ensure that we're getting plain objects
      const userIds = todayRegistered.map((user) => user._id);

      const userFunds = await total.find({
        userId: { $in: userIds },
        reqDate: todayDate,
        reqType: "Credit",
        reqStatus: "Approved",
      });

      userFunds.forEach((fund) => {
        const userId = fund.userId.toString();
        const reqAmount = fund.reqAmount;

        if (!userFundArr[userId]) {
          userFundArr[userId] = reqAmount;
        } else {
          userFundArr[userId] += reqAmount;
        }
      });

      const totalUsers = await Users.countDocuments(query);

      // Add Sno to each user
      todayRegistered.forEach((user, index) => {
        user.Sno = (page - 1) * limit + index + 1;
      });

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


    return res.json({
      status: true,
      message: "Data fetched successfully",
      data: returnJson,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching registered users.",
      error: error.message,
    });
  }
});



router.post("/getRegisteredUserLogs",authMiddleware, async (req, res) => {
  try {
    const findRegisterLogs = await dashboard.find({});
    return res.status(200).json({
      status:true,
      message:"Registered UserLogs Shown Successfully",
      data:findRegisterLogs
    })
  }catch(err){
    return res.status(500).json({
      status: false,
      message: "Internal server Error",
      error: err.message,
    });
  }
});

module.exports = router;
