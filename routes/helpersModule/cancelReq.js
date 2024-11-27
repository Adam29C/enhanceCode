const fundReq = require('../../model/API/FundRequest');
const users = require('../../model/API/Users');
const dateTime = require('node-datetime');
// const gcm = require('node-gcm');
// const sender = new gcm.Sender('AAAAz-Vezi4:APA91bHNVKatfjZiHl13fcF1xzWK5pLOixdZlHE8KVRwIxVHLJdWGF973uErxgjL_HkzzD1K7a8oxgfjXp4StlVk_tNOTYdFkSdWe6vaKw6hVEDdt0Dw-J0rEeHpbozOMXd_Xlt-_dM1');
// const sender = new gcm.Sender(process.env.FIREBASE_SENDER_KEY);
//const messaging = require("../../firebase")
module.exports = async function (data) {
    try {
        if (process.env.pm_id == '0') {
            const dt = dateTime.create();
            const reqDate = dt.format('d/m/Y');
            const userId = await fundReq.find({ reqStatus: "Declined", reqDate: reqDate }, { userId: 1, reqStatus: 1, reqType: 1, reqAmount: 1, username: 1 });

            if (userId) {
                for (index in userId) {
                    let id = userId[index].userId
                    let userFirebase = await users.findOne({ _id: id, mainNotification: true }, { firebaseId: 1 });
                    let token = userFirebase.firebaseId;

                    let body = `Your ${userId[index].reqType} Request Of Rs ${userId[index].reqAmount }/- Is Auto Expired`;
                    let priority = 'high'
                    // const message = {
                    //     notification: {
                    //         title: "Credit/Debit Request Notification",
                    //         body: body,
                    //     },
                    //     data: {
                    //         type: "Wallet"
                    //     },
                    //     android: {
                    //         priority: priority
                    //     },
                    //     apns: {
                    //         payload: {
                    //             aps: {
                    //                 'content-available': 1,
                    //                 'priority': priority === 'high' ? 10 : 5
                    //             }
                    //         }
                    //     },
                    //     token: token

                    // };
                    // try {
                    //     const response = await admin.messaging().send(message);
                    // } catch (error) {
                    //     console.log('Error sending message:', error);
                    // }
                    let message = {
                        android: {
                            priority: 'high',
                        },
                        data: {
                            title: "Credit/Debit Request Notification",
                            body: body,
                            icon: 'ic_launcher',
                            type: 'Wallet',
                        },
                        token: token,
                    };
                    try {
                        const response = await messaging.send(message);
                        console.log('Successfully sent message:', response);
                    } catch (error) {
                        if (error.code === 'messaging/registration-token-not-registered') {
                            console.error('Token is not registered. Removing from database.');
                        } else {
                            console.error('Error sending message:', error);
                        }
                    }
                }
            }
        }
    }
    catch (e) {
        return e;
    }
};

// var message = new gcm.Message({
//     priority: 'high',
//     data: {
//         body : "Credit/Debit Request Notification",
//         icon : "ic_launcher",
//         title: body,
//         type : "Wallet"
//     }
// });
// sender.send(message, { registrationTokens: userToken }, function (err, response) {
//     // if (err) throw err;
//     // else console.log(response);
// });