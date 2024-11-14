const router = require("express").Router();
const starProvider = require("../../../model/starline/Starline_Provider");
const starSettings = require("../../../model/starline/AddSetting");
const dateTime = require("node-datetime");
const session = require("../../helpersModule/session");
const moment =require("moment")
router.get("/", async (req, res) => {
    try {
      const finalArr = {};
      const provider = await starProvider.find().sort({ _id: 1 });
      const finalNew = [];
  
      for (const providerData of provider) {
        const settings = await starSettings.find({ providerId: providerData._id }).sort({ _id: 1 });
        finalArr[providerData._id] = {
          _id: providerData._id,
          providerName: providerData.providerName,
          providerResult: providerData.providerResult,
          modifiedAt: moment(providerData.modifiedAt).format("YYYY-MM-DD HH:mm:ss"),
          resultStatus: providerData.resultStatus,
          gameDetails: settings
        };
      }
  
      for (const data of Object.values(finalArr)) {
        finalNew.push(data);
      }
  
      return res.status(200).json({
        status: true,
        message: "Data fetched successfully",
        data: finalNew
      });
  
    } catch (e) {
      return res.status(500).json({ status: false, message: "An error occurred", error: e.message });
    }
  });
  

  router.get("/addSetting", async (req, res) => {
    try {
      const provider = await starProvider.find().sort({ _id: 1 });
      
      if (!provider || provider.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No providers found."
        });
      }
  
      return res.status(200).json({
        status: true,
        message: "Provider data fetched successfully.",
        data: provider
      });
  
    } catch (e) {
      return res.status(500).json({
        status: false,
        message: "An error occurred while fetching the provider data.",
        error: e.message
      });
    }
  });
  


  router.post("/updateProviderSettings", async (req, res) => {
    try {
      const { providerId, obtTime, cbtTime, obrtTime, openClose } = req.body;
  
      if (!providerId || !obtTime || !cbtTime || !obrtTime || openClose === undefined) {
        return res.status(400).json({
          status: false,
          message: "'providerId', 'obtTime', 'cbtTime', 'obrtTime', and 'openClose' are required fields."
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
          message: "No settings found for the provided providerId."
        });
      }
  
      res.status(200).json({
        status: true,
        message: "Provider settings updated successfully."
      });
  
    } catch (e) {
      console.error("Error updating provider settings:", e);
  
      res.status(500).json({
        status: false,
        message: "An error occurred while updating the provider settings.",
        error: e.message
      });
    }
  });

  router.patch("/", async (req, res) => {
    try {
      const { id, obt, cbt, obrt, close } = req.body;
  
      // Validation: Ensure that 'id' and required fields are provided
      if (!id || !obt || !cbt || !obrt || close === undefined) {
        return res.status(400).json({
          status: false,
          message: "'id', 'obt', 'cbt', 'obrt', and 'close' are required fields."
        });
      }
  
      // Format the current date and time using moment.js
      const formatted = moment().format("YYYY-MM-DD HH:mm:ss");
  
      // Attempt to update the settings based on the provided 'id'
      const updatedSettings = await starSettings.updateOne(
        { _id: id },
        {
          $set: {
            OBT: obt,
            CBT: cbt,
            OBRT: obrt,
            isClosed: close,
            modifiedAt: formatted
          }
        }
      );
  
      // If no document was updated, it means the provided 'id' wasn't found
      if (updatedSettings.matchedCount === 0) {
        return res.status(404).json({
          status: false,
          message: "No settings found with the provided 'id'."
        });
      }
  
      // Successfully updated
      res.status(200).json({
        status: true,
        message: "Provider settings updated successfully."
      });
    } catch (e) {
      // Handle server error
      console.error("Error updating provider settings:", e);
      res.status(500).json({
        status: false,
        message: "An error occurred while updating the provider settings.",
        error: e.message
      });
    }
  });
  



// router.patch("/", session, async (req, res) => {
//   try {
//     const dt = dateTime.create();
//     const formatted = dt.format("Y-m-d H:M:S");
//     const updateUser = await starSettings.updateOne(
//       { _id: req.body.id },
//       {
//         $set: {
//           OBT: req.body.obt,
//           CBT: req.body.cbt,
//           OBRT: req.body.obrt,
//           isClosed: req.body.close,
//           modifiedAt: formatted,
//         },
//       }
//     );
//     res.redirect("/starlinegamesetting");
//   } catch (e) {
//     res.json(e);
//   }
// });

// router.post("/insertSettings", session, async (req, res) => {
//   try {
//     const dt = dateTime.create();
//     const formatted = dt.format("Y-m-d H:M:S");
//     const providerId = req.body.gameid;
//     const gameDay = req.body.gameDay;
//     const find = await starSettings.findOne({
//       providerId: providerId,
//       gameDay: gameDay,
//     });
//     let days = [
//       "Monday",
//       "Tuesday",
//       "Wednesday",
//       "Thursday",
//       "Friday",
//       "Saturday",
//       "Sunday",
//     ];
//     if (!find) {
//       if (gameDay === "All") {
//         let finalArr = [];
//         let uniqueDays;
//         const providerSetting = await starSettings.find(
//           { providerId: providerId },
//           { gameDay: 1, providerId: 1 }
//         );
//         if (providerSetting.length > 0) {
//           let daysFromArray1 = providerSetting.map((item) => item.gameDay);
//           let allDays = new Set([...daysFromArray1, ...days]);
//           uniqueDays = [...allDays].filter(
//             (day) => !daysFromArray1.includes(day) || !days.includes(day)
//           );
//         } else {
//           uniqueDays = days;
//         }
//         for (let day of uniqueDays) {
//           finalArr.push({
//             providerId: providerId,
//             gameDay: day,
//             OBT: req.body.game1,
//             CBT: req.body.game2,
//             OBRT: req.body.game3,
//             CBRT: req.body.game4,
//             isClosed: req.body.status,
//             modifiedAt: formatted,
//           });
//         }
//         console.log(finalArr);
//         await starSettings.insertMany(finalArr);
//       } else {
//         const settings = new starSettings({
//           providerId: providerId,
//           gameDay: gameDay,
//           OBT: req.body.game1,
//           CBT: req.body.game2,
//           OBRT: req.body.game3,
//           CBRT: req.body.game4,
//           isClosed: req.body.status,
//           modifiedAt: formatted,
//         });
//         await settings.save();
//       }
//       res.json({
//         status: 1,
//         message: "Successfully Inserted Timings For " + gameDay,
//       });
//     } else {
//       res.json({
//         status: 1,
//         message: "Details Already Filled For " + gameDay,
//       });
//     }
//   } catch (e) {
//     res.status(400).send(e);
//   }
// });

// router.post("/:providerId", session, async (req, res) => {
//   try {
//     const id = req.params.providerId;
//     let findMultiple;
//     findMultiple = await starSettings.find({ providerId: id });
//     const userInfo = req.session.details;
//     const permissionArray = req.view;

//     if (Object.keys(findMultiple).length === 0) {
//       findMultiple = "Epmty";
//     }

//     const check = permissionArray["starlineSetting"].showStatus;
//     if (check === 1) {
//       res.render("./starline/starlinemultiedit", {
//         data: findMultiple,
//         userInfo: userInfo,
//         permission: permissionArray,
//         title: "Starline Multi Edit",
//       });
//     } else {
//       res.render("./dashboard/starterPage", {
//         userInfo: userInfo,
//         permission: permissionArray,
//         title: "Dashboard",
//       });
//     }
//   } catch (error) {
//     res.json({ message: error });
//   }
// });

module.exports = router;
