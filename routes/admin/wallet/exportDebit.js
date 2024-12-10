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
const AdminModel = require("../../../model/dashBoard/AdminModel");

router.post("/", authMiddleware, async (req, res) => {
    try {
        // Extract limit and page from the request body
        const { limit = 10, page = 1 } = req.body;

        // Validate limit and page values
        const parsedLimit = parseInt(limit, 10);
        const parsedPage = parseInt(page, 10);

        if (isNaN(parsedLimit) || parsedLimit <= 0) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Invalid limit parameter",
            });
        }

        if (isNaN(parsedPage) || parsedPage <= 0) {
            return res.status(400).json({
                statusCode: 400,
                status: false,
                message: "Invalid page parameter",
            });
        }

        // Calculate skip based on page and limit
        const skip = (parsedPage - 1) * parsedLimit;

        const dt = dateTime.create();
        const formattedDate = dt.format("d/m/Y");

        // Find user debit requests with limit and pagination
		//yha par maine query hatai hai jisse data a sake baad me ise lgana hai
        const userDebitRequests = await debitReq.find(
		{ reqStatus: "Pending", reqType: "Debit", reqDate: formattedDate },
		{ _id: 1, userId: 1, reqAmount: 1, withdrawalMode: 1, reqDate: 1 }
		)
            .skip(skip)
            .limit(parsedLimit);

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

        // Fetch user data
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

        // Fetch user profiles
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
  
      const userDebitReq = await debitReq.find({
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
        status: true,
        filename: filename,
        writeString: finalReport,
      });
    } catch (error) {
      res.json({
        status: flase,
        error: error.toString(),
      });
    }
});

