const router = require("express").Router();
const fundReq = require("../../model/API/FundRequest");
const UPIlist = require("../../model/API/upiPayments");
const userProfile = require("../../model/API/Profile");
const dateTime = require("node-datetime");
const moment = require("moment");
const session = require("../helpersModule/session");
const permission = require("../helpersModule/permission");
const mongoose = require("mongoose");

router.get("/bank", session, permission, async (req, res) => {
    try {
        const userInfo = req.session.details;
        const permissionArray = req.view;
        const check = permissionArray["bankReq"].showStatus;
        if (check === 1) {
            res.render("approvedReports/bankAccount", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Approved Report"
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard"
            });
        }
    } catch (e) {
        res.json({ message: e });
    }
});

router.get("/paytm", session, permission, async (req, res) => {
    try {
        const dt = dateTime.create();
        let date = dt.format("d/m/Y");
        const report = await fundReq.find({
            reqDate: date,
            reqStatus: "Approved",
            withdrawalMode: "Paytm",
            reqType: "Debit",
            from: 2
        });
        const userInfo = req.session.details;
        const permissionArray = req.view;

        const check = permissionArray["paytmReq"].showStatus;
        if (check === 1) {
            res.render("approvedReports/paytm", {
                data: report,
                total: 0,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Approved Report"
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard"
            });
        }
    } catch (e) {
        res.json({ message: e });
    }
});

router.get("/bankManual", session, permission, async (req, res) => {
    try {
        const dt = dateTime.create();
        let date = dt.format("d/m/Y");
        const reportList = await fundReq.find({
            reqDate: date,
            reqStatus: "Approved",
            reqType: "Debit",
            withdrawalMode: "Bank",
            fromExport: false,
            from: 2
        });
        let finalArray = []
        if (reportList.length > 0) {
            for (report of reportList) {
                let reqTime = moment(report.reqTime);
                finalArray.push({
                    toAccount: report.toAccount,
                    _id: report._id,
                    userId: report.userId,
                    reqAmount: report.reqAmount,
                    fullname: report.fullname,
                    username: report.username,
                    mobile: report.mobile,
                    reqType: report.reqType,
                    reqStatus: report.reqStatus,
                    reqDate: report.reqDate,
                    reqTime: reqTime.format('DD/MM/YYYY hh:mm A'),
                    withdrawalMode: report.withdrawalMode,
                    UpdatedBy: report.UpdatedBy,
                    reqUpdatedAt: report.reqUpdatedAt,
                    timestamp: report.timestamp,
                    createTime: report.createTime,
                    updatedTime: report.updatedTime,
                    adminId: report.adminId,
                    from: report.from,
                    fromExport: report.fromExport
                })
            }
            finalArray.sort((a, b) => {
                return new Date(a.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + a.reqTime.split(' ').slice(1).join(' ')) -
                    new Date(b.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + b.reqTime.split(' ').slice(1).join(' '));
            });
        }
        const userInfo = req.session.details;
        const permissionArray = req.view;
        const check = permissionArray["bankReq"].showStatus;
        if (check === 1) {
            res.render("approvedReports/bankManual", {
                data: finalArray,
                total: 0,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Approved Report"
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard"
            });
        }
    } catch (e) {
        res.json({ message: e });
    }
});

router.get("/creditUPI", session, permission, async (req, res) => {
    try {
        const dt = dateTime.create();
        let date = dt.format("d/m/Y");
        const report = await UPIlist.find({
            reqDate: date,
            $and: [{ $or: [{ reqStatus: "submitted" }, { reqStatus: "pending" }] }]
        });

        const userInfo = req.session.details;
        const permissionArray = req.view;

        const check = permissionArray["paytmReq"].showStatus;
        if (check === 1) {
            res.render("dashboard/approvedCredit", {
                data: report,
                total: 0,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Approved Report"
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard"
            });
        }
    } catch (e) {
        res.json({ message: e });
    }
});

router.get("/creditUPI_ajax", session, permission, async (req, res) => {
    try {
        const date_cust = req.query.date_cust;
        const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");

        const report = await UPIlist.find({
            reqDate: dateFormat,
            $and: [{ $or: [{ reqStatus: "submitted" }, { reqStatus: "pending" }] }]
        });

        res.json({ approvedData: report });
    }
    catch (e) {
        res.json({ message: e });
    }
});

