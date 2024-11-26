const router = require("express").Router();
const moment = require("moment")
const authMiddleware = require("../../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const [bankList, adminList] = await Promise.all([
            bank.find(),
            adminName.find({}, { username: 1 })
        ]);
        if (bankList.length === 0 && adminList.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No data found.",
            });
        }
        return res.status(200).json({
            status: true,
            message: "Fund Report fetched successfully.",
            title: "Fund Report",
            data: bankList,
            adminName: adminList,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the fund report. Please contact support.",
            error: error.message,
        });
    }
});

router.post("/", authMiddleware, async (req, res) => {
    const {
        sdate,
        edate,
        bankName,
        reqType,
        admin_id,
        page = 1,
        limit = 10,
        searchKey
    } = req.body;

    try {
        if (!sdate || !edate || !reqType) {
            return res.status(400).json({
                status: false,
                message: "Invalid input: 'sdate', 'edate', and 'reqType' are required.",
            });
        }

        const startDate0 = moment(sdate, "MM-DD-YYYY").format("DD/MM/YYYY");
        const endDate0 = moment(edate, "MM-DD-YYYY").format("DD/MM/YYYY");
        if (!moment(startDate0, "DD/MM/YYYY").isValid() || !moment(endDate0, "DD/MM/YYYY").isValid()) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format. Please use 'MM-DD-YYYY'.",
            });
        }

        const startDate = moment(startDate0, "DD/MM/YYYY").unix();
        const endDate = moment(endDate0, "DD/MM/YYYY").unix();

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        if (isNaN(pageNumber) || pageNumber <= 0 || isNaN(pageSize) || pageSize <= 0) {
            return res.status(400).json({
                status: false,
                message: "Invalid pagination parameters: 'page' and 'limit' must be positive integers.",
            });
        }

        let query = {
            reqType: reqType.charAt(0).toUpperCase() + reqType.slice(1).toLowerCase(), // Standardize 'reqType' case
            timestamp: {
                $gte: startDate,
                $lte: endDate,
            },
        };

        if (reqType.toUpperCase() === "CREDIT") {
            if (bankName !== "1") query.particular = bankName;
        } else {
            if (bankName !== "1") query.withdrawalMode = bankName;
            if (admin_id && admin_id !== "1") query.UpdatedBy = { $regex: admin_id };
        }

        if (searchKey) {
            const searchQuery = { $regex: searchKey, $options: "i" };
            query.$or = [
                { username: searchQuery },
                { mobile: searchQuery },
            ];
        }

        const totalRecords = await (reqType.toUpperCase() === "CREDIT" ? history : fundReport).countDocuments(query);

        const data = await (reqType.toUpperCase() === "CREDIT" ? history : fundReport)
            .find(query, {
                username: 1,
                mobile: 1,
                reqUpdatedAt: 1,
                withdrawalMode: 1,
                reqAmount: 1,
                UpdatedBy: 1,
            })
            .sort({ _id: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        const formattedData = reqType.toUpperCase() === "CREDIT"
            ? data.map(details => ({
                _id: details._id,
                reqAmount: details.transaction_amount,
                username: details.username,
                mobile: details.mobile,
                withdrawalMode: details?.particular,
                UpdatedBy: details.addedBy_name || "By self",
                reqUpdatedAt: details?.transaction_date,
            }))
            : data;

        if (data.length === 0) {
            return res.status(404).json({
                status: true,
                message: "No data found for the given criteria.",
                data: [],
                totalRecords,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalRecords / pageSize),
            });
        }

        return res.status(200).json({
            status: true,
            message: `${reqType} data fetched successfully.`,
            totalRecords,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalRecords / pageSize),
            data: formattedData,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching data. Please contact support.",
            error: error.message,
        });
    }
});

module.exports = router;



