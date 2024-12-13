const router = require("express").Router();
const moment = require("moment")
const authMiddleware = require("../../helpersModule/athetication");
const abProvider = require("../../../model/AndarBahar/ABProvider");
const abBids = require("../../../model/AndarBahar/ABbids");
const abProviderSetting = require("../../../model/AndarBahar/ABAddSetting")
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

router.get("/andarBahar", authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        const providerData = await abProvider.find().sort({ _id: 1 }).skip(skip).limit(limit);

        if (!providerData || providerData.length === 0) {
            return res.status(400).json({
                status: false,
                message: "No provider data found.",
                data: [],
            });
        }

        const totalItems = await abProvider.countDocuments();

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            status: true,
            message: "Sales Report fetched successfully.",
            data: providerData,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while fetching provider data. Please contact support.",
            error: error.message,
        });
    }
});

router.post("/userReportAB", authMiddleware, async (req, res) => {
    try {
        const { userId, gameId, startDate, endDate, page = 1, limit = 10 } = req.body;

        if (!startDate || !endDate || !moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({ 
                status: false, 
                message: "Invalid startDate or endDate format" 
            });
        }

        const dayOfWeek = moment().format("dddd");

        const gameSettings = await abProviderSetting
            .find({ gameDay: dayOfWeek, isClosed: "1" }, { providerId: 1, OBT: 1, _id: 0 });

        const providerList = await abProvider.find();

        const arrangedProviderList = gameSettings
            .map(game => providerList.find(provider => provider._id.toString() === game.providerId.toString()))
            .filter(Boolean);

        const fetchBidsData = async (providerId, userName = null) => {
            const matchCriteria = {
                providerId: new ObjectId(providerId),
                gameDate: { $gte: startDate, $lte: endDate },
            };
            if (userName) matchCriteria.userName = userName;

            const [result] = await abBids.aggregate([
                { $match: matchCriteria },
                {
                    $group: {
                        _id: null,
                        GameWinPoints: { $sum: "$gameWinPoints" },
                        BiddingPoints: { $sum: "$biddingPoints" },
                    },
                },
            ]);

            return result || { GameWinPoints: 0, BiddingPoints: 0 };
        };

        const processProvider = async (providerData, index) => {
            const bidData = await fetchBidsData(providerData._id, userId);
            return {
                index,
                GameWinPoints: bidData.GameWinPoints,
                BiddingPoints: bidData.BiddingPoints,
                providerName: providerData.providerName,
            };
        };

        let finalResult = [];
        if (gameId === "0") {
            finalResult = await Promise.all(
                arrangedProviderList.map((providerData, index) => processProvider(providerData, index))
            );
        } else {
            const providerData = await abProvider.findOne({ _id: new ObjectId(gameId) }, { providerName: 1 });
            if (!providerData) {
                return res.status(404).json({ 
                    status: false, 
                    message: "Game not found" 
                });
            }

            const result = await processProvider(providerData, 0);
            finalResult.push(result);
        }

        finalResult.sort((a, b) => a.index - b.index);

        const skip = (page - 1) * limit;
        const totalItems = finalResult.length;
        const totalPages = Math.ceil(totalItems / limit);

        const paginatedResult = finalResult.slice(skip, skip + limit);
        
        if(paginatedResult.length===0){
            return res.json({ 
                status: true, 
                message: "Report generated successfully", 
                data: paginatedResult,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit,
                }
            });
        }


        return res.json({ 
            status: true, 
            message: "Report generated successfully", 
            data: paginatedResult,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "An error occurred while generating the report. Please contact support.",
            error: error.message,
        });
    }
});

module.exports = router;