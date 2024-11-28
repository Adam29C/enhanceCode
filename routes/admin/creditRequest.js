const router = require("express").Router();
const UPIlist = require("../../model/API/upiPayments");
const moment = require("moment");
const authMiddleware = require("../helpersModule/athetication");

router.get("/creditUPI",authMiddleware, async (req, res) => {
    try {
        const { date_cust, page = 1, limit = 10, search } = req.query;
        const currentDate = moment().format("DD/MM/YYYY"); // Using moment to get current date
        const dateToUse = date_cust ? moment(date_cust, "MM/DD/YYYY").format("DD/MM/YYYY") : currentDate;
        const skip = (page - 1) * limit;

        const query = {
            reqDate: dateToUse,
            $and: [
                { $or: [{ reqStatus: "submitted" }, { reqStatus: "pending" }] }
            ]
        };

        if (search) {
            const normalizedSearch = search.startsWith("+91") ? search : "+91" + search;
            query.$and.push({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { username: { $regex: search, $options: "i" } },
                    { mobile: { $regex: normalizedSearch, $options: "i" } },
                    { reqStatus: { $regex: search, $options: "i" } }
                ]
            });
        }

        const report = await UPIlist.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .exec();

        const totalCount = await UPIlist.countDocuments(query);

        return res.status(200).json({
            status: true,
            message: "Report fetched successfully.",
            approvedData: report,
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            limit: parseInt(limit),
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching the report. Please contact support.",
            error: error.message,
        });
    }
});

module.exports = router;