router.get("/paytm_ajax", session, async (req, res) => {
    try {
        const date_cust = req.query.date_cust;
        const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");

        const report = await fundReq.find({
            reqDate: dateFormat,
            reqStatus: "Approved",
            withdrawalMode: "Paytm",
            reqType: "Debit",
            // from : 2
        });
        res.json({ approvedData: report });
    } catch (e) {
        res.json({ message: e });
    }
});

// router.get("/bank_ajax", session, async (req, res) => {
//     try {
//         const date_cust = req.query.date_cust;
//         const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");
//         const userBebitReq = await fundReq.find({
//             reqDate: dateFormat,
//             reqStatus: "Approved",
//             reqType: "Debit",
//             $and: [{ $or: [{ withdrawalMode: "Bank" }, { withdrawalMode: "Paytm" }] }],
//             fromExport: true
//         });

//         let userIdArray = [];
//         let debitArray = {};
//         for (index in userBebitReq) {
//             let reqAmount = userBebitReq[index].reqAmount;
//             let withdrawalMode = userBebitReq[index].withdrawalMode;
//             let reqDate = userBebitReq[index].reqDate;
//             let user = userBebitReq[index].userId;
//             let rowId = userBebitReq[index]._id;
//             let userKi = mongoose.mongo.ObjectId(user);

//             userIdArray.push(userKi);
//             debitArray[userKi] = {
//                 username: userBebitReq[index].username,
//                 rowId: rowId,
//                 userId: userKi,
//                 reqAmount: reqAmount,
//                 withdrawalMode: withdrawalMode,
//                 reqDate: reqDate,
//                 mobile: userBebitReq[index].mobile,
//                 reqTime: userBebitReq[index].reqTime,
//                 reqUpdatedAt: userBebitReq[index].reqUpdatedAt
//             };
//         }

//         let user_Profile = await userProfile.find({ userId: { $in: userIdArray } });

//         for (index in user_Profile) {
//             let id = user_Profile[index].userId;
//             if (debitArray[id]) {
//                 debitArray[id].address = user_Profile[index].address;
//                 debitArray[id].city = user_Profile[index].city;
//                 debitArray[id].pincode = user_Profile[index].pincode;
//                 debitArray[id].name = user_Profile[index].account_holder_name;
//                 debitArray[id].account_no = user_Profile[index].account_no;
//                 debitArray[id].bank_name = user_Profile[index].bank_name;
//                 debitArray[id].ifsc = user_Profile[index].ifsc_code;
//                 debitArray[id].paytm_number = user_Profile[index].paytm_number;
//             }
//         }

//         res.json({ approvedData: debitArray });
//     } catch (e) {
//         res.json({ message: e });
//     }
// });

// router.get("/bankManual_ajax", session, permission, async (req, res) => {
//     try {
//         const date_cust = req.query.date_cust;
//         const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");
//         const report = await fundReq.find({
//             reqDate: dateFormat,
//             reqStatus: "Approved",
//             reqType: "Debit",
//             withdrawalMode: "Bank",
//             fromExport: false,
//             from: 2
//         });
//         res.json({ approvedData: report });
//     } catch (e) {
//         res.json({ message: e });
//     }
// });

//Declined Reports Route

router.get("/bank_ajax", session, async (req, res) => {
    try {
        const date_cust = req.query.date_cust;
        const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");
        const userBebitReq = await fundReq.find({
            reqDate: dateFormat,
            reqStatus: "Approved",
            reqType: "Debit",
            $and: [{ $or: [{ withdrawalMode: "Bank" }, { withdrawalMode: "Paytm" }] }],
            //fromExport: true
        });

        let userIdArray = [];
        let debitArray = {};
        let finalObject = {};
        for (index in userBebitReq) {
            let reqAmount = userBebitReq[index].reqAmount;
            let withdrawalMode = userBebitReq[index].withdrawalMode;
            let reqDate = userBebitReq[index].reqDate;
            let user = userBebitReq[index].userId;
            let rowId = userBebitReq[index]._id;
            let userKi = mongoose.mongo.ObjectId(user);
            let reqTime = moment(userBebitReq[index].reqTime)
            userIdArray.push(userKi);
            debitArray[userKi] = {
                username: userBebitReq[index].username,
                rowId: rowId,
                userId: userKi,
                reqAmount: reqAmount,
                withdrawalMode: withdrawalMode,
                reqDate: reqDate,
                mobile: userBebitReq[index].mobile,
                reqTime: reqTime.format('DD/MM/YYYY hh:mm A'),
                reqUpdatedAt: userBebitReq[index].reqUpdatedAt
            };
        }
        let arr = Object.entries(debitArray).map(([key, value]) => ({ key, ...value }));
        arr.sort((a, b) => {
            return new Date(a.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + a.reqTime.split(' ').slice(1).join(' ')) -
                new Date(b.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + b.reqTime.split(' ').slice(1).join(' '));
        });
        finalObject = Object.fromEntries(arr.map(item => [item.key, item]));
        let user_Profile = await userProfile.find({ userId: { $in: userIdArray } });

        for (index in user_Profile) {
            let id = user_Profile[index].userId;
            if (finalObject[id]) {
                finalObject[id].address = user_Profile[index].address;
                finalObject[id].city = user_Profile[index].city;
                finalObject[id].pincode = user_Profile[index].pincode;
                finalObject[id].name = user_Profile[index].account_holder_name;
                finalObject[id].account_no = user_Profile[index].account_no;
                finalObject[id].bank_name = user_Profile[index].bank_name;
                finalObject[id].ifsc = user_Profile[index].ifsc_code;
                finalObject[id].paytm_number = user_Profile[index].paytm_number;
            }
        }
        return res.json({ approvedData: finalObject });
    } catch (e) {
        res.json({ message: e });
    }
});

