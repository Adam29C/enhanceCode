const router = require("express").Router();
const Rules = require("../../../model/appSetting/HowToPlay");
const authMiddleware = require("../../helpersModule/athetication");
router.get("/htp", authMiddleware, async (req, res) => {
  try {
    const data = await Rules.find({});

    let finalData = data.length > 0 ? data[0]?.howtoplay : [];

    res.json({
      status: 1,
      message: "Success",
      data: data,
    });
  } catch (e) {
    res.status(400).send({
      status: 0,
      message: "Something Happened Please Contact the Support",
      error: e,
    });
  }
});

router.post("/updateHtp", authMiddleware, async (req, res) => {
  try {
    const { htpId, howtoplay } = req.body;

    if (!htpId || !howtoplay || howtoplay.length === 0) {
      return res.status(400).json({
        status: false,
        message: "htpId and howtoplay data are required",
      });
    }

    const htpInfo = await Rules.findById(htpId);
    if (!htpInfo) {
      return res.status(404).json({
        status: false,
        message: "HowToPlay document not found",
      });
    }

    for (let item of howtoplay) {
      const { _id, title, description, videoUrl } = item;

      if (!title || !description || !videoUrl) {
        return res.status(400).json({
          status: false,
          message:
            "Title, description, and videoUrl are required for each howtoplay item.",
        });
      }

      if (_id) {
        const existingItem = htpInfo.howtoplay.id(_id);
        if (existingItem) {
          existingItem.title = title || existingItem.title;
          existingItem.description = description || existingItem.description;
          existingItem.videoUrl = videoUrl || existingItem.videoUrl;
          existingItem.modified = new Date();
        } else {
          return res.status(404).json({
            status: false,
            message: "HowToPlay item not found with provided ID",
          });
        }
      } else {
        htpInfo.howtoplay.push({
          title,
          description,
          videoUrl,
          modified: new Date(),
        });
      }
    }

    await htpInfo.save();

    return res.status(200).json({
      status: true,
      message: "HowToPlay data updated successfully",
      data: htpInfo.howtoplay,
    });
  } catch (err) {
    console.log(err, "err");
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating HowToPlay data",
      error: err.message,
    });
  }
});

module.exports = router;
