const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../../../model/API/Users");
const debitReq = require("../../../model/API/FundRequest");
const userProfile = require("../../../model/API/Profile");
const history = require("../../../model/wallet_history");
const dateTime = require("node-datetime");
const Pusher = require("pusher");
const dashBoardUp = require("../../../model/MainPage");
const daily = require("../../../model/dailyWithdraw");
const notification = require("../../helpersModule/creditDebitNotification");
const moment = require("moment");
const authMiddleware =require("../../helpersModule/athetication")

router.get("/", authMiddleware,async (req, res) => {
    try {
        const dt = dateTime.create();
        const formattedDate = dt.format("d/m/Y");
        const userDebitRequests = await debitReq.find(
            { reqStatus: "Pending", reqType: "Debit", reqDate: formattedDate },
            { _id: 1, userId: 1, reqAmount: 1, withdrawalMode: 1, reqDate: 1 }
        );

        if (userDebitRequests.length === 0) {
            return res.status(200).json({
                statusCode: 200,
                status: true,
                message: "No pending debit requests found",
                data: [],
            });
        }

        const userIdArray = userDebitRequests.map((req) =>
            mongoose.mongo.ObjectId(req.userId)
        );
        const debitArray = userDebitRequests.reduce((acc, req) => {
            acc[req.userId] = {
                rowId: req._id,
                userId: req.userId,
                reqAmount: req.reqAmount,
                withdrawalMode: req.withdrawalMode,
                reqDate: req.reqDate,
            };
            return acc;
        }, {});

        const userData = await User.find(
            { _id: { $in: userIdArray } },
            { _id: 1, wallet_balance: 1, username: 1, mobile: 1, firebaseId: 1 }
        );

        userData.forEach((user) => {
            if (debitArray[user._id]) {
                debitArray[user._id] = {
                    ...debitArray[user._id],
                    walletBal: user.wallet_balance,
                    mobile: user.mobile,
                    username: user.username,
                    firebaseId: user.firebaseId,
                };
            }
        });

        const userProfiles = await userProfile.find({
            userId: { $in: userIdArray },
        });

        userProfiles.forEach((profile) => {
            if (debitArray[profile.userId]) {
                debitArray[profile.userId] = {
                    ...debitArray[profile.userId],
                    address: profile.address,
                    city: profile.city,
                    pincode: profile.pincode,
                    name: profile.account_holder_name,
                    account_no: profile.account_no,
                    bank_name: profile.bank_name,
                    ifsc: profile.ifsc_code,
                    paytm_number: profile.paytm_number,
                };
            }
        });

        const resultArray = Object.values(debitArray);

        return res.status(200).json({
            statusCode: 200,
            status: true,
            data: resultArray,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: false,
            message: error.message || "Internal Server Error",
        });
    }
});


router.post("/xlsDataNew", async (req, res) => {
    try {
      const { 
        searchType: reqStatus, 
        reportDate, 
        Product_Code, 
        Bank_Code_Indicator, 
        Client_Code, 
        Dr_Ac_No 
      } = req.body;
  
      const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
  
      let query = {
        reqStatus: reqStatus,
        reqType: "Debit",
        reqDate: formatDate,
        fromExport: true,
      };
  
      if (reqStatus === "Pending") {
        query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
      }
  
      const userDebitReq = await debitReq.find(query, {
        _id: 1,
        reqAmount: 1,
        withdrawalMode: 1,
        reqDate: 1,
        toAccount: 1,
      });
  
      const filename = formatDate + Client_Code + ".txt";
      let finalReport = "";
  
      for (const index in userDebitReq) {
        let bankDetails = userDebitReq[index].toAccount;
        let ifsc = bankDetails.ifscCode;
        let name = bankDetails.accName;
        let amt = userDebitReq[index].reqAmount;
        let accNo = bankDetails.accNumber;
  
        if (ifsc != null) {
          ifsc = ifsc.toUpperCase();
          name = name.replace(/\.+/g, " ").toUpperCase();
        }
  
        finalReport += `${Client_Code}~${Product_Code}~NEFT~~${formatDate}~~${Dr_Ac_No}~${amt}~${Bank_Code_Indicator}~~${name}~~${ifsc}~${accNo}~~~~~~~~~~${name}~${name}~~~~~~~~~~~~~~~~~~~~~~~~\n`;
      }
  
      res.json({
        status: 0,
        filename: filename,
        writeString: finalReport,
      });
    } catch (error) {
      res.json({
        status: 0,
        error: error.toString(),
      });
    }
});

router.post("/getDetails", authMiddleware, async (req, res) => {
    try {
        const { acc_num } = req.body;

        if (!acc_num) {
            return res.status(400).json({
                status: false,
                message: "Account number is required",
            });
        }

        const profile = await userProfile.find({
            account_no: { $regex: acc_num },
        });
        const profileAgain = await userProfile.find({
            "changeDetails.old_acc_no": { $regex: acc_num },
        });

        const mergedProfiles = [...profile, ...profileAgain];

        return res.status(200).json({
            status: true,
            message: "Profiles fetched successfully",
            data: mergedProfiles,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message || "Something went wrong",
        });
    }
});

module.exports = router;