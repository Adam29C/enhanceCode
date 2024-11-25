const router = require("express").Router();
const notification = require("../../model/notification");
const sendnotification = require("../helpersModule/sendNotification");
const moment = require('moment');

router.get("/", async (req, res) => {
  try {
    const notificationsData = await notification
      .find({})
      .sort({ _id: -1 })
      .limit(100);
    return res.json({
      status: true,
      message: "Notifications Fatch Successfully!!!",
      data: notificationsData,
    });
  } catch (e) {
    return res.json({
      status: false,
      message: "Internal Server Error",
      error: e.toString(),
    });
  }
});

router.post("/inserNotification", async (req, res) => {
  try {
    const formattedDate = moment().format("D/MM/YYYY h:mm a");

    const notificationData = new notification({
      title: req.body.title,
      message: req.body.message,
      modified: formattedDate,
    });

    await notificationData.save();
    
    const recentNotifications = await notification.find().sort({ _id: -1 }).limit(200);

    let token = [];
    sendnotification(req, res, "sumDgit", token);

    return res.json({
      status: true,
      message: "Notification inserted successfully.",
      data: recentNotifications
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "An error occurred while inserting the notification.",
      error: error.message
    });
  }
});

router.delete("/notification/:id", async (req, res) => {
    try {
        const notificationId = req.params.id;

        if (!notificationId) {
            return res.status(400).json({
                status: false,
                message: "Notification ID Is Required."
            });
        }

        const deletedNotification = await notification.findByIdAndDelete(notificationId);

        if (!deletedNotification) {
            return res.status(404).json({
                status: false,
                message: "Notification not found."
            });
        }

        const updatedNotifications = await notification.find().sort({ _id: -1 });

        return res.status(200).json({
            status: true,
            message: "Notification deleted successfully.",
            data: updatedNotifications
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while deleting the notification. Please try again later.",
            error: error.message
        });
    }
});


module.exports = router;
