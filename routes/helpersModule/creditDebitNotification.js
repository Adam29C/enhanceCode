const messaging = require("../../firebase")
module.exports = async function (userToken, title, body) {
    let token = userToken[0];
    let notificationTitle = title;
    let notificationBody = body;
    let  priority='high'
    let message = {
        android: {
            priority: priority,
        },
        data: {
            title: notificationBody,
            body: notificationTitle,
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
};

// var message = new gcm.Message({
    //         priority: 'high',             
    //         data: {
    //             title: notificationTitle,
    //             icon: "ic_launcher",
    //             body: notificationBody,
    //             type: "Wallet"
    //         }
    //     });

    // // console.log(message);

    // sender.send(message, { registrationTokens: token }, function (err, response) {
    //     // if (err) throw err;
    //     // else console.log(response) ;
    // });