const express = require("express");
const router = express.Router();
const ABgamesProvider = require("../../../model/AndarBahar/ABProvider");
const ABgamesSetting = require("../../../model/AndarBahar/ABAddSetting");
const authMiddleware = require("../../helpersModule/athetication");
const moment = require('moment');


router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query; // Extracting userId directly from query params
    let finalArr = {};  // This will hold the final processed data
    const provider = await ABgamesProvider.find().sort({ _id: 1 });
    let finalNew = [];

    // Loop through each provider and fetch its settings
    for (let index in provider) {
      let id = provider[index]._id;
      const settings = await ABgamesSetting.find({ providerId: id }).sort({ _id: 1 });
      
      // Structuring the data for each provider and its settings
      finalArr[id] = {
        _id: id,
        providerName: provider[index].providerName,
        providerResult: provider[index].providerResult,
        modifiedAt: provider[index].modifiedAt,
        resultStatus: provider[index].resultStatus,
        gameDetails: settings
      };
    }

    // Push all the provider data into an array for easier handling
    for (let index2 in finalArr) {
      let data = finalArr[index2];
      finalNew.push(data);
    }

    // If the userId matches a specific value, return the data directly as JSON
    if (userId == 123456) {
      return res.json(finalNew);
    }

    // Default case: return the JSON data
    res.json({
      status: true,
      message: "Game settings fetched successfully",
      data: finalNew,
    });

  } catch (e) {
    // If there's an error, send a JSON response with the error message
    res.json({
      status: false,
      message: "An error occurred",
      error: e.message,
    });
  }
});

router.get("/addSetting", authMiddleware, async (req, res) => {
    try {
      // Fetch all providers
      const provider = await ABgamesProvider.find().sort({ _id: 1 });
  
      // Prepare the response data
      const responseData = {
        status: true,
        message: "Providers fetched successfully",
        data: provider,
      };
  
      // Send the data as JSON response
      res.json(responseData);
    } catch (e) {
      // Handle errors
      res.json({
        status: false,
        message: "Error fetching providers",
        error: e.message,
      });
    }
});


router.post("/updateProviderSettings", authMiddleware, async (req, res) => {
  try {
    const { providerId, obtTime, cbtTime, obrtTime, openClose } = req.body;
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

    const result = await ABgamesSetting.updateMany(
      { providerId: providerId },
      {
        $set: {
          OBT: obtTime,
          CBT: cbtTime,
          OBRT: obrtTime,
          isClosed: openClose,
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

    res.status(200).json({
      success: true,
      message: "Provider settings updated successfully"
    });

  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Error updating provider settings",
      error: e.toString()
    });
  }
});

router.post("/insertSettings", authMiddleware, async (req, res) => {
  try {
    const { gameid, gameDay, game1, game2, game3, game4, status } = req.body;
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    const providerId = gameid;

    // Check if the settings already exist for the given providerId and gameDay
    const existingSetting = await ABgamesSetting.findOne({
      providerId,
      gameDay
    });

    let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    if (!existingSetting) {
      if (gameDay === "All") {
        let finalArr = [];
        let uniqueDays;

        // Get the existing game days for the provider
        const providerSettings = await ABgamesSetting.find({ providerId }, { gameDay: 1, providerId: 1 });

        // Get the unique days that need to be added
        let existingDays = providerSettings.map(item => item.gameDay);
        if (providerSettings.length > 0) {
          // Create a unique list of days that don't exist in the provider's current settings or the default days
          uniqueDays = [...new Set([...existingDays, ...days])].filter(day => !existingDays.includes(day) || !days.includes(day));
        } else {
          // If no provider settings, use all days
          uniqueDays = days;
        }

        // Prepare the data to insert for each unique day
        uniqueDays.forEach(day => {
          finalArr.push({
            providerId,
            gameDay: day,
            OBT: game1,
            CBT: game2,
            OBRT: game3,
            CBRT: game4,
            isClosed: status,
            modifiedAt: formatted
          });
        });

        // Insert new records for the unique days
        await ABgamesSetting.insertMany(finalArr);

      } else {
        // If gameDay is not "All", create a new setting for that specific day
        const newSetting = new ABgamesSetting({
          providerId,
          gameDay,
          OBT: game1,
          CBT: game2,
          OBRT: game3,
          CBRT: game4,
          isClosed: status,
          modifiedAt: formatted
        });

        await newSetting.save();
      }

      res.json({
        success: true,
        message: `Successfully inserted timings for ${gameDay}`
      });

    } else {
      res.json({
        success: false,
        message: `Details already filled for ${gameDay}`
      });
    }

  } catch (e) {
    res.status(400).json({
      success: false,
      message: "Error inserting settings",
      error: e.toString()
    });
  }
});

router.patch("/", authMiddleware, async (req, res) => {
  try {
    const { id, obt, cbt, obrt, cbrt, close } = req.body;
    if (!id || !obt || !cbt || !obrt || !cbrt || close === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields in the request body."
      });
    }
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    const result = await ABgamesSetting.updateOne(
      { _id: id },
      {
        $set: {
          OBT: obt,
          CBT: cbt,
          OBRT: obrt,
          CBRT: cbrt,
          isClosed: close,
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
    res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      data: {
        _id: id,
        OBT: obt,
        CBT: cbt,
        OBRT: obrt,
        CBRT: cbrt,
        isClosed: close,
        modifiedAt: formatted
      }
    });
  } catch (e) {
    res.status(500).json({
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
    res.status(200).json({
      success: true,
      message: "Settings fetched successfully.",
      data: ABgamesSettingInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while processing the request.",
      error: error.message
    });
  }
});

module.exports =router;