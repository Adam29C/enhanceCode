const router = require("express").Router();
const authMiddleware = require("../../helpersModule/athetication");
const moment = require("moment");
const history = require("../../../model/wallet_history");

router.post("/trakReport", authMiddleware, async (req, res) => {
    try {
        const { sdate, edate, page = 1, limit = 10, search = '' } = req.body;
        const skip = (page - 1) * limit;

        const startDate0 = moment(sdate, "MM-DD-YYYY").format("DD/MM/YYYY");
        const endDate0 = moment(edate, "MM-DD-YYYY").format("DD/MM/YYYY");
        const startDate = moment(startDate0, "DD/MM/YYYY").unix();
        const endDate = moment(endDate0, "DD/MM/YYYY").unix();

        let query = {
            timestamp: { $gte: startDate, $lte: endDate },
            particular: 'razorpay'
        };

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { transaction_amount: { $regex: search, $options: 'i' } },
                { transaction_id: { $regex: search, $options: 'i' } }
            ];
        }

        const totalItems = await history.countDocuments(query);

        const creditAmountDetails = await history.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ timestamp: 1 });

        const newArray = creditAmountDetails.map(details => ({
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
        return res.json({
            status: false,
            message: "Something Bad Happened, Contact Support",
        });
    }
});

module.exports = router;