router.get("/bankManual_ajax", session, permission, async (req, res) => {
    try {
        const date_cust = req.query.date_cust;
        const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");
        const reportList = await fundReq.find({
            reqDate: dateFormat,
            reqStatus: "Approved",
            reqType: "Debit",
            withdrawalMode: "Bank",
            fromExport: false,
            from: 2
        });
        let finalArray = []
        for (report of reportList) {
            let reqTime = moment(report.reqTime);
            finalArray.push({
                toAccount: report.toAccount,
                _id: report._id,
                userId: report.userId,
                reqAmount: report.reqAmount,
                fullname: report.fullname,
                username: report.username,
                mobile: report.mobile,
                reqType: report.reqType,
                reqStatus: report.reqStatus,
                reqDate: report.reqDate,
                reqTime: reqTime.format('DD/MM/YYYY hh:mm A'),
                withdrawalMode: report.withdrawalMode,
                UpdatedBy: report.UpdatedBy,
                reqUpdatedAt: report.reqUpdatedAt,
                timestamp: report.timestamp,
                createTime: report.createTime,
                updatedTime: report.updatedTime,
                adminId: report.adminId,
                from: report.from,
                fromExport: report.fromExport
            })
        }
        finalArray.sort((a, b) => {
            return new Date(a.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + a.reqTime.split(' ').slice(1).join(' ')) -
                new Date(b.reqTime.split(' ')[0].split('/').reverse().join('-') + ' ' + b.reqTime.split(' ').slice(1).join(' '));
        });
        return res.json({ approvedData: finalArray });
    } catch (e) {
        res.json({ message: e });
    }
});

router.get("/declined", session, permission, async (req, res) => {
    try {
        const dt = dateTime.create();
        let date = dt.format("d/m/Y");
        const report = await fundReq.find({
            reqDate: date,
            reqType: "Debit",
            reqStatus: "Declined"
        });
        const userInfo = req.session.details;
        const permissionArray = req.view;
        const check = permissionArray["decDebit"].showStatus;
        if (check === 1) {
            res.render("dashboard/declinedReports", {
                data: report,
                userInfo: userInfo,
                permission: permissionArray,
                title: "Declined Report"
            });
        } else {
            res.render("./dashboard/starterPage", {
                userInfo: userInfo,
                permission: permissionArray,
                title: "Dashboard"
            });
        }
    } catch (err) {
        console.log(err);
    }
});

router.get("/declined_ajax", session, async (req, res) => {
    try {
        const date_cust = req.query.date_cust;
        const dateFormat = moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY");

        const report = await fundReq.find({
            reqStatus: "Declined",
            reqType: "Debit",
            reqDate: dateFormat
        });
        res.json({ approvedData: report });
    } catch (e) {
        res.json({ message: e });
    }
});

router.post("/updateUpi", session, async (req, res) => {
    try {
        const rowId = req.query.rowId;
        const dt = dateTime.create();
        let date = dt.format("d/m/Y I:M:S");

        const udpate = await UPIlist.updateOne({ _id: rowId }, {
            $set: {
                updateAt: date,
                reqStatus: "Approved"
            }
        })

        res.json({
            status: 1,
            message: "Req Updated Successfully",
            id: rowId
        });

    } catch (e) {
        res.json({
            status: 0,
            message: "Something Bad Happened, Contact Support"
        });
    }
});

module.exports = router;