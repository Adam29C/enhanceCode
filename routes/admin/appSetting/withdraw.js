const express = require("express");
const router = require("express").Router();
const withDraw = require("../../../model/withDrawMessage");

router.get("/", async (req, res) => {
  try {
    const data = await withDraw.findOne({});
    return res.status(200).send({
      status: true,
      message: "Info show Successfully",
      data: data,
    });
  } catch (e) {
    return res.status(400).send({
      status: false,
      message: "Something Happened Please Contact the Support",
      error: e,
    });
  }
});

router.post("/updateWithdraw", async (req, res) => {
  try {
    const { id, timing, number, sec_title, pri_title } = req.body;

    // Validate input fields
    if (!id || !timing || !number || !sec_title || !pri_title) {
      return res.status(400).send({
        status: false,
        message: "Missing required fields",
      });
    }

    const filter = { _id: id };
    const update = {
      textMain: pri_title,
      textSecondry: sec_title,
      Number: number,
      Timing: timing,
    };

    let doc = await withDraw.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true, 
    });

    if (!doc) {
      return res.status(404).send({
        status: false,
        message: "Document not found or could not be created",
      });
    }

    return res.status(200).send({
      status: true,
      message: "Info updated successfully",
      data: doc, 
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = router;
