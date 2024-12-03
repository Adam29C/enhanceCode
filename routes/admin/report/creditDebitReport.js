const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const moment = require("moment");
const fundreq = require("../../../model/API/FundRequest");
const adminDetails = require("../../../model/dashBoard/AdminModel");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const admin = await adminDetails.find({}, { _id: 1, username: 1 });

        if (!admin || admin.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No admin details found.",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Credit Debit Report retrieved successfully.",
            adminDetail: admin,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
        });
    }
});

router.post("/report", authMiddleware, async (req, res) => {
    try {
        const { adminName, date, reqType, page = 1, limit = 10, searchKey = '' } = req.body;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
            return res.status(400).json({
                status: false,
                message: "Invalid pagination parameters. 'page' and 'limit' must be positive numbers.",
            });
        }

        // Accept both MM/DD/YYYY and DD/MM/YYYY formats
        let formattedDate = null;
        if (date) {
            const dateFormat1 = moment(date, "MM/DD/YYYY", true);
            const dateFormat2 = moment(date, "DD/MM/YYYY", true);

            if (dateFormat1.isValid()) {
                formattedDate = dateFormat1.format("DD/MM/YYYY");  // Convert to DD/MM/YYYY
            } else if (dateFormat2.isValid()) {
                formattedDate = dateFormat2.format("DD/MM/YYYY");  // Convert to DD/MM/YYYY
            } else {
                return res.status(400).json({
                    status: false,
                    message: "Invalid date format. Use MM/DD/YYYY or DD/MM/YYYY.",
                });
            }
        }

        // Construct the query
        const query = {
            ...(formattedDate ? { reqDate: formattedDate } : {}),
            ...(reqType ? { reqType } : {}),
            ...(adminName && adminName !== "0" ? { adminId: adminName } : {}),
        };

        if (searchKey) {
            const regexSearch = new RegExp(searchKey, 'i');
            query.$or = [
                { username: regexSearch },
                { reqAmount: regexSearch }
            ];
        }


        // Pagination logic
        const skip = (pageNumber - 1) * limitNumber;

        const [reportData, total] = await Promise.all([
            fundreq.find(query).skip(skip).limit(limitNumber),
            fundreq.countDocuments(query),
        ]);


        if (!reportData || reportData.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No report data found for the given criteria.",
            });
        }

        const totalPages = Math.ceil(total / limitNumber);

        return res.status(200).json({
            status: true,
            message: "Report data retrieved successfully.",
            data: reportData,
            pagination: {
                total,
                totalPages,
                currentPage: pageNumber,
                pageSize: limitNumber,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred. Please contact support.",
        });
    }
});




module.exports = router;