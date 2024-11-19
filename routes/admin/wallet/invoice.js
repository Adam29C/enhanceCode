const express = require("express");
const router = express.Router();
const changeHistory = require("../../../model/API/Profile")
const authMiddleware = require("../../helpersModule/athetication");

router.get("/profileChange", authMiddleware, async (req, res) => {
    try {
        const perPage = parseInt(req.query.perPage) || 50;
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search || "";

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
            .skip(perPage * (page - 1))
            .limit(perPage);

        const totalCount = await changeHistory.countDocuments(searchFilter);

        return res.status(200).json({
            statusCode: 200,
            status: true,
            data: resultArray,
            records,
            current: page,
            pages: Math.ceil(totalCount / perPage),
            count: totalCount,
            showEntry: perPage * page,
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