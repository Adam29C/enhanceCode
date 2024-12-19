const router = require("express").Router();
const mongodb = require("mongodb");
const { ObjectId } = require("mongodb");
const ABList = require("../../../model/AndarBahar/ABProvider");
const ABtype = require("../../../model/AndarBahar/ABGameList");
const ABbids = require("../../../model/AndarBahar/ABbids");
const authMiddleware = require("../../helpersModule/athetication");
router.get("/", authMiddleware, async (req, res) => {
  try {
    const provider = await ABList.find({}, { providerName: 1, _id: 1 }).sort({
      _id: 1,
    });

    if (!provider || provider.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        message: "No providers found",
      });
    }

    res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Providers fetched successfully",
      data: provider,
    });
  } catch (e) {
    res.status(500).json({
      statusCode: 500,
      status: false,
      message: "Error fetching providers",
      error: e.message,
    });
  }
});

router.post("/getResult", authMiddleware, async (req, res) => {
  try {
    const { provider, date } = req.body;

    // Check if provider is missing
    if (!provider) {
      return res.status(400).json({
        statusCode: 400,
        status: false,
        message: "Missing required field: provider",
      });
    }

    // Fetch the game types
    const type = await ABtype.find(
      {},
      { gamePrice: 1, _id: 1, gameName: 1 }
    ).sort({ _id: 1 });

    // Aggregation query for data1 - Filter by provider and date
    const data1 = await ABbids.aggregate([
      { $match: { providerId: new ObjectId(provider), gameDate: date } }, // Added date condition
      {
        $group: {
          _id: "$gameTypeId",
          sumdigit: { $sum: "$biddingPoints" },
          countBid: { $sum: 1 },
          gameType: { $first: "$gameSession" },
        },
      },
    ]);

    // Aggregation query for data2 - Filter by provider and date
    const data2 = await ABbids.aggregate([
      { $match: { providerId: new ObjectId(provider), gameDate: date } }, // Added date condition
      {
        $group: {
          _id: "$bidDigit",
          sumdigit: { $sum: "$biddingPoints" },
          countBid: { $sum: 1 },
          date: { $first: "$gameDate" },
        },
      },
    ]);

    // Check if data1 is empty
    if (!data1 || data1.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        message: "No data found for the given provider and date",
      });
    }

    // Return the result
    res.status(200).json({
      statusCode: 200,
      status: true,
      message: "Data fetched successfully",
      data: {
        data1,
        data2,
        type,
      },
    });
  } catch (error) {
    // Handle error
    res.status(500).json({
      statusCode: 500,
      status: false,
      message: "Error fetching data",
      error: error.message,
    });
  }
});


router.post("/getBidData", authMiddleware, async (req, res) => {
  try {
    const date = req.body.date;
    const bidDigit = req.body.bidDigit;
    const gameId = req.body.id;
    const bidData = await ABbids.find({
      providerId: gameId,
      gameDate: date,
      bidDigit: bidDigit,
    }).sort({ _id: 1 });
    return res
      .status(200)
      .json({
        status: true,
        message: "Bid Data Fatch Successfully",
        bidData: bidData,
      });
  } catch (e) {
    return res
      .status(400)
      .json({ status: false, message: "Internal Server Error" });
  }
});

module.exports = router;
