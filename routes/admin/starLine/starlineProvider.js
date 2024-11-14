const express =require("express");
const session = require("../../helpersModule/session");
const router =express.Router();
const starlineProvider = require("../../../model/starline/Starline_Provider");
const moment = require('moment');

router.get("/getStarlineProvider",session,async (req, res) => {
    try {
      // Fetch the starline provider data
      const provider = await starlineProvider.find().sort({ _id: 1 });
  
      // User info from session
      const userInfo = req.session.details;
  
      // Respond with the appropriate data
      return res.json({
        status: true,
        message: "Starline Provider data fetched successfully.",
        data: provider,
        userInfo: userInfo
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "An error occurred while fetching the data.",
        error: e.message
      });
    }
});

router.get("/starLineProviderById", async (req, res) => {
  try {
    const { gameId } = req.query;

    if (!gameId) {
      return res.status(400).json({
        status: false,
        message: "'gameId' query parameter is required."
      });
    }

    // Fetch game from the database based on 'gameId'
    const game = await starlineProvider.findOne({ _id: gameId });

    // If no game is found, return a 404 error
    if (!game) {
      return res.status(404).json({
        status: false,
        message: "Game not found with the provided 'gameId'."
      });
    }

    // If game is found, return the game data
    res.status(200).json({
      status: true,
      message: "Game data fetched successfully.",
      game: game
    });

  } catch (e) {
    // Return a server error response
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching the game data.",
      error: e.message
    });
  }
});

router.post("/insertStarLineProvider",async (req, res) => {
  // Destructure the data from the request body
  const { gamename, result } = req.body;

  // Validation: Check if both 'gamename' and 'result' are provided
  if (!gamename || !result) {
    return res.status(400).json({
      status: false,
      message: "'gamename' and 'result' are required fields."
    });
  }

  // Use moment.js to format the current date and time
  const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

  // Create a new game object
  const game = new starlineProvider({
    providerName: gamename,
    providerResult: result,
    modifiedAt: formatted
  });

  try {
    // Save the game to the database
    const savedGame = await game.save();

    // Send success response
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

router.patch("/updateStarLineProvider",  async (req, res) => {
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

router.delete("/deleteStarLineProvider", async (req, res) => {
  try {
    const { gameId } = req.query;

    if (!gameId) {
      return res.status(400).json({
        status: false,
        message: "gameId is required to delete a game."
      });
    }

    // Try deleting the game from the database
    const deletedGame = await starlineProvider.deleteOne({ _id: gameId });

    // If no document is deleted, it means the provided userId was not found
    if (deletedGame.deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Game not found with the provided gameId."
      });
    }

    // Respond with success message
    res.status(200).json({
      status: true,
      message: "Game deleted successfully."
    });

  } catch (e) {
    // Send error response if there's an issue with the database or server
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the game.",
      error: e.message
    });
  }
});

module.exports = router;