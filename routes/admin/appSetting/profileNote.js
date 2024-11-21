const router = require("express").Router();
const ProfileNote = require("../../../model/appSetting/ProfileNote");

router.get("/", async (req, res) => {
  try {
    const find = await ProfileNote.find();
    if (!find || find.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No profile notes found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Profile notes fetched successfully",
      data: find,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: e.message,
    });
  }
});

  
router.post("/updateProfileNote", async (req, res) => {
  try {
    const { id, note } = req.body;

    if (!id || !note) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: id or note",
      });
    }

    const result = await ProfileNote.updateOne(
      { _id: id },
      { $set: { note } }
    );

    if (result.nModified === 0) {
      return res.status(404).json({
        status: false,
        message: "Profile note not found or no changes made",
      });
    }
    const updatedNote = await ProfileNote.findOne({ _id: id });

    return res.status(200).json({
      status: true,
      message: "Profile note updated successfully",
      data: updatedNote,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: e.message,
    });
  }
});

module.exports = router