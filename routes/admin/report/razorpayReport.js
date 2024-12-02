const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const moment = require("moment");
const trakpay = require("../../../model/onlineTransaction");

router.post("/razorpayReport", authMiddleware, async (req, res) => {
    try {
        const { sdate, edate, page = 1, limit = 10, search = '' } = req.body;
        const skip = (page - 1) * limit;

        const startDate0 = moment(sdate, "MM-DD-YYYY");
        const endDate0 = moment(edate, "MM-DD-YYYY");

        // Check if the dates are valid
        if (!startDate0.isValid() || !endDate0.isValid()) {
            return res.json({
                status: false,
                message: "Invalid date format. Please use MM-DD-YYYY."
            });
        }

        // Format to "DD/MM/YYYY"
        const startDateFormatted = startDate0.format("DD/MM/YYYY");
        const endDateFormatted = endDate0.format("DD/MM/YYYY");

        // Convert to Unix timestamps
        const startDate = startDate0.unix();
        const endDate = endDate0.unix();

        if (isNaN(startDate) || isNaN(endDate)) {
            return res.json({
                status: false,
                message: "Invalid date range."
            });
        }

        let query = {
            //Uncomment this line if you want to filter by timestamp
            timestamp: { $gte: startDate, $lte: endDate },
            reqStatus: 0,
            mode: 'razorpay'
        };

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { transaction_amount: { $regex: search, $options: 'i' } },
                { transaction_id: { $regex: search, $options: 'i' } }
            ];
        }

        const totalItems = await trakpay.countDocuments(query);
        const reportData = await trakpay.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 });

        const newArray = reportData.map(details => ({
            username: details.username,
            mobile: details.mobile,
            reqAmount: details.transaction_amount,
            reqDate: details.transaction_date,
            transaction_id: details.transaction_id,
        }));

        return res.json({
            status: true,
            message: "Success",
            data: newArray,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
        });

    } catch (error) {
        console.error("Error fetching razorpay report:", error);
        return res.json({
            status: false,
            message: "Something Bad Happened, Contact Support",
        });
    }
});


module.exports = router;