const router = require("express").Router();
const stargameList = require("../../../model/starline/GameList");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/",authMiddleware, async (req, res) => {
  try {
    // Fetching the provider data from the database
    const provider = await stargameList.find().sort({ _id: 1 });
    
    // Fetching user information from session
    const userInfo = req.session.details;

    // Respond with the data in JSON format
    res.status(200).json({
      status: true,
      message: "Game rates fetched successfully.",
      data: provider,
      userInfo: userInfo,
    });
  } catch (err) {
    // Handle any error that occurs during the database query or other operations
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching game rates.",
      error: err.message,
    });
  }
});

router.post("/insertGame", authMiddleware, async (req, res) => {
  const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
  const { gameName, gamePrice } = req.body;

  const games = new stargameList({
    gameName,
    gamePrice,
    modifiedAt: formatted,
  });

  try {
    await games.save();
    const provider = await stargameList.find();
    res.status(201).json({
      status: true,
      message: "Game added successfully.",
      data: provider,
    });
  } catch (err) {
    res.status(400).json({
      status: false,
      message: "Failed to insert game.",
      error: err.message,
    });
  }
});

router.delete("/", authMiddleware, async (req, res) => {
  const { gameRateId } = req.body;

  try {
    const savedGames = await stargameList.deleteOne({ _id: gameRateId });

    if (savedGames.deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "No game found with the provided ID.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Game deleted successfully.",
      data: savedGames,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the game.",
      error: err.message,
    });
  }
});

router.put("/update", authMiddleware, async (req, res) => {
  const { gameRateId, gameName, gamePrice } = req.body;
  const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

  try {
    const updateUser = await stargameList.updateOne(
      { _id: gameRateId },
      {
        $set: {
          gameName,
          gamePrice,
          modifiedAt: formatted,
        },
      }
    );

    if (updateUser.modifiedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "No game found with the provided ID to update.",
      });
    }

    const provider = await stargameList.find();
    res.status(200).json({
      status: true,
      message: "Game updated successfully.",
      data: provider,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "An error occurred while updating the game.",
      error: err.message,
    });
  }
});

module.exports = router;

