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
      const date = req.body.startDate;
      const providerId = req.body.gameId;
      const bidsData = await abBids.find({
        providerId: providerId,
        gameDate: date
      });
      res.json(bidsData);
    } catch (error) {
      res.json({
        status: 0,
        message: "contact Support",
        data: e
      });
    }
  });