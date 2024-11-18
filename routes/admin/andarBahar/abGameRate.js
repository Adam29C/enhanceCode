const express =require("express");
const router =express.Router();
const ABgameList = require("../../../model/AndarBahar/ABGameList");

router.get("/", async (req, res) => {
    try {
      const provider = await ABgameList.find().sort({ _id: 1 });
  
      // Send the data back to the client
      res.status(200).json({
        success: true,
        message: "Games fetched successfully.",
        data: provider
      });
    } catch (e) {
      // In case of an error, send the error message
      res.status(500).json({
        success: false,
        message: "Error fetching games.",
        error: e.message
      });
    }
  });
  
  router.post("/insertGame", async (req, res) => {
    const dt = dateTime.create();
    const formatted = dt.format("Y-m-d H:M:S");
    const games = new ABgameList({
      gameName: req.body.gameName,
      gamePrice: req.body.gamePrice,
      modifiedAt: formatted
    });
    try {
      await games.save();
      const provider = await ABgameList.find();
      res.status(200).send(provider);
    } catch (e) {
      res.status(400).send(e);
    }
  });
  
//   router.delete("/", session, async (req, res) => {
//     try {
//       const savedGames = await ABgameList.deleteOne({ _id: req.body.userId });
//       res.json(savedGames);
//     } catch (e) {
//       res.json(e);
//     }
//   });
  
//   router.post("/update", session, async (req, res) => {
//     try {
//       const dt = dateTime.create();
//       const formatted = dt.format("Y-m-d H:M:S");
  
//       await ABgameList.updateOne(
//         { _id: req.body.userId },
//         {
//           $set: {
//             gameName: req.body.gameName,
//             gamePrice: req.body.gamePrice,
//             modifiedAt: formatted
//           }
//         }
//       );
  
//       const provider = await ABgameList.find();
//       res.status(200).send(provider);
//     } catch (e) {
//       res.json(e);
//     }
//   });
  
module.exports =router;