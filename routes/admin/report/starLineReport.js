const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const starProvider = require("../../../model/starline/Starline_Provider");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const providerData = await starProvider.find().sort({ _id: 1 });

        if (!providerData || providerData.length === 0) {
            return res.status(400).json({
                status: false,
                message: "No provider data found.",
                data: [],
            });
        }

        return res.status(200).json({
            status: true,
            message: "Sales Report fetched successfully.",
            data: providerData,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching provider data. Please contact support.",
            error: error.message,
        });
    }
});