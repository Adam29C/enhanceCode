const router = require("express").Router();
const ABProvider = require("../../../model/AndarBahar/ABProvider");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/",authMiddleware, async (req, res) => {
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

router.get("/abProviderById",authMiddleware, async (req, res) => {
  try {
    const abProviderId = req.query.abProviderId;
    if (!abProviderId) {
      return res.json({
        status: false,
        message: "abProviderId is required",
      });
    }

    const data = await ABProvider.findOne({ _id: abProviderId });
    if (!data) {
      return res.json({
        status: false,
        message: "data not found whith this provider id",
      });
    }

    res.json({
      status: true,
      message: "Data fetched successfully",
      data: data,
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Error fetching user data",
      error: e.message,
    });
  }
});

router.post("/insertGame",authMiddleware, async (req, res) => {
  try {
    const { gamename, result } = req.body;
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

    const newGame = new ABProvider({
      providerName: gamename,
      providerResult: result,
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

router.delete("/",authMiddleware, async (req, res) => {
  try {
    const providerId = req.body.providerId;
    if (!providerId) {
      return res.json({
        status: false,
        message: "provider Id is required",
      });
    }

    const savedGames = await ABProvider.deleteOne({ _id: providerId });

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

router.patch("/",authMiddleware, async (req, res) => {
    try {
      const { userId, gamename, result } = req.body;
      const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
  
      const updatedGame = await ABProvider.updateOne(
        { _id: userId },
        {
          $set: {
            providerName: gamename,
            providerResult: result,
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
