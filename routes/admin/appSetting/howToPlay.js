const router = require("express").Router();
const Rules = require("../../../model/appSetting/HowToPlay");
const authMiddleware = require("../../helpersModule/athetication");
router.get("/htp", authMiddleware, async (req, res) => {
  try {
    const data = await Rules.find({});

    let finalData = data.length > 0 ? data[0]?.howtoplay : [];

    res.json({
      status: true,
      message: "Success",
      data: data,
    });
  } catch (e) {
    res.status(400).send({
      status: false,
      message: "Something Happened Please Contact the Support",
      error: e,
    });
  }
});

router.post("/updateHtp", authMiddleware, async (req, res) => {
  try {
    const { howtoplay } = req.body;
    const htpInfo = await Rules.updateOne({}, { $set: { howtoplay } });
    return res
      .status(200)
      .json({
        status: true,
        message: "How To Play Update Successfully",
        htpInfo: htpInfo,
      });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating HowToPlay data",
      error: err.message,
    });
  }
});

module.exports = router;
