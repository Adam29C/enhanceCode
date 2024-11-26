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
    return res.json({
      status: true,
      message: "Game settings fetched successfully",
      data:provider,
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

    const settingList=await ABgamesSetting.findOne({providerId:gameid});
    if(!settingList){
      return res.status(404).json({
        status: false,
        message: "Provider Setting Not Present. First Create Provider Setting."
      });
    }

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
        status: false,
        message: "No provider settings found for the given providerId or no changes made"
      });
    }

    return res.status(200).json({
      status: true,
      message: "Provider settings updated successfully"
    });

  } catch (e) {
    return res.status(500).json({
      status: false,
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

    // Define the days of the week
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // Check if a setting already exists for the provider and gameDay
    const existingSetting = await ABgamesSetting.findOne({ providerId, gameDay });

    // If no setting exists for the given provider and gameDay
    if (!existingSetting) {

      // Handle the "ALL" gameDay scenario
      if (gameDay.toUpperCase() === "ALL") {
        // Fetch all existing game days for this provider
        const providerSettings = await ABgamesSetting.find({ providerId }, { gameDay: 1 });

        // Collect the existing days for this provider
        const existingDays = providerSettings.map(item => item.gameDay);

        // Update settings for the already existing game days (if any)
        for (let day of daysOfWeek) {
          if (existingDays.includes(day)) {
            // Update existing game day settings
            await ABgamesSetting.updateOne(
              { providerId, gameDay: day },
              { $set: { OBT: game1, CBT: game2, OBRT: game3, isClosed: status, modifiedAt: formatted } }
            );
          }
        }

        // Now insert new settings for the days that do not exist
        const newSettings = daysOfWeek
          .filter(day => !existingDays.includes(day)) // Get the days that do not exist
          .map(day => ({
            providerId,
            gameDay: day,
            OBT: game1,
            CBT: game2,
            OBRT: game3,
            isClosed: status,
            modifiedAt: formatted
          }));

        // Insert new settings for the unique days
        if (newSettings.length > 0) {
          await ABgamesSetting.insertMany(newSettings);
        }

        return res.json({
          status: true,
          message: "Successfully inserted or updated timings for all days."
        });

      } else {
        // Handle the case for a specific gameDay (not "ALL")
        const newSetting = new ABgamesSetting({
          providerId,
          gameDay,
          OBT: game1,
          CBT: game2,
          OBRT: game3,
          isClosed: status,
          modifiedAt: formatted
        });

        // Save the new setting
        await newSetting.save();

        return res.json({
          status: true,
          message: `Successfully inserted timings for ${gameDay}`
        });
      }

    } else {
      // If the setting already exists for the given provider and gameDay
      return res.json({
        status: false,
        message: `Details already filled for ${gameDay}`
      });
    }

  } catch (e) {
    console.error(e); // Log the error for debugging purposes
    return res.status(400).json({
      status: false,
      message: "Error inserting settings",
      error: e.toString()
    });
  }
});


router.patch("/", authMiddleware, async (req, res) => {
  try {
    const { gameid, game1, game2, game3, status } = req.body;
    if (!gameid || !game1 || !game2 || !game3 || !status) {
      return res.status(400).json({
        status: false,
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
        status: false,
        message: "No settings found for the provided ID or no changes were made."
      });
    }
    return res.status(200).json({
      status: true,
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
      status: false,
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
      status: true,
      message: "Settings fetched successfully.",
      data: ABgamesSettingInfo
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while processing the request.",
      error: error.message
    });
  }
});

module.exports = router;