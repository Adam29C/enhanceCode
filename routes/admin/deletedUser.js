const router = require("express").Router();
const timeHistory = require("../../model/timeHistory")
const deletedUser = require("../../model/API/Deleted_User");
const authMiddleware = require("../helpersModule/athetication");
router.post("/", authMiddleware, async function (req, res) {
  try {
    const { start, length, search } = req.body;
    const startIndex = parseInt(start) + 1;
    const { value: searchValue } = search || "";

    const searchFields = ["username", "name", "mobile"];
    const searchQuery = searchValue
      ? {
          $or: searchFields.map((field) => ({
            [field]: { $regex: searchValue, $options: "i" },
          })),
        }
      : {};

    const deletedUsers = await deletedUser
      .find(searchQuery)
      .skip(parseInt(start))
      .limit(parseInt(length))
      .sort({ _id: 1 });

    const totalRecords = await deletedUser.countDocuments(searchQuery);

    const formattedData = deletedUsers.map((user, index) => {
      return {
        sno: startIndex + index,
        name: user.name,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
      };
    });

    if (deletedUsers.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No deleted users found matching the search criteria.",
        recordsFiltered: 0,
        recordsTotal: totalRecords,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Deleted users fetched successfully.",
      data: formattedData,
      recordsFiltered: totalRecords,
      recordsTotal: totalRecords,
    });
  } catch (error) {
    console.log(error, "Error fetching deleted users");
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/getTimeHistory",authMiddleware, async (req, res) => {
  try {
    let timeHistoryList = await timeHistory.find({}, { collectionName: 0 });
    return res.status(200).json({
      status: true,
      message:"Time Histry Data Show Successfully",
      data: timeHistoryList,
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      message: "Internal Server Error",
    });
  }
});

router.post("/timeHistory",authMiddleware, async (req, res) => {
  try {
    const { timeList } = req.body;
    console.log(timeList,"timeList")
    if (timeList.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        status: "Failure",
        message: "data is require in req",
      });
    }
    for (let timeDetails of timeList) {
      await timeHistory.findOneAndUpdate(
        { _id: timeDetails._id },
        {
          isActive: timeDetails.isActive,
          deleteTime: timeDetails.deleteTime,
          name: timeDetails.name,
        }
      );
    }
    return res.status(200).json({
      statusCode: 200,
      status: "Success",
      message: "Update All Data Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      status: "Failure",
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
