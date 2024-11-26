const router = require("express").Router();
const version = require("../../../model/dashBoard/AppVersion");
const moment = require("moment");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const tempDir = path.join(__dirname, "../../../public/tempDirectory/");
        try {
            await fs.mkdir(tempDir, { recursive: true });
            cb(null, tempDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const originalname = file.originalname;
        const ext = originalname.split(".").pop();
        const filename = `Khatri-V${req.body.appVer}.${ext}`;
        cb(null, filename);
    },
});
const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
    try {
        const versionData = await version.findOne();

        if (!versionData) {
            return res.status(404).json({
                status: false,
                message: "Version data not found.",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Version settings retrieved successfully.",
            data: versionData,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
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
        let query = {};
        if (type == 1) {
            query = { forceUpdate: status, updatedOn: time };
        } else if (type == 2) {
            query = { maintainence: status, updatedOn: time };
        } else if (type == 3) {
            query = { appVersion: appVer, updatedOn: time };
        } else {
            return res.status(400).json({
                status: false,
                message: "Invalid type parameter.",
            });
        }
        if (file) {
            query["apkFileName"] = file.filename || file.originalname;

            const tempFilePath = path.join(__dirname, "../../../public/tempDirectory/", file.filename);
            const destinationDir = path.join(__dirname, "../../../public/apk/");
            const destinationFilePath = path.join(destinationDir, file.filename);

            try {
                await fs.mkdir(destinationDir, { recursive: true });

                const existingFiles = await fs.readdir(destinationDir);
                for (const existingFile of existingFiles) {
                    const fileToDelete = path.join(destinationDir, existingFile);
                    await fs.unlink(fileToDelete);
                }

                await fs.rename(tempFilePath, destinationFilePath);
            } catch (fileError) {
                return res.status(500).json({
                    status: false,
                    message: "Error processing the uploaded file.",
                });
            }
        }
        try {
            await version.updateOne({ _id: id }, { $set: query });
            return res.status(200).json({
                status: true,
                message: "App settings updated successfully.",
            });
        } catch (dbError) {
            return res.status(500).json({
                status: false,
                message: "An error occurred while updating the database.",
                error: dbError.message,
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An unexpected error occurred.",
            error: error.message,
        });
    }
});

module.exports = router;