const router = require("express").Router();
const starProvider = require("../../../model/starline/Starline_Provider");
const starSettings = require("../../../model/starline/AddSetting");
const dateTime = require("node-datetime");
const session = require("../../helpersModule/session");
const moment = require("moment");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const finalArr = {};
    const provider = await starProvider.find().sort({ _id: 1 });
    const finalNew = [];

    for (const providerData of provider) {
      const settings = await starSettings
        .find({ providerId: providerData._id })
        .sort({ _id: 1 });
      finalArr[providerData._id] = {
        _id: providerData._id,
        providerName: providerData.providerName,
        providerResult: providerData.providerResult,
        modifiedAt: moment(providerData.modifiedAt).format(
          "YYYY-MM-DD HH:mm:ss"
        ),
        resultStatus: providerData.resultStatus,
        gameDetails: settings,
      };
    }

    for (const data of Object.values(finalArr)) {
      finalNew.push(data);
    }

    return res.status(200).json({
      status: true,
      message: "Data fetched successfully",
      data: finalNew,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "An error occurred", error: e.message });
  }
});

router.get("/addSetting", authMiddleware, async (req, res) => {
  try {
    const provider = await starProvider.find().sort({ _id: 1 });

    if (!provider || provider.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No providers found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Provider data fetched successfully.",
      data: provider,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching the provider data.",
      error: e.message,
    });
  }
});

router.post("/updateProviderSettings", authMiddleware, async (req, res) => {
  try {
    const { providerId, obtTime, cbtTime, obrtTime, openClose } = req.body;

    if (
      !providerId ||
      !obtTime ||
      !cbtTime ||
      !obrtTime ||
      openClose === undefined
    ) {
      return res.status(400).json({
        status: false,
        message:
          "'providerId', 'obtTime', 'cbtTime', 'obrtTime', and 'openClose' are required fields.",
      });
    }

    const dt = moment().format("YYYY-MM-DD HH:mm:ss");

    const updateResult = await starSettings.updateMany(
      { providerId },
      {
        $set: {
          OBT: obtTime,
          CBT: cbtTime,
          OBRT: obrtTime,
          isClosed: openClose,
          modifiedAt: dt,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "No settings found for the provided providerId.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Provider settings updated successfully.",
    });
  } catch (e) {
    console.error("Error updating provider settings:", e);

    res.status(500).json({
      status: false,
      message: "An error occurred while updating the provider settings.",
      error: e.message,
    });
  }
});

router.patch("/", authMiddleware, async (req, res) => {
  try {
    const { id, obt, cbt, obrt, close } = req.body;

    if (!id || !obt || !cbt || !obrt || close === undefined) {
      return res.status(400).json({
        status: false,
        message: "'id', 'obt', 'cbt', 'obrt', and 'close' are required fields.",
      });
    }

    const formatted = moment().format("YYYY-MM-DD HH:mm:ss");

    const updatedSettings = await starSettings.updateOne(
      { _id: id },
      {
        $set: {
          OBT: obt,
          CBT: cbt,
          OBRT: obrt,
          isClosed: close,
          modifiedAt: formatted,
        },
      }
    );

    if (updatedSettings.matchedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "No settings found with the provided 'id'.",
      });
    }

    res.status(200).json({
      status: true,
      message: "Provider settings updated successfully.",
    });
  } catch (e) {
    console.error("Error updating provider settings:", e);
    res.status(500).json({
      status: false,
      message: "An error occurred while updating the provider settings.",
      error: e.message,
    });
  }
});

router.post("/insertSettings", authMiddleware, async (req, res) => {
  try {
    const dt = dateTime.create();
    const formatted = dt.format("Y-m-d H:M:S");
    const { providerId, gameDay, game1, game2, game3, game4, status } =
      req.body;

    if (
      !providerId ||
      !gameDay ||
      !game1 ||
      !game2 ||
      !game3 ||
      !game4 ||
      status === undefined
    ) {
      return res.status(400).json({
        status: false,
        message:
          "'providerId', 'gameDay', 'game1', 'game2', 'game3', 'game4', and 'status' are required fields.",
      });
    }

    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const existingSetting = await starSettings.findOne({ providerId, gameDay });

    if (existingSetting) {
      return res.status(400).json({
        status: false,
        message: `Details already filled for ${gameDay}`,
      });
    }

    if (gameDay === "All") {
      let finalArr = [];
      let uniqueDays;

      const providerSettings = await starSettings.find(
        { providerId },
        { gameDay: 1 }
      );

      if (providerSettings.length > 0) {
        const existingGameDays = providerSettings.map((item) => item.gameDay);
        uniqueDays = [...new Set([...existingGameDays, ...daysOfWeek])];
      } else {
        uniqueDays = daysOfWeek;
      }

      finalArr = uniqueDays.map((day) => ({
        providerId,
        gameDay: day,
        OBT: game1,
        CBT: game2,
        OBRT: game3,
        CBRT: game4,
        isClosed: status,
        modifiedAt: formatted,
      }));

      await starSettings.insertMany(finalArr);

      return res.status(201).json({
        status: true,
        message: "Successfully inserted timings for all days.",
      });
    }

    const settings = new starSettings({
      providerId,
      gameDay,
      OBT: game1,
      CBT: game2,
      OBRT: game3,
      CBRT: game4,
      isClosed: status,
      modifiedAt: formatted,
    });

    await settings.save();

    return res.status(201).json({
      status: true,
      message: `Successfully inserted timings for ${gameDay}`,
    });
  } catch (error) {
    console.error("Error inserting settings:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while processing the request.",
      error: error.message,
    });
  }
});

router.post("/:providerId", authMiddleware, async (req, res) => {
  try {
    const { providerId } = req.params;
    const providerInfo = await starSettings.find({ providerId });

    if (providerInfo.length === 0) {
      return res.status(404).json({
        status: false,
        message: `No settings found for provider ID ${providerId}`,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Provider info fetched successfully",
      data: providerInfo,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching provider info",
      error: error.message,
    });
  }
});

module.exports = router;