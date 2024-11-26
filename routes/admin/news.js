const router = require("express").Router();
const newsInfo = require("../../model/News");
const authMiddleware = require("../helpersModule/athetication");
router.get("/",authMiddleware, async (req, res) => {
  try {
    const newsData = await newsInfo.find({}, { Description: 1 });

    if (newsData.length === 0) {
      return res.json({
        status: false,
        message: "No news found",
      });
    }

    res.json({
      status: true,
      message: "News fetched successfully",
      data: newsData,
    });
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, please contact support",
      error: error.message,
    });
  }
});

module.exports = router;
