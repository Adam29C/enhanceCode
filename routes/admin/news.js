const router = require("express").Router();
const newsInfo = require("../../model/News"); // Assuming you meant newsInfo here
const authMiddleware = require("../helpersModule/athetication");
const dateTime = require("node-datetime");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const newsData = await newsInfo.find({}, { Description: 1 });

    if (newsData.length === 0) {
      return res.json({
        status: false,
        message: "No news found",
      });
    }

    return res.json({
      status: true,
      message: "News fetched successfully",
      data: newsData,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "Something went wrong, please contact support",
      error: error.message,
    });
  }
});

router.post("/",authMiddleware, async (req, res) => {
  try {
    const { id, note } = req.body; 

    if (!id || !note) {
      return res.status(400).json({
        status: false,
        message: "ID and note are required.",
      });
    }

    const dt = dateTime.create();
    const formatted = dt.format("Y-m-d H:M:S");

    const existingNews = await newsInfo.findOne({ _id: id });

    if (!existingNews) {
      return res.status(404).json({
        status: false,
        message: "News not found",
      });
    }

    await newsInfo.updateOne(
      { _id: id },
      { $set: { Description: note, modified: formatted } }
    );

    const updatedNews = await newsInfo.find({ _id: id });

    return res.status(200).json({
      status: true,
      message: "News updated successfully",
      data: updatedNews,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: "Something went wrong, please contact support",
      error: error.message,
    });
  }
});

module.exports = router;
