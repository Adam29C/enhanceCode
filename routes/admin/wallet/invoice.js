const express = require("express");
const router = express.Router();
const changeHistory = require("../../../model/API/Profile")
const authMiddleware = require("../../helpersModule/athetication");

router.post("/profileChange", authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 50;  // perPage ko limit se replace kiya
        const page = parseInt(req.body.page) || 1;
        const searchQuery = req.body.search || "";
        
        const searchFilter = {
            changeDetails: { $exists: true, $ne: [] },
            ...(searchQuery && {
                $or: [
                    { username: { $regex: searchQuery, $options: "i" } },
                    { account_no: { $regex: searchQuery, $options: "i" } },
                    { bank_name: { $regex: searchQuery, $options: "i" } },
                    { ifsc_code: { $regex: searchQuery, $options: "i" } },
                    { account_holder_name: { $regex: searchQuery, $options: "i" } },
                ],
            }),
        };

        const records = await changeHistory
            .find(searchFilter)
            .skip(limit * (page - 1))  // perPage ko limit se replace kiya
            .limit(limit);  // perPage ko limit se replace kiya

        const totalCount = await changeHistory.countDocuments(searchFilter);

        return res.status(200).json({
            statusCode: 200,
            status: true,
            records,
            current: page,
            pages: Math.ceil(totalCount / limit),  // perPage ko limit se replace kiya
            count: totalCount,
            showEntry: limit * page,  // perPage ko limit se replace kiya
            title: "Invoices",
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message || "Something went wrong",
        });
    }
});


router.post("/getHistory", authMiddleware, async (req, res) => {
    try {
        const { row_id } = req.body;

        if (!row_id) {
            return res.status(400).json({
                status: false,
                message: "Row ID is required",
            });
        }
        const data = await changeHistory.findOne({ _id: row_id }, { changeDetails: 1 });
        if (!data) {
            return res.status(404).json({
                status: false,
                message: "No history found for the provided ID",
            });
        }
        return res.status(200).json({
            status: true,
            data: data,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Contact Support",
            error: error.message || "Internal Server Error",
        });
    }
});

module.exports = router;