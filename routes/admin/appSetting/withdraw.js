const express =require("express");
const router = require("express").Router();
const withDraw = require("../../../model/withDrawMessage");

router.get('/',async (req, res)=>{
    try {
        const data = await withDraw.findOne({});
        res.json({
                status: true,
                message: "Info show Successfully",
                data: data
            });
    }
    catch (e) {
        res.status(400).send(
            {
                status: false,
                message: 'Something Happened Please Contact the Support',
                error: e
            });
    }
});


module.exports = router;
