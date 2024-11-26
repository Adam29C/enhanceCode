const router = require("express").Router();
const moment = require("moment")
const authMiddleware = require("../../helpersModule/athetication");
const abProvider = require("../../../model/AndarBahar/ABProvider");
const abGame = require("../../../model/AndarBahar/ABGameList");
const abBids = require("../../../model/AndarBahar/ABbids");

router.get("/andarBaharBids", authMiddleware, async (req, res) => {
  try {
    const [providerData, gameData] = await Promise.all([
      abProvider.find().sort({ _id: 1 }),
      abGame.find()
    ]);

    if (!providerData.length && !gameData.length) {
      return res.status(404).json({
        status: false,
        message: "No data found for providers or games.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "AB Total Bids fetched successfully.",
      providers: providerData,
      games: gameData,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching Andar Bahar bids. Please contact support.",
      error: error.message,
    });
  }
});

router.post("/andarBaharBidsData", authMiddleware, async (req, res) => {
  try {
    const { startDate, gameId, page = 1, limit = 10, search } = req.body;

    if (!startDate || !gameId) {
      return res.status(400).json({
        status: false,
        message: "Invalid input: 'startDate' and 'gameId' are required.",
      });
    }

    const date = new Date(startDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        status: false,
        message: "Invalid 'startDate'. Please provide a valid date.",
      });
    }

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    if (isNaN(pageNumber) || pageNumber <= 0 || isNaN(pageSize) || pageSize <= 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid pagination parameters: 'page' and 'limit' must be positive integers.",
      });
    }

    const query = {
      providerId: gameId,
      gameDate: date.toISOString().split("T")[0],
    };

    if (search) {
      query.userName = { $regex: search, $options: "i" };
    }

    const totalRecords = await abBids.countDocuments(query);

    const bidsData = await abBids
      .find(query)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    if (bidsData.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No bids data found for the provided inputs.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Bids data fetched successfully.",
      totalRecords,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalRecords / pageSize),
      data: bidsData,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching bids data. Please contact support.",
      error: error.message,
    });
  }
});

module.exports = router;