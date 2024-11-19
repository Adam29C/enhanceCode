const router = require("express").Router();
const session = require("../../helpersModule/session");
const permission = require("../../helpersModule/permission");
const requestON = require("../../../model/Withdraw_Req_On_Off");
const dateTime = require("node-datetime");
const dt = dateTime.create();
const authMiddleware = require("../../helpersModule/athetication");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const reqdata = await requestON.find({ isRequest: false })
            .sort({ _id: 1 })
            .lean();
        return res.status(200).send({
            statusCode: 200,
            status: true,
            reqdata: reqdata
        });
    } catch (e) {
        res.status(500).json({
            status: false,
            message: "An error occurred while fetching data",
            error: e.message || e
        });
    }
});

router.post("/updateReq", authMiddleware, async (req, res) => {
    try {
        const { rowId, status, reason } = req.body;
        const date = dt.format("m/d/Y I:M:S");

        await requestON.updateOne(
            { _id: rowId },
            { $set: { message: reason, enabled: status, updatedAt: date } }
        );

        const updatedRequestList = await requestON.find({ isRequest: false }).lean();

        res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Request updated successfully",
            data: updatedRequestList
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            status: false,
            message: "An error occurred while updating the request.",
            error: error.message || error
        });
    }
});

router.get("/getWithdrawReqOnOff", authMiddleware, async (req, res) => {
    try {
        const requestONData = await requestON.findOne({ isRequest: true }).lean();
        if (!requestONData) {
            return res.status(404).send({
                statusCode: 404,
                status: "failure",
                message: "No active request found",
            });
        }
        return res.status(200).send({
            statusCode: 200,
            status: "Success",
            data: requestONData,
        });
    } catch (error) {
        console.error("Error fetching withdraw request:", error);
        return res.status(500).send({
            statusCode: 500,
            status: "failure",
            message: "Internal Server Error",
            error: error.message,
        });
    }
});

router.post("/withdrawReqOnOff", authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, requestCount } = req.body;

        if (!startDate || !endDate || !requestCount) {
            return res.status(400).send({
                statusCode: 400,
                status: "failure",
                message: "startDate, endDate, and requestCount are required",
            });
        }

        const updateObj = {
            startTime: startDate,
            endTime: endDate,
            requestCount: requestCount,
            isRequest: true,
        };
        const result = await requestON.findOneAndUpdate(
            { isRequest: true },
            updateObj,
            { new: true, upsert: true }
        );

        return res.status(200).send({
            statusCode: 200,
            status: "Success",
            message: "Withdraw Request On/Off successfully",
            data: result,
        });
    } catch (error) {
        return res.status(500).send({
            statusCode: 500,
            status: "failure",
            message: "Internal Server Error",
            error: error.message,
        });
    }
});

module.exports = router;