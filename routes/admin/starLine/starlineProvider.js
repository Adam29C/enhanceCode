const express =require("express");
const session = require("../../helpersModule/session");
const router =express.Router();
const starlineProvider = require("../../../model/starline/Starline_Provider");
const moment = require('moment');

router.get("/getStarlineProvider",session,async (req, res) => {
    try {
      // Fetch the starline provider data
      const provider = await starlineProvider.find().sort({ _id: 1 });
  
      // User info from session
      const userInfo = req.session.details;
  
      // Respond with the appropriate data
      return res.json({
        status: true,
        message: "Starline Provider data fetched successfully.",
        data: provider,
        userInfo: userInfo
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "An error occurred while fetching the data.",
        error: e.message
      });
    }
});

router.get("/starLineProviderById", async (req, res) => {
  try {
    const { providerId } = req.query;  // Changed from gameId to providerId

    if (!providerId) {
      return res.status(400).json({
        status: false,
        message: "'providerId' query parameter is required."
      });
    }

    // Fetch the provider from the database based on 'providerId'
    const provider = await starlineProvider.findOne({ _id: providerId });

    // If no provider is found, return a 404 error
    if (!provider) {
      return res.status(404).json({
        status: false,
        message: "Provider not found with the provided 'providerId'."
      });
    }

    // If provider is found, return the provider data
    res.status(200).json({
      status: true,
      message: "Provider data fetched successfully.",
      provider: provider
    });

  } catch (e) {
    // Return a server error response
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching the provider data.",
      error: e.message
    });
  }
});


router.post("/insertStarLineProvider", async (req, res) => {
  // Destructure the data from the request body
  const { providerName, result } = req.body;

  // Validation: Check if both 'providerName' and 'result' are provided
  if (!providerName || !result) {
    return res.status(400).json({
      status: false,
      message: "'providerName' and 'result' are required fields."
    });
  }

  // Use moment.js to format the current date and time
  const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

  // Create a new provider object
  const provider = new starlineProvider({
    providerName: providerName,
    providerResult: result,
    modifiedAt: formatted
  });

  try {
    // Save the provider to the database
    const savedProvider = await provider.save();

    // Send success response
    res.status(201).json({
      status: true,
      message: "Provider inserted successfully.",
      provider: savedProvider
    });
  } catch (err) {
    // Handle database insertion error
    res.status(500).json({
      status: false,
      message: "An error occurred while inserting the provider.",
      error: err.message
    });
  }
});


router.patch("/updateStarLineProvider", async (req, res) => {
  try {
    // Destructure input data from the request body
    const { providerId, gamename, result } = req.body;

    // Validation: Ensure 'providerId' is provided
    if (!providerId) {
      return res.status(400).json({
        status: false,
        message: "'providerId' is required."
      });
    }

    // Prepare fields to be updated
    const updateFields = {};

    // If 'gamename' is provided, add it to the update fields
    if (gamename) {
      updateFields.providerName = gamename;
    }

    // If 'result' is provided, add it to the update fields
    if (result) {
      updateFields.providerResult = result;
    }

    // Validation: Ensure at least one of 'gamename' or 'result' is provided
    if (!gamename && !result) {
      return res.status(400).json({
        status: false,
        message: "'gamename' or 'result' is required to update."
      });
    }

    // Format the current date and time
    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
    updateFields.modifiedAt = formatted;

    // Attempt to update the provider in the database
    const updatedProvider = await starlineProvider.updateOne(
      { _id: providerId }, // Filter by 'providerId'
      { $set: updateFields }
    );

    // If no document was updated, return a 404 error (provider not found)
    if (updatedProvider.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Provider not found with the provided providerId."
      });
    }

    // Respond with success message
    res.status(200).json({
      status: true,
      message: "Provider updated successfully."
    });

  } catch (err) {
    // Log the error for debugging
    console.error("Error updating provider:", err);

    // Send error response if something goes wrong
    res.status(500).json({
      status: false,
      message: "An error occurred while updating the provider.",
      error: err.message
    });
  }
});

router.delete("/deleteStarLineProvider", async (req, res) => {
  try {
    const { providerId } = req.query;

    // Validation: Check if 'providerId' is provided
    if (!providerId) {
      return res.status(400).json({
        status: false,
        message: "'providerId' is required to delete a provider."
      });
    }

    // Try deleting the provider from the database
    const deletedProvider = await starlineProvider.deleteOne({ _id: providerId });

    // If no document is deleted, it means the provided providerId was not found
    if (deletedProvider.deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Provider not found with the provided providerId."
      });
    }

    // Respond with success message
    res.status(200).json({
      status: true,
      message: "Provider deleted successfully."
    });

  } catch (e) {
    // Send error response if there's an issue with the database or server
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the provider.",
      error: e.message
    });
  }
});


module.exports = router;