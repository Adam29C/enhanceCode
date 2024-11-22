const router = require("express").Router();
const WalletContact = require("../../../model/appSetting/WalletContact");

router.get("/", async (req, res) => {
  try {
    const response = await WalletContact.aggregate([
      {
        $project: { number: 1 }, // Only project the 'number' field
      },
    ]);

    if (response.length === 0) {
      return res.status(404).send({
        status: false,
        message: "No contact numbers found",
      });
    }

    return res.status(200).send({
      status: true,
      message: "Contact numbers fetched successfully",
      data: response,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.post("/updatewalletContact", async (req, res) => {
  try {
    const { id, number } = req.body;
    if (!id || !number) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: id or number",
      });
    }

    const result = await WalletContact.updateOne(
      { _id: id },
      { $set: { number } }
    );

    if (result.nModified === 0) {
      return res.status(404).json({
        status: false,
        message: "Wallet contact not found or no changes made",
      });
    }

    const updatedWalletContact = await WalletContact.findOne({ _id: id });

    return res.status(200).json({
      status: true,
      message: "Wallet contact updated successfully",
      data: updatedWalletContact,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.get("/headLine", async (req, res) => {
  try {
    const response = await WalletContact.aggregate([
      {
        $project: { headline: 1 },
      },
    ]);

    if (response.length === 0) {
      return res.status(404).send({
        status: false,
        message: "No contact headline found",
      });
    }

    return res.status(200).send({
      status: true,
      message: "Contact headline fetched successfully",
      data: response,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.post("/updateHeadline", async (req, res) => {
  try {
    const { id, headline } = req.body;
    if (!id || !headline) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: id or headline",
      });
    }

    const result = await WalletContact.updateOne(
      { _id: id },
      { $set: { headline } }
    );

    if (result.nModified === 0) {
      return res.status(404).json({
        status: false,
        message: "Wallet headline not found or no changes made",
      });
    }

    const updatedheadline = await WalletContact.findOne(
      { _id: id },
      { headline: 1 }
    );

    return res.status(200).json({
      status: true,
      message: "Wallet headline updated successfully",
      data: updatedheadline,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.get("/upi", async (req, res) => {
  try {
    const response = await WalletContact.aggregate([
      {
        $project: { upiId: 1 },
      },
    ]);

    if (response.length === 0) {
      return res.status(404).send({
        status: false,
        message: "No contact upiId found",
      });
    }

    return res.status(200).send({
      status: true,
      message: "Contact upiId fetched successfully",
      data: response,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.post("/updateUpiId", async (req, res) => {
  try {
    const { id, upi } = req.body;
    if (!id || !upi) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: id or upi",
      });
    }

    const result = await WalletContact.updateOne(
      { _id: id },
      { $set: { upiId:upi } }
    );

    if (result.nModified === 0) {
      return res.status(404).json({
        status: false,
        message: "Wallet upi not found or no changes made",
      });
    }

    const updatedUpi = await WalletContact.findOne(
      { _id: id },
      { upi: 1 }
    );

    return res.status(200).json({
      status: true,
      message: "Wallet upi updated successfully",
      data: updatedUpi,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = router;
