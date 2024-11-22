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
        const { type, id, status, appVer } = req.body;
        const file = req.file;
        const time = moment().format("DD/MM/YYYY HH:mm:ss a");

        // Validate the required fields
        if (!type || !id) {
            return res.status(400).json({
                status: "Failure",
                message: "Missing required fields: type or id"
            });
        }

        let query = {};
        
        // Based on the 'type', set the appropriate fields in the query
        if (type == 1) { // force update
            if (status === undefined) {
                return res.status(400).json({
                    status: "Failure",
                    message: "Status is required for force update"
                });
            }
            query = { forceUpdate: status, updatedOn: time };
        } else if (type == 2) { // maintenance
            if (status === undefined) {
                return res.status(400).json({
                    status: "Failure",
                    message: "Status is required for maintenance"
                });
            }
            query = { maintainence: status, updatedOn: time };
        } else if (type == 3) { // app version
            if (!appVer) {
                return res.status(400).json({
                    status: "Failure",
                    message: "App version is required"
                });
            }
            query = { appVersion: appVer, updatedOn: time };
        } else {
            return res.status(400).json({
                status: "Failure",
                message: "Invalid type. Valid types are 1, 2, or 3."
            });
        }

        // Handle the file upload
        if (file) {
            // Validate file type (optional)
            const allowedExtensions = ['apk'];
            const fileExtension = path.extname(file.originalname).toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                return res.status(400).json({
                    status: "Failure",
                    message: "Invalid file type. Only APK files are allowed."
                });
            }

            query.apkFileName = file.originalname;

            // Move the file to the target directory
            const filePath = path.join(__dirname, "../../public/tempDirectory/", file.filename);
            const destinationDir = path.join(__dirname, "../../public/apk/");
            await fs.mkdir(destinationDir, { recursive: true });

            // Optionally clean up old files before moving new one
            const filesInDestination = await fs.readdir(destinationDir);
            for (const fileInDest of filesInDestination) {
                await fs.unlink(path.join(destinationDir, fileInDest));
            }

            const destinationPath = path.join(destinationDir, file.filename);
            await fs.rename(filePath, destinationPath);
        }

        // Update the version data in the database
        const updateResult = await version.updateOne({ _id: id }, { $set: query });

        if (updateResult.nModified === 0) {
            return res.status(404).json({
                status: "Failure",
                message: "No matching version settings found to update."
            });
        }

        return res.status(200).json({
            status: "Success",
            message: "App settings updated successfully.",
            data: updateResult
        });

    } catch (error) {
        console.error("Error updating app settings:", error);
        return res.status(500).json({
            status: "Failure",
            message: "An error occurred while updating the app settings.",
            error: error.message
        });
    }
});

module.exports =router;