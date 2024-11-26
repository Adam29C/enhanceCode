const express = require("express");
const router = express.Router();
const ABgameList = require("../../../model/AndarBahar/ABGameList");
const moment = require("moment");
const authMiddleware=require("../../helpersModule/athetication")

router.get("/", authMiddleware,async (req, res) => {
  try {
    const provider = await ABgameList.find().sort({ _id: 1 });
    res.status(200).json({
      status: true,
      message: "Games fetched successfully.",
      data: provider,
    });
  } catch (e) {

    res.status(500).json({
      status: false,
      message: "Error fetching games.",
      error: e.message,
    });
  }
});

router.post("/insertGame", authMiddleware, async (req, res) => {
  try {
    const { gameName, gamePrice } = req.body;

    if (!gameName || !gamePrice) {
      return res.status(400).json({
        statusCode: 400,
        status: false,
        message: "Missing required fields: gameName, gamePrice",
      });
    }

    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

    const games = new ABgameList({
      gameName,
      gamePrice,
      modifiedAt: formatted,
    });

    await games.save();

    const provider = await ABgameList.find();

    res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Game inserted successfully",
      data: provider,
    });
  } catch (e) {
    res.status(400).json({
      statusCode: 400,
      status: false,
      message: "Error while inserting the game",
      error: e.message,
    });
  }
});

router.delete("/", authMiddleware, async (req, res) => {
  try {
    const { gameRateId } = req.query;
    if (!gameRateId) {
      return res.status(400).json({
        statusCode: 400,
        status: false,
        message: "Missing required query parameter: userId",
      });
    }

    const result = await ABgameList.deleteOne({ _id: gameRateId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        message: "No game found with the provided gameRateId",
      });
    }

    return res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Game Rate deleted successfully",
      data: result,
    });
  } catch (e) {
    return res.status(500).json({
      statusCode: 500,
      status: false,
      message: "Something went wrong while deleting the Game Rate.",
      error: e.message,
    });
  }
});

router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { gameRateId, gameName, gamePrice } = req.body;

    if (!gameRateId || !gameName || !gamePrice) {
      return res.status(400).json({
        statusCode: 400,
        status: false,
        message: "Missing required fields: gameRateId, gameName, gamePrice",
      });
    }

    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

    await ABgameList.updateOne(
      { _id: gameRateId },
      {
        $set: {
          gameName,
          gamePrice,
          modifiedAt: formatted,
        },
      }
    );

    const provider = await ABgameList.find();

    res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Game Rate updated successfully",
      data: provider,
    });
  } catch (e) {
    res.status(400).json({
      statusCode: 400,
      status: false,
      message: "Error while updating the game",
      error: e.message,
    });
  }
});

module.exports = router;