router.post("/getDetails",authMiddleware,  async (req, res) => {
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

router.post("/todayApproved",authMiddleware, async (req, res) => {
	try {

		const date = req.body.date;
		const formatDate = moment(date, "MM/DD/YYYY").format("DD/MM/YYYY");
		console.log(formatDate,"formatDate")
		const todayReports = await daily.find({ ReportDate: "06/12/2024" });//yha par static data daal diya hai testing ke lia
		res.json({
			status: true,
			data: todayReports,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/xlsDataDaily",authMiddleware, async (req, res) => {
	try {
		const { reportID, type, reportType, Product_Code, Bank_Code_Indicator, Client_Code, Dr_Ac_No } = req.body;
		const formatDate = moment().format("DD/MM/YYYY");
		const todayReports = await daily.findOne({ _id: reportID });
		const ids = todayReports.ApprovedIDs;
		const reportName = todayReports.ReportName;
		const userBebitReq = await debitReq.find({ _id: { $in: ids } });
		if (type === 1) {
			return res.json({
				status: true,
				Profile: userBebitReq,
				date: formatDate,
			});
		}
		const filename = formatDate + Client_Code + reportName + ".txt";
		let finalReport = "";
		for (index in userBebitReq) {
			let bankDetails = userBebitReq[index].toAccount;
			let ifsc = bankDetails.ifscCode;
			let name = bankDetails.accName;
			let amt = userBebitReq[index].reqAmount;
			let accNo = bankDetails.accNumber;
			if (ifsc != null) {
				ifsc = ifsc.toUpperCase();
				name = name.replace(/\.+/g, " ");
				name = name.toUpperCase();
			}
			finalReport += Client_Code + "~" + Product_Code + "~NEFT~~" + formatDate + "~~" + Dr_Ac_No + "~" + amt + "~" + Bank_Code_Indicator + "~~" + name + "~~" + ifsc + "~" + accNo + "~~~~~~~~~~" + name + "~" + name + "~~~~~~~~~~~~~~~~~~~~~~~~\n";
		}
		res.json({
			status: true,
			filename: filename,
			writeString: finalReport,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error.toString(),
		});
	}
});

router.post("/xlsDataDailyTrak",authMiddleware, async (req, res) => {
	try {
		const reqStatus = req.body.searchType;
		const reportDate = req.body.reportDate;
		const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");

		let query = {
			reqStatus: reqStatus,
			reqType: "Debit",
			reqDate: formatDate,
			fromExport: true,
		};

		if (reqStatus == "Pending") {
			query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
		}

		const userBebitReq = await debitReq.find(query, {
			_id: 1,
			reqAmount: 1,
			withdrawalMode: 1,
			reqDate: 1,
			toAccount: 1,
			mobile: 1
		});

		res.json({
			status: true,
			Profile: userBebitReq,
			date: formatDate,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/showCondition",authMiddleware,  async (req, res) => {
	try {
		const reqStatus = req.body.searchType;
		const reportDate = req.body.reportDate;
		const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
		let totlaAmt = 0;
		let query;
        
		switch (reqStatus) {
			case "0":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					//fromExport: true,--->testing ke lia 
				};
				break;
			case "1":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $eq: 1000 },
				};

				break;
			case "2":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $lte: 5000 },
				};
				break;
			case "3":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $lt: 20000 },
				};
				break;
			case "4":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $gte: 20000 },
				};
				break;
		}

		if (reqStatus == "Pending") {
			query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
		}
        console.log(query,"query")
		const userBebitReq = await debitReq.find(query, {
			_id: 1,
			userId: 1,
			reqAmount: 1,
			withdrawalMode: 1,
			reqDate: 1,
			username: 1,
		});

		let userIdArray = [];
		let debitArray = {};

		for (index in userBebitReq) {
			let reqAmount = userBebitReq[index].reqAmount;
			let withdrawalMode = userBebitReq[index].withdrawalMode;
			let reqDate = userBebitReq[index].reqDate;
			let username = userBebitReq[index].username;
			let user = userBebitReq[index].userId;
			let userKi = mongoose.mongo.ObjectId(user);
			userIdArray.push(userKi);
			totlaAmt += reqAmount;
			debitArray[userKi] = {
				reqAmount: reqAmount,
				withdrawalMode: withdrawalMode,
				reqDate: reqDate,
				username: username,
			};
		}

		//let user_Profile = await userProfile.find({ userId: { $in: userIdArray }});
		let user_Profile = await userProfile.find({ userId: { $in: userIdArray } }, { account_holder_name: 1, account_no: 1,ifsc_code:1,bank_name:1,username:1 });

    //    console.log(user_Profile,"user_Profile") 
	// 	for (index in user_Profile) {
	// 		let id = user_Profile[index].userId;
	// 		if (debitArray[id]) {
	// 			debitArray[id].name = user_Profile[index].account_holder_name;
	// 			debitArray[id].account_no = user_Profile[index].account_no;
	// 			debitArray[id].ifsc = user_Profile[index].ifsc_code;
	// 			debitArray[id].bname = user_Profile[index].bank_name;
	// 		}
	// 	}
		res.json({
			status: true,
			Profile: user_Profile,
			totalAmt: totlaAmt,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/xlsDataNewCondition",authMiddleware, async (req, res) => {
	try {
		const reqStatus = req.body.searchType;
		const reportDate = req.body.reportDate;
		const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
		let totlaAmt = 0;
		let query;

		switch (reqStatus) {
			case "0":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
				};
				break;
			case "1":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $eq: 1000 },
				};
				

				break;
			case "2":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $lte: 5000 },
				};
				break;
			case "3":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $lt: 20000 },
				};
				break;
			case "4":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $gte: 20000 },
				};
				break;
		}

		if (reqStatus == "Pending") {
			query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
		}

		const userBebitReq = await debitReq.find(query, {
			_id: 1,
			userId: 1,
			reqAmount: 1,
			withdrawalMode: 1,
			reqDate: 1,
		});

		let userIdArray = [];
		let debitArray = {};

		for (index in userBebitReq) {
			let reqAmount = userBebitReq[index].reqAmount;
			let withdrawalMode = userBebitReq[index].withdrawalMode;
			let reqDate = userBebitReq[index].reqDate;
			let user = userBebitReq[index].userId;
			let rowId = userBebitReq[index]._id;
			let userKi = mongoose.mongo.ObjectId(user);
			totlaAmt += reqAmount;
			userIdArray.push(userKi);
			debitArray[userKi] = {
				rowId: rowId,
				userId: userKi,
				reqAmount: reqAmount,
				withdrawalMode: withdrawalMode,
				reqDate: reqDate,
			};
		}

		let userData = await User.find(
			{ _id: { $in: userIdArray } },
			{ _id: 1, wallet_balance: 1 }
		);

		for (index in userData) {
			let id = userData[index]._id;
			let walletBal = userData[index].wallet_balance;
			if (debitArray[id]) {
				debitArray[id].walletBal = walletBal;
			}
		}

		let user_Profile = await userProfile.find({ userId: { $in: userIdArray } });

		for (index in user_Profile) {
			let id = user_Profile[index].userId;
			if (debitArray[id]) {
				debitArray[id].name = user_Profile[index].account_holder_name;
				debitArray[id].account_no = user_Profile[index].account_no;
				debitArray[id].ifsc = user_Profile[index].ifsc_code;
			}
		}

		let Product_Code = req.body.Product_Code;
		let Bank_Code_Indicator = req.body.Bank_Code_Indicator;
		let Client_Code = req.body.Client_Code;
		let Dr_Ac_No = req.body.Dr_Ac_No;

		const filename = formatDate + Client_Code + ".txt";
		let finalReport = "";

		for (index in debitArray) {
			let ifsc = debitArray[index].ifsc;
			let name = debitArray[index].name;
			let amt = debitArray[index].reqAmount;
			let accNo = debitArray[index].account_no;

			if (ifsc != null) {
				ifsc = ifsc.toUpperCase();
				name = name.replace(/\.+/g, " ");
				name = name.toUpperCase();
			}

			finalReport +=
				Client_Code +
				"~" +
				Product_Code +
				"~NEFT~~" +
				formatDate +
				"~~" +
				Dr_Ac_No +
				"~" +
				amt +
				"~" +
				Bank_Code_Indicator +
				"~~" +
				name +
				"~~" +
				ifsc +
				"~" +
				accNo +
				"~~~~~~~~~~" +
				name +
				"~" +
				name +
				"~~~~~~~~~~~~~~~~~~~~~~~~\n";
		}

		res.json({
			status: true,
			Profile: debitArray,
			filename: filename,
			writeString: finalReport,
			totalAmt: totlaAmt,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/xlsDataDailyTrakCondition",authMiddleware, async (req, res) => {
	try {
		const reqStatus = req.body.searchType;
		const reportDate = req.body.reportDate;
		const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
		let totlaAmt = 0;
		let query;

		switch (reqStatus) {
			case "0":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
				};
				break;
			case "1":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $eq: 1000 },
				};

				break;
			case "2":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $lte: 5000 },
				};
				break;
			case "3":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $lt: 20000 },
				};
				break;
			case "4":
				query = {
					reqStatus: "Approved",
					reqType: "Debit",
					reqDate: formatDate,
					fromExport: true,
					reqAmount: { $gte: 20000 },
				};
				break;
		}

		const userBebitReq = await debitReq.find(query, {
			_id: 1,
			userId: 1,
			reqAmount: 1,
			withdrawalMode: 1,
			reqDate: 1,
		});

		let userIdArray = [];
		let debitArray = {};

		for (index in userBebitReq) {
			let reqAmount = userBebitReq[index].reqAmount;
			let withdrawalMode = userBebitReq[index].withdrawalMode;
			let reqDate = userBebitReq[index].reqDate;
			let user = userBebitReq[index].userId;
			let rowId = userBebitReq[index]._id;
			let userKi = mongoose.mongo.ObjectId(user);
			totlaAmt += reqAmount;
			userIdArray.push(userKi);
			debitArray[userKi] = {
				rowId: rowId,
				userId: userKi,
				reqAmount: reqAmount,
				withdrawalMode: withdrawalMode,
				reqDate: reqDate,
			};
		}

		let userData = await User.find(
			{ _id: { $in: userIdArray } },
			{ _id: 1, wallet_balance: 1 }
		);

		for (index in userData) {
			let id = userData[index]._id;
			let walletBal = userData[index].wallet_balance;
			if (debitArray[id]) {
				debitArray[id].walletBal = walletBal;
			}
		}

		let user_Profile = await userProfile.find({ userId: { $in: userIdArray } });

		for (index in user_Profile) {
			let id = user_Profile[index].userId;
			if (debitArray[id]) {
				debitArray[id].name = user_Profile[index].account_holder_name;
				debitArray[id].account_no = user_Profile[index].account_no;
				debitArray[id].ifsc = user_Profile[index].ifsc_code;
				debitArray[id].bank_name = user_Profile[index].bank_name;
			}
		}

		res.json({
			status: true,
			Profile: debitArray,
			date: formatDate,
			totalAmt: totlaAmt,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/getDetails", async (req, res) => {
	try {
		const number = req.body.acc_num;
		let profile = await userProfile.find({ account_no: { $regex: number } });
		let profileAgain = await userProfile.find({
			"changeDetails.old_acc_no": { $regex: number },
		});
		let merge = [...profile, ...profileAgain]
		res.json(merge);
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/getChangeDetails",authMiddleware,async (req, res) => {
	try {
		const number = req.body.rowId;
		let profile = await userProfile.findOne({ _id: number });
		res.json(profile);
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

async function updateReal(points) {
	let dataUpdate = await dashBoardUp.find();
	const update_id = dataUpdate[0]._id;
	await dashBoardUp.updateOne(
		{ _id: update_id },
		{
			$inc: {
				total_withdraw_amount: parseInt(points),
			},
		}
	);
}
router.post("/rblxls",authMiddleware, async (req, res) => {
    try {
        const reqStatus = req.body.searchType;
        const reportDate = req.body.reportDate;
        const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
        let query = {
            reqStatus: reqStatus,
            reqType: "Debit",
            reqDate: formatDate,
            fromExport: true,
        };
        if (reqStatus == "Pending") {
            query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
        }
        const userBebitReq = await debitReq.find(query, {
            _id: 1,
            reqAmount: 1,
            withdrawalMode: 1,
            reqDate: 1,
            toAccount: 1,
            mobile: 1
        });
        const formattedData = userBebitReq.map(item => ({
            destinationAcNumber: item.toAccount.accNumber,
            destinationBankName: item.toAccount.bankName,
            destinationIfscCode: item.toAccount.ifscCode,
            destinationAccName: item.toAccount.accName,
            amount: item.reqAmount,
            withdrawalMode: item.withdrawalMode,
            paymentType: "NFT",
            sourceNarration: "to XYZ",
            currency: "INR",
            destinationNarration: "From abc",
            beneficiaryAccountType: "Saving",
            sourceAccountNumber: "100881008810088",
            email: "abc@ac.com"
        }));
        res.json({
            status: true,
            Profile: formattedData,
            date: formatDate,
        });
    } catch (error) {
        res.json({
            status: false,
            error: error.message || error,
        });
    }
});

router.post("/mkxls",authMiddleware, async (req, res) => {
	try {
		const reqStatus = req.body.searchType;
		const reportDate = req.body.reportDate;
		const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
		let query = {
			reqStatus: reqStatus,
			reqType: "Debit",
			reqDate: formatDate,
			fromExport: true,
		};
		if (reqStatus == "Pending") {
			query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
		}
		const userBebitReq = await debitReq.find(query, {
			_id: 1,
			reqAmount: 1,
			withdrawalMode: 1,
			reqDate: 1,
			toAccount: 1,
			mobile: 1
		});
		let finalReport = "";
		let Client_Code = "MKTTC";
		let filename =`${Client_Code}.txt`;
		for (index in userBebitReq) {
			let bankDetails = userBebitReq[index].toAccount;
			let ifsc = bankDetails.ifscCode;
			let name = bankDetails.accName;
			let amt = userBebitReq[index].reqAmount;
			let accNo = bankDetails.accNumber;

			if (ifsc != null) {
				ifsc = ifsc.toUpperCase();
				name = name.replace(/\.+/g, " ");
				name = name.toUpperCase();
			}
			let Product_Code = "VPAY";
			let Dr_Ac_No = 1548423085;
			let Bank_Code_Indicator = "M";

			finalReport += Client_Code + "~" + Product_Code + "~NEFT~~" + formatDate + "~~" + Dr_Ac_No + "~" + amt + "~" + Bank_Code_Indicator + "~~" + name + "~~" + ifsc + "~" + accNo + "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n";
		}
		res.json({
			status: true,
			filename: filename,
			writeString: finalReport,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error.message || error,
		});
	}
});

router.post("/gajjubob",authMiddleware, async (req, res) => {
	try {
		const reqStatus = req.body.searchType;
		const reportDate = req.body.reportDate;
		const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
		let query = {
			reqStatus: reqStatus,
			reqType: "Debit",
			reqDate: formatDate,
			fromExport: true,
		};
		if (reqStatus == "Pending") {
			query = { reqStatus: reqStatus, reqType: "Debit", reqDate: formatDate };
		}
		const userBebitReq = await debitReq.find(query, {
			_id: 1,
			reqAmount: 1,
			withdrawalMode: 1,
			reqDate: 1,
			toAccount: 1,
			mobile: 1,
			username:1
		});
		let finalReport = "";
		let clientAccount="33190200000689"
		let filename = "GAJJUBOB.TXT";
		let count =1;
		for (index in userBebitReq) {
			let bankDetails = userBebitReq[index].toAccount;
			let ifsc = bankDetails.ifscCode;
			let name = bankDetails.accName;
			let amt = userBebitReq[index].reqAmount;
			let accNo = bankDetails.accNumber;
			let username = userBebitReq[index].username
			const formattedSerial = count.toString().padStart(4, '0');
			if (ifsc != null) {
				ifsc = ifsc.toUpperCase();
				name = name.replace(/\.+/g, " ");
				name = name.toUpperCase();
			}
			finalReport += `${formattedSerial} | ${clientAccount} | ${amt} | ${ifsc} | ${accNo} | ${username} | SB \n`
			count = count +1
		}
		return res.json({
			status: true,
			filename: filename,
			writeString: finalReport,
		});
	} catch (error) {
		return res.json({
			status: false,
			error: error.message || error,
		});
	}
})

router.post("/Finapnb",authMiddleware, async (req, res) => {
    try {
        const reqStatus = req.body.searchType;
        const reportDate = req.body.reportDate;
        const formatDate = moment(reportDate, "MM/DD/YYYY").format("DD/MM/YYYY");
        
        let query = {
            reqStatus,
            reqType: "Debit",
            reqDate: formatDate,
            fromExport: true,
        };

        if (reqStatus === "Pending") {
            query = { reqStatus, reqType: "Debit", reqDate: formatDate };
        }

        const userBebitReq = await debitReq.find(query, {
            _id: 1,
            reqAmount: 1,
            withdrawalMode: 1,
            reqDate: 1,
            toAccount: 1,
            mobile: 1,
            username: 1
        });

        const formattedData = userBebitReq.map(item => ({
			type: "NFT",
			parentAcountNo: "0153001111111111",
			amount: item.reqAmount,
			currency: "INR",
			clientAcount: item.toAccount.accNumber,
            customerAccount: item.toAccount.accName.replace(/\.+/g, " ").toUpperCase(),
			ifscCode : item.toAccount.ifscCode?.toUpperCase(),
        }));

        res.json({
            status: true,
            Profile: formattedData,
            date: formatDate,
        });
    } catch (error) {
        res.json({
            status: false,
            error: error.message || error,
        });
    }
});

router.post("/approveReq",authMiddleware,async (req, res) => {
	try {
		const updateArray = req.body.ids;
		const userArray = req.body.userData;
		const userplusIds = req.body.userplusIds;
		const dt = dateTime.create();
		const formatted = dt.format("m/d/Y I:M:S p");
		const formatted2 = dt.format("d/m/Y I:M:S p");
		const time = dt.format("I:M p");
		const dateToday = dt.format("d/m/Y");
		const userInfo = req.session.details;
		const adminName = userInfo.username;
		const adminId = userInfo.user_id;
		let total = 0;
		const historyArray = [];


		const dailyReport = new daily({
			ApprovedIDs: updateArray,
			ReportName: time + " Report",
			ReportTime: time,
			ReportDate: dateToday,
			adminName: adminName,
		});

		await dailyReport.save();

		await debitReq.updateMany(
			{ _id: updateArray },
			{
				$set: {
					reqStatus: "Approved",
					UpdatedBy: adminName,
					reqUpdatedAt: formatted,
					fromExport: true,
					from: 2,
				},
			}
		);

		for (index in userArray) {
			let userId = userArray[index].userId;
			let userName = userArray[index].username;
			let transaction_amount = userArray[index].req_amt;
			let mobile = userArray[index].mobile;

			total += parseInt(transaction_amount);

			let userDetail = await User.findOne(
				{ _id: userId },
				{ wallet_balance: 1,firebaseId:1 }
			);
			let wallet_balance = userDetail.wallet_balance;
			let updateAmt = wallet_balance - transaction_amount;
			await User.updateOne(
				{ _id: userId },
				{
					$set: {
						wallet_balance: updateAmt,
						wallet_bal_updated_at: formatted2,
					},
				}
			);

			let dt0 = dateTime.create();
			let time = dt0.format("I:M:S p");

			let rowSearch = userplusIds[userId];
			let rowId = rowSearch.rowId

			let dataHistory = {
				userId: userId,
				bidId: rowId,
				filterType: 9,
				previous_amount: wallet_balance,
				current_amount: updateAmt,
				transaction_amount: transaction_amount,
				username: userName,
				description: "Amount Debited For Withdraw Request",
				transaction_date: dateToday,
				transaction_time: time,
				transaction_status: "Success",
				reqType: "Debit",
				admin_id: adminId,
				addedBy_name: adminName,
				mobile: mobile,
			};
			historyArray.push(dataHistory);
			updateReal(total);

			let userToken = [];
			userToken.push(userDetail.firebaseId);
			let title = `Your Debit (Withdrawal) Request Of Rs.${transaction_amount}/- is Approved ✔️🤑💰`;
			let body = `Hello ${userName} 🤩🤩`;
			notification(userToken, title, body);
		}

		await history.insertMany(historyArray);

		res.json({
			status: true,
		});
	} catch (error) {
		res.json({
			status: false,
			error: error,
		});
	}
});

router.post("/decline", async (req, res) => {
    try {
        // Validate required fields
        const { rowId, firebaseId, userId, reason, amountDecline,id } = req.body;
        if (!rowId || !firebaseId || !userId || !reason || !amountDecline) {
            return res.status(400).json({
                status: false,
                error: "Missing required fields (rowId, firebaseId, userId, reason, amountDecline)."
            });
        }
		const adminInfo= await AdminModel.findOne({_id:id})
		console.log(adminInfo,"adminInfo")

        const dt = dateTime.create();
        const formatted = dt.format("m/d/Y I:M:S");
        const time = dt.format("I:M p");
        const dateToday = dt.format("d/m/Y");
        const userInfo = req.session.details;
        const adminName = adminInfo.name;
        const adminId = adminInfo._id;
        // Start a database session for transaction handling
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Update debit request status to "Declined"
            const updatedDebitReq = await debitReq.updateOne(
                { _id: rowId },
                {
                    $set: {
                        reqStatus: "Declined",
                        reqUpdatedAt: formatted,
                        UpdatedBy: adminName,
                    },
                },
                { session }
            );

            if (updatedDebitReq.nModified === 0) {
                throw new Error("Failed to update the debit request status.");
            }
            // Retrieve user data
            const user = await User.findOne({ _id: userId }, { wallet_balance: 1, mobile: 1, username: 1, firebaseId: 1, _id: 0 }).session(session);
            if (!user) {
                throw new Error("User not found.");
            }
            // Create transaction history record
            const dataHistory = new history({
                userId,
                bidId: rowId,
                filterType: 9,
                previous_amount: user.wallet_balance,
                current_amount: user.wallet_balance,
                transaction_amount: amountDecline,
                username: user.username,
                description: `Your Withdraw Request Is Cancelled Due To ${reason}`,
                transaction_date: dateToday,
                transaction_time: time,
                transaction_status: "Success",
                reqType: "Debit",
                admin_id: adminId,
                addedBy_name: adminName,
                mobile: user.mobile,
            });
            await dataHistory.save({ session });

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            // Prepare notification
            let title = `Your Debit (Withdrawal) Request is declined for ${reason} 😌😌`;
            let body = `Hello ${user.username},\n\nYour withdrawal request has been declined due to the following reason: ${reason}.`;
            notification([firebaseId], title, body); // Assuming notification function handles sending the message.
			
            // Send successful response
            res.json({
                status: true,
                message: "Withdrawal request declined successfully.",
                data: rowId,
            });
			
        } catch (error) {
            // If any operation fails, abort the transaction
            await session.abortTransaction();
            session.endSession();
            console.error("Error processing decline:", error);
            res.status(500).json({
                status: false,
                error: error.message || "Internal server error during decline process.",
            });
        }
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({
            status: false,
            error: error.message || "An unexpected error occurred.",
        });
    }
});

module.exports = router;

//in done logo me se 1 tikega 
//1 bhag jayega 
