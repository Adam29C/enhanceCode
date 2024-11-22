const router = require("express").Router();
const version = require("../../../model/dashBoard/AppVersion");
const moment = require("moment");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'public/apk/')
//     },
//     filename: function (req, file, cb) {
//         let originalname = file.originalname;
//         let ext = originalname.split('.')[1];
//         let filename = `${file.fieldname}-${Date.now()}.${ext}`;
//       cb(null, filename)
//     }
//   });

// const upload = multer({ storage: storage })

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const tempDir = path.join(__dirname, "../../public/tempDirectory/");
    await fs.mkdir(tempDir, { recursive: true }); // Ensure directory exists
    cb(null, tempDir); // Temporary storage directory
  },
  filename: function (req, file, cb) {
    let originalname = file.originalname;
    let ext = originalname.split(".").pop();
    let filename = `Khatri-V${req.body.appVer}.${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });
router.get("/", async (req, res) => {
    try {
        const versionData = await version.findOne(); // Fetch version data from the database
        
        if (!versionData) { // Check if no version data was found
            return res.status(404).json({
                status: "Failure",
                message: "Version data not found.",
            });
        }

        // If version data is found, send the response
        return res.status(200).json({
            status: "Success",
            message: "Version settings retrieved successfully.",
            data: versionData,
        });
        
    } catch (error) {
        console.error("Error fetching version data:", error);
        return res.status(500).json({
            status: "Failure",
            message: "An error occurred while fetching the version data.",
            error: error.message,
        });
    }
});

router.post("/updateAppSet", upload.single("apk"), async (req, res) => {
    try {
      const file = req.file;
      const type = req.body.type;
      const time = moment().format("DD/MM/YYYY HH:mm:ss a");
      const id = req.body.id;
      let query = "";
  
      if (type == 1) {
        const status = req.body.status;
        query = { forceUpdate: status, updatedOn: time };
        if (file && file.originalname) {
          query["apkFileName"] = file.originalname;
        }
      } else if (type == 2) {
        const status = req.body.status;
        query = { maintainence: status, updatedOn: time };
        if (file && file.originalname) {
          query["apkFileName"] = file.originalname;
        }
      } else if (type == 3) {
        const status = req.body.appVer;
        query = { appVersion: status, updatedOn: time };
        if (file && file.filename) {
          query["apkFileName"] = file.filename;
        }
      }
  
      if (file && file.filename) {
        const filePath = path.join(
          __dirname,
          "../../public/tempDirectory/",
          file.filename
        );
        const destinationDir = path.join(__dirname, "../../public/apk/");
        await fs.mkdir(destinationDir, { recursive: true });
        const files = await fs.readdir(destinationDir);
        for (const file of files) {
          await fs.unlink(path.join(destinationDir, file));
        }
        const destinationPath = path.join(destinationDir, file.filename);
        await fs.rename(filePath, destinationPath);
      }
      const user = await version.updateOne({ _id: id }, { $set: query });
      // res.status(200).json({
      //   status: 1,
      //   message: "Updated",
      //   data: user
      // });
      res.redirect("/appSettings/versionSetting");
    } catch (e) {
      res.json(e);
    }
  })

module.exports =router;