const express =require("express");
const session = require("../../helpersModule/session");
const router =express.Router();
const starlineProvider = require("../../../model/starline/Starline_Provider");

router.get("/getStarlineProvider",  async (req, res) => {
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
    } catch (e) {
      // Error handling
      console.error("Error fetching Starline Providers:", e);
      return res.status(500).json({
        status: false,
        message: "An error occurred while fetching the data.",
        error: e.message
      });
    }
});

router.post("/insertGame",  async (req, res) => {
  // Destructure the data from request body
  const { gamename, result } = req.body;

  // Validation: Check if both 'gamename' and 'result' are provided
  if (!gamename || !result) {
    return res.status(400).json({
      status: false,
      message: "'gamename' and 'result' are required fields."
    });
  }

  // Format current date and time
  const dt = dateTime.create();
  const formatted = dt.format("Y-m-d H:M:S");

  // Create new game object
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
  } catch (e) {
    console.error("Error inserting game:", e);  // Log error for debugging

    // Send error response
    res.status(500).json({
      status: false,
      message: "An error occurred while inserting the game.",
      error: e.message
    });
  }
});

module.exports = router;