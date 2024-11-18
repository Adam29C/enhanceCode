const express = require("express");
const router = express.Router();
const ABgamesProvider = require("../../../model/AndarBahar/ABProvider");
const ABgamesSetting = require("../../../model/AndarBahar/ABAddSetting");

router.get("/", async (req, res) => {
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

router.get("/addSetting", async (req, res) => {
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
module.exports = router;


// router.get("/addSetting", session, permission, async (req, res) => {
//   try {
//     const provider = await ABgamesProvider.find().sort({ _id: 1 });;
//     const userInfo = req.session.details;
//     const permissionArray = req.view;
//     const check = permissionArray["abSetting"].showStatus;
//     if (check === 1) {
//       res.render("./andarbahar/ABaddsetting", {
//         data: provider,
//         userInfo: userInfo,
//         permission: permissionArray,
//         title: "AB Add Settings"
//       });
//     } else {
//       res.render("./dashboard/starterPage", {
//         userInfo: userInfo,
//         permission: permissionArray,
//         title: "Dashboard"
//       });
//     }
//   } catch (e) {
//     res.json({ message: e });
//   }
// });

// router.post("/updateProviderSettings", session, async (req, res) => {
//   try {
//     const dt = dateTime.create();
//     const formatted = dt.format("Y-m-d H:M:S");
//     let providerId = req.body.providerId;
//     await ABgamesSetting.updateMany(
//       { providerId: providerId },
//       {
//         $set: {
//           OBT: req.body.obtTime,
//           CBT: req.body.cbtTime,
//           OBRT: req.body.obrtTime,
//           isClosed: req.body.openClose,
//           modifiedAt: formatted
//         }
//       }
//     );
//     res.redirect("/andarbahargamesetting");
//   } catch (e) {
//     res.json({
//       status: 0,
//       error: e.toString()
//     });
//   }
// });

// router.post("/insertSettings", session, async (req, res) => {
//   try {
//     const dt = dateTime.create();
//     const formatted = dt.format("Y-m-d H:M:S");
//     const providerId = req.body.gameid;
//     const gameDay = req.body.gameDay;
//     const find = await ABgamesSetting.findOne({
//       providerId: providerId,
//       gameDay: gameDay
//     });
//     let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
//     if (!find) {
//       if (gameDay === "All") {
//         let finalArr=[]
//         let uniqueDays;
//         const providerSetting = await ABgamesSetting.find({ providerId: providerId }, { gameDay: 1, providerId: 1 });
//         if (providerSetting.length > 0) {
//           let daysFromArray1 = providerSetting.map(item => item.gameDay);
//           let allDays = new Set([...daysFromArray1, ...days]);
//           uniqueDays = [...allDays].filter(day => !daysFromArray1.includes(day) || !days.includes(day));
//         } else {
//           uniqueDays = days
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
//             modifiedAt: formatted
//           })
//         }
//         await ABgamesSetting.insertMany(finalArr)
//       } else {
//         const settings = new ABgamesSetting({
//           providerId: providerId,
//           gameDay: gameDay,
//           OBT: req.body.game1,
//           CBT: req.body.game2,
//           OBRT: req.body.game3,
//           CBRT: req.body.game4,
//           isClosed: req.body.status,
//           modifiedAt: formatted
//         });
//         await settings.save();
//       }
//       res.json({
//         status: 1,
//         message: "Successfully Inserted Timings For " + gameDay
//       });
//     } else {
//       res.json({
//         status: 1,
//         message: "Details Already Filled For " + gameDay
//       });
//     }
//   } catch (e) {
//     res.status(400).send(e);
//   }
// });

// router.patch("/", session, async (req, res) => {
//   try {
//     const dt = dateTime.create();
//     const formatted = dt.format("Y-m-d H:M:S");
//     await ABgamesSetting.updateOne(
//       { _id: req.body.id },
//       {
//         $set: {
//           OBT: req.body.obt,
//           CBT: req.body.cbt,
//           OBRT: req.body.obrt,
//           CBRT: req.body.cbrt,
//           isClosed: req.body.close,
//           modifiedAt: formatted
//         }
//       }
//     );
//     res.redirect("/andarbahargamesetting");
//   } catch (e) {
//     res.json(e);
//   }
// });

// router.post("/:providerId", session, permission, async (req, res) => {
//   try {
//     const id = req.params.providerId;
//     let findMultiple;
//     findMultiple = await ABgamesSetting.find({ providerId: id });
//     const userInfo = req.session.details;
//     const permissionArray = req.view;

//     if (Object.keys(findMultiple).length === 0) {
//       findMultiple = "Empty";
//     }

//     const check = permissionArray["abSetting"].showStatus;
//     if (check === 1) {
//       res.render("./andarbahar/abMultiEdit", {
//         data: findMultiple,
//         userInfo: userInfo,
//         permission: permissionArray,
//         title: "AB MultiEdit"
//       });
//     } else {
//       res.render("./dashboard/starterPage", {
//         userInfo: userInfo,
//         permission: permissionArray,
//         title: "Dashboard"
//       });
//     }
//   } catch (error) {
//     res.json({ message: error });
//   }
// });


module.exports =router;