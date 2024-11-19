const router = require("express").Router();
const mongodb = require("mongodb");
const { ObjectId } = require('mongodb');
const ABList = require("../../../model/AndarBahar/ABProvider");
const ABtype = require("../../../model/AndarBahar/ABGameList");
const ABbids = require("../../../model/AndarBahar/ABbids");

router.get("/t", async (req, res) => {
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
  
router.post("/getResult1", async (req, res) => {
  const { provider } = req.body;

  // Input validation: Check if provider is provided
  if (!provider) {
    return res.status(400).json({
      statusCode: 400,
      status: false,
      message: "Missing required field: provider",
    });
  }

  try {
    // Fetch game types with the game price and name
    const type = await ABtype.find({}, { gamePrice: 1, _id: 1, gameName: 1 }).sort({ _id: 1 });

    // Fetch aggregated data based on providerId
    const data1 = await ABbids.aggregate([
      { $match: { providerId: new ObjectId(provider) } },
      {
        $group: {
          _id: "$gameTypeId",
          sumdigit: { $sum: "$biddingPoints" },
          countBid: { $sum: 1 },
          gameType: { $first: "$gameSession" },
        },
      },
    ]);

    // Fetch aggregated data for b d digit
    const data2 = await ABbids.aggregate([
      { $match: { providerId: new ObjectId(provider) } },
      {
        $group: {
          _id: "$bidDigit",
          sumdigit: { $sum: "$biddingPoints" },
          countBid: { $sum: 1 },
          date: { $first: "$gameDate" },
        },
      },
    ]);

    // Check if any data is found
    if (!data1 || data1.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        message: "No data found for the given provider",
      });
    }

    // Return the aggregated data
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
    res.status(500).json({
      statusCode: 500,
      status: false,
      message: "Error fetching data",
      error: error.message,
    });
  }
});

router.post("/getBidData", async (req, res) => {
	const date = req.body.date;
	const bidDigit = req.body.bidDigit;
	const gameId = req.body.id;
	try {
		const bidData = await ABbids.find({
			providerId: gameId,
			gameDate: date,
			bidDigit: bidDigit,
		}).sort({ _id: 1 });
		res.json(bidData);
	} catch (e) {
		res.json(e);
	}
});

module.exports =router;