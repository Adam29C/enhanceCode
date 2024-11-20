const express = require("express");
const router = express.Router();
const ABgamesProvider = require("../../../model/AndarBahar/ABProvider");
const ABgamesSetting = require("../../../model/AndarBahar/ABAddSetting");
const authMiddleware = require("../../helpersModule/athetication");
const moment = require('moment');

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;
    let finalArr = {};
    const provider = await ABgamesProvider.find().sort({ _id: 1 });
    let finalNew = [];

    for (let index in provider) {
      let id = provider[index]._id;
      const settings = await ABgamesSetting.find({ providerId: id }).sort({ _id: 1 });

      finalArr[id] = {
        _id: id,
        providerName: provider[index].providerName,
        providerResult: provider[index].providerResult,
        modifiedAt: provider[index].modifiedAt,
        resultStatus: provider[index].resultStatus,
        gameDetails: settings
      };
    }

    for (let index2 in finalArr) {
      let data = finalArr[index2];
      finalNew.push(data);
    }

    if (userId == 123456) {
      return res.json(finalNew);
    }

    return res.json({
      status: true,
      message: "Game settings fetched successfully",
      data: finalNew,
    });

  } catch (e) {
    return res.json({
      status: false,
      message: "An error occurred",
      error: e.message,
    });
  }
});

router.get("/addSetting", authMiddleware, async (req, res) => {
  try {
    const provider = await ABgamesProvider.find().sort({ _id: 1 });

    const responseData = {
      status: true,
      message: "Providers fetched successfully",
      data: provider,
    };

    return res.json({
      status: true,
      message: "Game settings fetched successfully",
      data: responseData,
    });
  } catch (e) {
    return res.json({
      status: false,
      message: "Error fetching providers",
      error: e.message,
    });
  }
});

router.post("/updateProviderSettings", authMiddleware, async (req, res) => {
  try {
    const { gameid, game1, game2, game3, status } = req.body;
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

    const result = await ABgamesSetting.updateMany(
      { providerId: gameid },
      {
        $set: {
          OBT: game1,
          CBT: game2,
          OBRT: game3,
          isClosed: status,
          modifiedAt: formatted
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No provider settings found for the given providerId or no changes made"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Provider settings updated successfully"
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Error updating provider settings",
      error: e.toString()
    });
  }
});

router.post("/insertSettings", authMiddleware, async (req, res) => {
  try {
    const { gameid, gameDay, game1, game2, game3, status } = req.body;
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    const providerId = gameid;

    const existingSetting = await ABgamesSetting.findOne({
      providerId,
      gameDay
    });

    let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    if (!existingSetting) {
      if (gameDay.toUpperCase() === "ALL") {
        let finalArr = [];
        let uniqueDays;

        const providerSettings = await ABgamesSetting.find({ providerId }, { gameDay: 1, providerId: 1 });

        let existingDays = providerSettings.map(item => item.gameDay);
        if (providerSettings.length > 0) {
          uniqueDays = [...new Set([...existingDays, ...days])].filter(day => !existingDays.includes(day) || !days.includes(day));
        } else {
          uniqueDays = days;
        }
        uniqueDays.forEach(day => {
          finalArr.push({
            providerId,
            gameDay: day,
            OBT: game1,
            CBT: game2,
            OBRT: game3,
            isClosed: status,
            modifiedAt: formatted
          });
        });

        await ABgamesSetting.insertMany(finalArr);

      } else {
        const newSetting = new ABgamesSetting({
          providerId,
          gameDay,
          OBT: game1,
          CBT: game2,
          OBRT: game3,
          isClosed: status,
          modifiedAt: formatted
        });

        await newSetting.save();
      }
      return res.json({
        success: true,
        message: `Successfully inserted timings for ${gameDay}`
      });

    } else {
      return res.json({
        success: false,
        message: `Details already filled for ${gameDay}`
      });
    }

  } catch (e) {
    return res.status(400).json({
      success: false,
      message: "Error inserting settings",
      error: e.toString()
    });
  }
});

router.patch("/", authMiddleware, async (req, res) => {
  try {
    const { gameid, game1, game2, game3, status } = req.body;
    if (!gameid || !game1 || !game2 || !game3 || status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields in the request body."
      });
    }
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    const result = await ABgamesSetting.updateOne(
      { _id: gameid },
      {
        $set: {
          OBT: game1,
          CBT: game2,
          OBRT: game3,
          isClosed: status,
          modifiedAt: formatted
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No settings found for the provided ID or no changes were made."
      });
    }
    return res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      data: {
        _id: gameid,
        OBT: game1,
        CBT: game2,
        OBRT: game3,
        isClosed: status,
        modifiedAt: formatted
      }
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Error updating settings.",
      error: e.toString()
    });
  }
});

router.get("/:providerId", authMiddleware, async (req, res) => {
  try {
    const id = req.params.providerId;
    let ABgamesSettingInfo = await ABgamesSetting.find({ providerId: id });
    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully.",
      data: ABgamesSettingInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the request.",
      error: error.message
    });
  }
});

module.exports = router;