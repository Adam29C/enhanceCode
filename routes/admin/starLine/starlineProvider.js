const express = require("express");
const authMiddleware = require("../../helpersModule/athetication")
const router = express.Router();
const starlineProvider = require("../../../model/starline/Starline_Provider");
const moment = require('moment');

router.get("/getStarlineProvider", authMiddleware, async (req, res) => {
  try {
    const provider = await starlineProvider.find().sort({ _id: 1 });
    return res.json({
      status: true,
      message: "Starline Provider data fetched successfully.",
      data: provider,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching the data.",
      error: e.message
    });
  }
});

router.get("/starLineProviderById", authMiddleware,async (req, res) => {
  try {
    const { providerId } = req.query;  

    if (!providerId) {
      return res.status(400).json({
        status: false,
        message: "'providerId' query parameter is required."
      });
    }

    const provider = await starlineProvider.findOne({ _id: providerId });


    if (!provider) {
      return res.status(404).json({
        status: false,
        message: "Provider not found with the provided 'providerId'."
      });
    }

    res.status(200).json({
      status: true,
      message: "Provider data fetched successfully.",
      provider: provider
    });

  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching the provider data.",
      error: e.message
    });
  }
});

router.post("/insertStarLineProvider", authMiddleware,async (req, res) => {
  const { providerName, result } = req.body;

  if (!providerName || !result) {
    return res.status(400).json({
      status: false,
      message: "'providerName' and 'result' are required fields."
    });
  }
  const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

  const provider = new starlineProvider({
    providerName: providerName,
    providerResult: result,
    modifiedAt: formatted
  });

  try {

    const savedProvider = await provider.save();

    res.status(201).json({
      status: true,
      message: "Provider inserted successfully.",
      provider: savedProvider
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "An error occurred while inserting the provider.",
      error: err.message
    });
  }
});

router.patch("/updateStarLineProvider", authMiddleware,async (req, res) => {
  try {
    const { providerId, gamename, result } = req.body;
    if (!providerId) {
      return res.status(400).json({
        status: false,
        message: "'providerId' is required."
      });
    }
    const updateFields = {};

    if (gamename) {
      updateFields.providerName = gamename;
    }

    if (result) {
      updateFields.providerResult = result;
    }

    if (!gamename && !result) {
      return res.status(400).json({
        status: false,
        message: "'gamename' or 'result' is required to update."
      });
    }
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    updateFields.modifiedAt = formatted;

    const updatedProvider = await starlineProvider.updateOne(
      { _id: providerId }, 
      { $set: updateFields }
    );

    if (updatedProvider.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Provider not found with the provided providerId."
      });
    }

    res.status(200).json({
      status: true,
      message: "Provider updated successfully."
    });

  } catch (err) {

    console.error("Error updating provider:", err);

    res.status(500).json({
      status: false,
      message: "An error occurred while updating the provider.",
      error: err.message
    });
  }
});

router.delete("/deleteStarLineProvider", authMiddleware,async (req, res) => {
  try {
    const { providerId } = req.query;

    if (!providerId) {
      return res.status(400).json({
        status: false,
        message: "'providerId' is required to delete a provider."
      });
    }

    const deletedProvider = await starlineProvider.deleteOne({ _id: providerId });


    if (deletedProvider.deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Provider not found with the provided providerId."
      });
    }
    res.status(200).json({
      status: true,
      message: "Provider deleted successfully."
    });

  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the provider.",
      error: e.message
    });
  }
});


module.exports = router;