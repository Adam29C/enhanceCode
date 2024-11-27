//const messaging = require("../../firebase")
// const gcm = require("node-gcm");
// const sender = new gcm.Sender(
// 	"AAAAz-Vezi4:APA91bHNVKatfjZiHl13fcF1xzWK5pLOixdZlHE8KVRwIxVHLJdWGF973uErxgjL_HkzzD1K7a8oxgfjXp4StlVk_tNOTYdFkSdWe6vaKw6hVEDdt0Dw-J0rEeHpbozOMXd_Xlt-_dM1"
// );
// const sender = new gcm.Sender(process.env.FIREBASE_SENDER_KEY);

module.exports = async function (userToken, title, body) {
	let token = userToken[0];
	let notificationTitle = title;
	let notificationBody = body;
	let priority = "high";
	// const message = {
	// 	notification: {
			// title: notificationTitle,
			// body: notificationBody,
	// 	},
	// 	data: {
	// 		type: "otp"
	// 	},
	// 	android: {
	// 		priority: priority
	// 	},
	// 	apns: {
	// 		payload: {
	// 			aps: {
	// 				'content-available': 1,
	// 				'priority': priority === 'high' ? 10 : 5
	// 			}
	// 		}
	// 	},
	// 	token: token

	// };
	// try {
	// 	const response = await admin.messaging().send(message);
	// } catch (error) {
	// 	console.log('5:', error);
	// }
	let message = {
        android: {
            priority: priority,
        },
        data: {
            title: notificationTitle,
			body: notificationBody,
            icon: 'ic_launcher',
            type: 'otp',
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
};

// var message = new gcm.Message({
	// 	priority: "high",
	// 	data: {
	// 		title: notificationTitle,
	// 		icon: "ic_launcher",
	// 		body: notificationBody,
	// 		type: "otp",
	// 	},
	// });

	// // console.log(message);

	// sender.send(message, { registrationTokens: token }, function (err, response) {
	// 	// if (err) throw err;
	// 	// else console.log(response) ;
	// });
