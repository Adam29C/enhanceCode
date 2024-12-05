const express = require("express");
const router = express.Router();
const provider = require("../../model/games/Games_Provider");
const gameBids = require("../../model/games/gameBids");
const mongoose = require("mongoose");
const digits = require("../../model/digits");
const authMiddleware = require("../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const providers = await provider.find().sort({ _id: 1 });
    res.status(200).json({
      status: true,
      message: "Providers fetched successfully",
      data: providers,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch providers",
      error: error.message,
    });
  }
});

router.post("/getCutting", authMiddleware, async (req, res) => {
  try {
    const { gameDate, gameSession, providerId } = req.body;

    if (!gameDate || !gameSession || !providerId) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: gameDate, gameSession, providerId",
      });
    }
    let bidDigit = [
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
      "47",
      "48",
      "49",
      "50",
      "51",
      "52",
      "53",
      "54",
      "55",
      "56",
      "57",
      "58",
      "59",
      "60",
      "61",
      "62",
      "63",
      "64",
      "65",
      "66",
      "67",
      "68",
      "69",
      "70",
      "71",
      "72",
      "73",
      "74",
      "75",
      "76",
      "77",
      "78",
      "79",
      "80",
      "81",
      "82",
      "83",
      "84",
      "85",
      "86",
      "87",
      "88",
      "89",
      "90",
      "91",
      "92",
      "93",
      "94",
      "95",
      "96",
      "97",
      "98",
      "99",
    ];
    let QUERY = {};
    if (gameSession === "Jodi Digit") {
      QUERY = {
        providerId: mongoose.Types.ObjectId(providerId),
        bidDigit: { $in: bidDigit },
        gameSession: "Close",
        gameDate,
      };
    } else {
      QUERY = {
        gameTypeName: gameSession,
        providerId: mongoose.Types.ObjectId(providerId),
        gameSession: "Close",
        gameDate,
      };
    }

    const data1 = await gameBids.aggregate([
      { $match: QUERY },
      {
        $group: {
          _id: "$gameTypeId",
          sumdigit: { $sum: "$biddingPoints" },
          countBid: { $sum: 1 },
          gameType: { $first: "$gameSession" },
          gameTypeName: { $first: "$gameTypeName" },
        },
      },
    ]);

    if (data1.length === 0) {
      return res.status(200).json({
        status: false,
        message: "No data found for the provided criteria",
      });
    }

    let data2 = [];
    if (gameSession === "Jodi Digit") {
      data1[0].gameTypeName = "Jodi Digit";
      data2 = await gameBids.aggregate([
        {
          $match: {
            providerId: mongoose.Types.ObjectId(providerId),
            bidDigit: { $in: bidDigit },
            gameSession: "Close",
            gameDate,
          },
        },
        {
          $group: {
            _id: "$bidDigit",
            sumdigit: { $sum: "$biddingPoints" },
            countBid: { $sum: 1 },
            date: { $first: "$gameDate" },
            gamePrice: { $first: "$gameTypePrice" },
          },
        },
      ]);
    } else {
      data2 = await gameBids.aggregate([
        {
          $match: {
            gameDate,
            providerId: mongoose.Types.ObjectId(providerId),
            gameTypeName: gameSession,
          },
        },
        {
          $group: {
            _id: "$bidDigit",
            sumdigit: { $sum: "$biddingPoints" },
            countBid: { $sum: 1 },
            date: { $first: "$gameDate" },
            gamePrice: { $first: "$gameTypePrice" },
          },
        },
      ]);
    }

    return res.status(200).json({
      satus: true,
      message: "Data retrieved successfully",
      data: { data1, data2, providerId },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while processing the request",
      error: error.message,
    });
  }
});

router.post("/getOC", authMiddleware, async (req, res) => {
  try {
    const { gameDate, gameSession, providerId } = req.body;
    if (!gameDate || !gameSession || !providerId) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: gameDate, gameSession, providerId",
      });
    }
    const data1 = await gameBids.aggregate([
      {
        $match: {
          gameDate,
          providerId: mongoose.Types.ObjectId(providerId),
          gameSession,
        },
      },
      {
        $group: {
          _id: "$gameTypeId",
          sumdigit: { $sum: "$biddingPoints" },
          countBid: { $sum: 1 },
          gameType: { $first: "$gameSession" },
          gameTypeName: { $first: "$gameTypeName" },
          bidDigit: { $first: "$bidDigit" },
        },
      },
    ]);
    if (data1.length > 0) {
      const data2 = await gameBids.aggregate([
        {
          $match: {
            gameDate,
            providerId: mongoose.Types.ObjectId(providerId),
            gameSession,
          },
        },
        {
          $group: {
            _id: "$bidDigit",
            sumdigit: { $sum: "$biddingPoints" },
            countBid: { $sum: 1 },
            date: { $first: "$gameDate" },
            gamePrice: { $first: "$gameTypePrice" },
            gameSession: { $first: "$gameSession" },
          },
        },
      ]);

      const pana = await digits.find();
      return res.status(200).json({
        status: true,
        message: "Data retrieved successfully",
        data: { data1, data2, pana },
      });
    }
    return res.status(200).json({
      status: false,
      message: "No data found for the provided criteria",
      data: [],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while processing the request",
      error: error.message,
    });
  }
});

router.post("/getBidData", authMiddleware, async (req, res) => {
  try {
    const { date, bidDigit, id: gameId, gameSession } = req.body;

    if (!date || !bidDigit || !gameId || !gameSession) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const bidData = await gameBids.find({
      gameDate: date,
      providerId: gameId,
      bidDigit: bidDigit,
      gameSession: gameSession,
    });

    if (bidData.length === 0) {
      console.log("No bid data found for the provided parameters.");
      return res.status(404).json({ message: "No bid data found." });
    }

    console.log("Bid data found:", bidData);

    res.status(200).json(bidData);
  } catch (e) {
    console.error("Error occurred while fetching bid data:", e);

    res.status(500).json({
      error:
        "An error occurred while fetching the bid data. Please try again later.",
    });
  }
});

module.exports = router;
