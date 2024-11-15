const router = require("express").Router();
const ABProvider = require("../../model/AndarBahar/ABProvider");
const moment = require("moment");
 

router.get("/", async (req, res) => {
  try {
    const provider = await ABProvider.find().sort({ _id: 1 });
    res.json({
      status: true,
      message: "Providers fetched successfully",
      data: provider,
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Error fetching providers",
      error: e.message,
    });
  }
});

router.get("/specificUser", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.json({
        status: false,
        message: "User ID is required",
      });
    }

    const user = await ABProvider.findOne({ _id: userId });
    if (!user) {
      return res.json({
        status: false,
        message: "User not found",
      });
    }

    res.json({
      status: true,
      message: "User data fetched successfully",
      data: user,
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Error fetching user data",
      error: e.message,
    });
  }
});

router.post("/insertGame", async (req, res) => {
  try {
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");  // Use moment for date formatting

    const newGame = new ABProvider({
      providerName: req.body.gamename,
      providerResult: req.body.result,
      modifiedAt: formatted,
    });

    await newGame.save();

    res.json({
      status: true,
      message: "Game inserted successfully",
    });
  } catch (e) {
    res.status(400).json({
      status: false,
      message: "Error inserting game",
      error: e.message,
    });
  }
});

router.delete("/", async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.json({
        status: false,
        message: "User ID is required",
      });
    }

    const savedGames = await ABProvider.deleteOne({ _id: userId });

    if (savedGames.deletedCount === 0) {
      return res.json({
        status: false,
        message: "No game found with the given ID",
      });
    }

    res.json({
      status: true,
      message: "Game deleted successfully",
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Error deleting game",
      error: e.message,
    });
  }
});

router.patch("/", async (req, res) => {
  try {
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");  // Use moment for date formatting

    const updatedGame = await ABProvider.updateOne(
      { _id: req.body.userId },
      {
        $set: {
          providerName: req.body.gamename,
          providerResult: req.body.result,
          modifiedAt: formatted,
        },
      }
    );

    if (updatedGame.modifiedCount === 0) {
      return res.json({
        status: false,
        message: "No game found to update",
      });
    }

    res.json({
      status: true,
      message: "Game updated successfully",
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Error updating game",
      error: e.message,
    });
  }
});
module.exports = router;
