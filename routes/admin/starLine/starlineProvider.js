const express = require("express");
const authMiddleware = require("../../helpersModule/athetication")
const router = express.Router();
const starlineProvider = require("../../../model/starline/Starline_Provider");
const moment = require('moment');

router.get("/getStarlineProvider", authMiddleware, async (req, res) => {
  try {
    const provider = await starlineProvider.find().sort({ _id: 1 });
    return res.json({
      status: true,
      message: "Starline Provider data fetched successfully.",
      data: provider,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching the data.",
      error: e.message
    });
  }
});

router.get("/starLineProviderById", authMiddleware,async (req, res) => {
  try {
    const { gameId } = req.query;
    if (!gameId) {
      return res.status(400).json({
        status: false,
        message: "'gameId' query parameter is required."
      });
    }
    const game = await starlineProvider.findOne({ _id: gameId });

    if (!game) {
      return res.status(404).json({
        status: false,
        message: "Game not found with the provided 'gameId'."
      });
    }

    res.status(200).json({
      status: true,
      message: "Game data fetched successfully.",
      game: game
    });

  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching the game data.",
      error: e.message
    });
  }
});

router.post("/insertStarLineProvider", authMiddleware,async (req, res) => {
  const { gamename, result } = req.body;

  if (!gamename || !result) {
    return res.status(400).json({
      status: false,
      message: "'gamename' and 'result' are required fields."
    });
  }
  const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

  const game = new starlineProvider({
    providerName: gamename,
    providerResult: result,
    modifiedAt: formatted
  });

  try {
    const savedGame = await game.save();

    res.status(201).json({
      status: true,
      message: "Game inserted successfully.",
      game: savedGame
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "An error occurred while inserting the game.",
    });
  }
});

router.patch("/updateStarLineProvider", authMiddleware,async (req, res) => {
  try {
    const { gameId, gamename, result } = req.body;
    if (!gameId) {
      return res.status(400).json({
        status: false,
        message: "'gameId' is required."
      });
    }
    const updateFields = {};
    if (gamename) {
      updateFields.providerName = gamename;
    }
    if (result) {
      updateFields.providerResult = result;
    }

    if (!gamename && !result) {
      return res.status(400).json({
        status: false,
        message: "'gamename' or 'result' is required to update."
      });
    }
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    updateFields.modifiedAt = formatted;

    const updatedGame = await starlineProvider.updateOne(
      { _id: gameId },
      { $set: updateFields }
    );
    if (updatedGame.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Game not found with the provided gameId."
      });
    }

    res.status(200).json({
      status: true,
      message: "Game updated successfully."
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: "An error occurred while updating the game.",
      error: err.message
    });
  }
});

router.delete("/deleteStarLineProvider", authMiddleware,async (req, res) => {
  try {
    const { gameId } = req.query;
    if (!gameId) {
      return res.status(400).json({
        status: false,
        message: "gameId is required to delete a game."
      });
    }

    const deletedGame = await starlineProvider.deleteOne({ _id: gameId });

    if (deletedGame.deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Game not found with the provided gameId."
      });
    }
    res.status(200).json({
      status: true,
      message: "Game deleted successfully."
    });

  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the game.",
      error: e.message
    });
  }
});

module.exports = router;