const router = require("express").Router();
const StarList = require("../../../model/starline/Starline_Provider");
const Starbids = require("../../../model/starline/StarlineBids");
const { ObjectId } = require("mongodb");
const digits = require("../../../model/digits");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const provider = await StarList.find({}, { providerName: 1, _id: 1 }).sort({
      _id: 1,
    });

    if (!provider || provider.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No providers found.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Providers fetched successfully.",
      data: provider,
    });
  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching providers.",
      error: e.message,
    });
  }
});

router.post("/getResult", authMiddleware, async (req, res) => {
  const { provider, date } = req.body;

  if (!provider || !date) {
    return res.status(400).json({
      status: false,
      message: "Provider and date are required fields.",
    });
  }

  try {
    const data1 = await Starbids.aggregate([
      { $match: { providerId: new ObjectId(provider), gameDate: date } },
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

    const data2 = await Starbids.aggregate([
      { $match: { providerId: new ObjectId(provider), gameDate: date } },
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

    const pana = await digits.find();

    res.status(200).json({
      status: true,
      message: "Data fetched successfully.",
      data: { data1, data2, pana },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching the result data.",
      error: error.message,
    });
  }
});

router.post("/getBidData", authMiddleware, async (req, res) => {
  const { date, bidDigit, id } = req.body;

  if (!date || !bidDigit || !id) {
    return res.status(400).json({
      status: false,
      message: "Date, bidDigit, and gameId are required fields.",
    });
  }

  try {
    const bidData = await Starbids.find({
      gameDate: date,
      providerId: id,
      bidDigit: bidDigit,
    });

    if (!bidData || bidData.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No bid data found for the provided criteria.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Bid data fetched successfully.",
      data: bidData,
    });
  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching bid data.",
      error: e.message,
    });
  }
});

module.exports = router;
