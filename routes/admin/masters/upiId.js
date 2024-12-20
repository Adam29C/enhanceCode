const router = require("express").Router();
const Bank = require("../../../model/bank");

const transaction = require("../../../model/transactionON-OFF");
const UPI_ID = require("../../../model/upi_ids");
const dateTime = require("node-datetime");
const SendOtp = require("sendotp");
const sendOtp = new SendOtp("1207171791436302472");
const PaymentModes = require("../../../model/payments/pamentModeModel");
const authMiddleware = require("../../helpersModule/athetication");

router.get("/",authMiddleware, async (req, res) => {
  try {
    const bank = await UPI_ID.find();
    if (!bank || bank.length === 0) {
      return res.status(404).json({ 
        status: false, 
        message: "No UPI records found" 
      });
    }

    res.status(200).json({
      status: true,
      message: "UPI records fetched successfully",
      data: bank,
    });
  } catch (e) {
    res.status(500).json({
      status: false,
      message: "An error occurred while fetching UPI records",
      error: e.message,
    });
  }
});

router.post("/upiAdd",authMiddleware,async (req, res) => {
  try {
    let { upiId, status, merchantName } = req.body;
    if (status === true) {
      const findActiveUpi = await UPI_ID.findOne({ is_Active: true });
      if (findActiveUpi) {
        return res.json({
          status: false,
          message:
            "Another UPI ID is already active. Please deactivate it first.",
        });
      }
    }
    const dt = dateTime.create();
    const reqDate = dt.format("d/m/Y I:M:S");
    const upiDetails = new UPI_ID({
      UPI_ID: upiId,
      is_Active: status,
      updated_at: reqDate,
      merchantName: merchantName,
    });
    const updatedData = await upiDetails.save();
    res.json({
      status: true,
      message: "UPI ID ADDED SUCCESSFULLY",
      data: updatedData,
    });
  } catch (e) {
    res.json({ statusCode: 500, status: "failure", message: e.toString() });
  }
});

router.post("/blockUnblock",authMiddleware, async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || status === undefined) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: 'id' and 'status'.",
      });
    }

    if (
      typeof status !== "boolean" &&
      !["active", "inactive"].includes(status)
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid status. Status must be a boolean or 'active'/'inactive'.",
      });
    }

    const bank = await Bank.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          status: status,
        },
      },
      { new: true }
    );

    if (!bank) {
      return res.status(404).json({
        status: false,
        message: "Bank not found with the provided ID.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Bank status updated successfully.",
      data: bank,
    });
  } catch (e) {
    return res.status(500).json({
      status: flase,
      message: "An error occurred while updating the bank status.",
      error: e.message || "Unknown error",
    });
  }
});

router.post("/disable_upi",authMiddleware, async (req, res) => {
  try {
    const id = req.body.id;
    const status = req.body.status;
    const updateCol = req.body.stat;
    let query = { is_Active: status };

    // Check if any UPI ID is already active only when enabling a new one
    if (status == true) {
      const findActiveUpi = await UPI_ID.findOne({ is_Active: true });
      if (findActiveUpi) {
        return res.json({
          status: 0,
          message:
            "Another UPI ID is already active. Please deactivate it first.",
        });
      }
    }

    if (updateCol == 2) {
      query = { is_Active_chat: status };
    }

    const bank = await UPI_ID.findOneAndUpdate(
      { _id: id },
      {
        $set: query,
      },
      { returnOriginal: false }
    );
    res.json({
      status: 1,
      message: status
        ? "UPI ID Activated Successfully"
        : "UPI ID Deactivated Successfully",
      data: bank,
    });
  } catch (e) {
    res.json({
      status: 0,
      message: "Server Error Contact Support",
      err: JSON.stringify(e),
    });
  }
});

router.patch("/updatePaymentMode",authMiddleware, async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id) {
      res.status(400).send({
        statusCode: 400,
        message: "id required",
      });
    }
    if (status == "active") {
      const findActiveUpi = await PaymentModes.findOne({ status: "active" });
      if (findActiveUpi) {
        return res.json({
          status: 0,
          message:
            "Another Payment mode is already active. Please deactivate it first.",
        });
      }
    }
    const findMode = await PaymentModes.findOne({ _id: id });
    if (!findMode) {
      res.status(404).send({
        statusCode: 404,
        message: "Payment mode not found",
      });
    }
    const paymentUpdate = await PaymentModes.updateOne(
      { _id: findMode._id },
      { $set: { status: status } }
    );
    res.status(200).send({
      statusCode: 200,
      message: "Payment mode updated successfully",
    });
  } catch (error) {
    res.status(500).send({
      statusCode: 500,
      message: "Something went wrong",
      error: error.message,
    });
  }
});

router.get("/fundMode", async (req, res) => {
  try {
    const list = await transaction.find();

    res.json({
      status: true,
      message: "Fund modes fetched successfully",
      data: list,
    });
  } catch (e) {
    res.json({
      status: false,
      message: "An error occurred while fetching fund modes. Please try again.",
    });
  }
});

router.post("/registerbank",authMiddleware, async (req, res) => {
  try {
    const { bankName, status } = req.body;

    // Validate that required fields are provided
    if (!bankName || status === undefined) {
      return res.status(400).json({
        status: flase,
        message: "Bank name and status are required.",
      });
    }

    // Validate that status is either 0 (Active) or 1 (Disabled)
    if (![0, 1].includes(status)) {
      return res.status(400).json({
        status: flase,
        message:
          "Invalid status. Please provide 0 for Active or 1 for Disabled.",
      });
    }

    // Check if the bank name already exists in the database
    const existingBank = await Bank.findOne({ bankName });
    if (existingBank) {
      return res.status(400).json({
        status: false,
        message: "Bank with this name already exists.",
      });
    }

    // Create new bank entry
    const BankDetails = new Bank({
      bankName,
      status,
    });

    const data = await BankDetails.save();

    return res.status(201).json({
      status: true,
      message: "Bank registered successfully.",
      data: data,
    });
  } catch (e) {
    return res.status(500).json({
      status: flase,
      message: "An error occurred while registering the bank.",
      error: e.message || "Unknown error",
    });
  }
});

router.post("/dlt_upi",authMiddleware, async (req, res) => {
  try {
    const id = req.body.id;

    const bank = await UPI_ID.deleteOne({ _id: id });

    // Respond with success or failure based on delete result
    if (bank.deletedCount === 1) {
      res.json({
        status: true,
        message: "UPI ID Deleted Successfully",
        data: bank,
      });
    } else {
      res.json({
        status: false,
        message: "UPI ID not found or could not be deleted",
        data: bank,
      });
    }
  } catch (e) {
    res.json({
      status: false,
      message: "Server Error, Contact Support",
      err: JSON.stringify(e),
    });
  }
});

router.post("/dltBank",authMiddleware, async (req, res) => {
  try {
    const id = req.body.id;
    const bank = await Bank.deleteOne({ _id: id });
    res.json({
      status: true,
      message: "Bank Deleted Succesfully",
      data: bank,
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Server Error Contact Support",
      err: JSON.stringify(e),
    });
  }
});

router.post("/modeAdd",authMiddleware, async (req, res) => {
  try {
    let { mode, status, urlWeb } = req.body;

    if (!mode) {
      return res.json({
        status: false,
        message: "Mode is required.",
      });
    }

    if (status !== true && status !== false) {
      return res.json({
        status: false,
        message: "Status must be a boolean value.",
      });
    }

    if (urlWeb === "") {
      urlWeb = null;
    }

    const existingMode = await transaction.findOne({ mode });
    if (existingMode) {
      return res.json({
        status: false,
        message: "This mode already exists.",
      });
    }

    const data = new transaction({
      mode,
      disabled: status,
      redirectURL: urlWeb,
    });

    const savedData = await data.save();

    res.json({
      status: true,
      message: "Mode added successfully",
      data: savedData, 
    });
  } catch (e) {
    console.error("Error in modeAdd:", e); 
    res.json({
      status: false,
      message: "An error occurred while adding the mode. Please try again.",
    });
  }
});


router.post("/disable_mode",authMiddleware, async (req, res) => {
  try {
    const id = req.body.id;
    const status = req.body.status;
    await transaction.updateOne(
      { _id: id },
      {
        $set: {
          disabled: status,
        },
      }
    );
    res.json({
      status: true,
      message: "Add Fund Mode Disabled Succesfully",
    });
  } catch (e) {
    res.json({
      status: flase,
      message: "Server Error Contact Support",
      err: JSON.stringify(e),
    });
  }
});

router.post("/dlt_mode",authMiddleware, async (req, res) => {
  try {
    const id = req.body.id;

    if (!id) {
      return res.json({
        status: false,
        message: "ID is required.",
      });
    }
    await transaction.deleteOne({ _id: id });

    res.json({
      status: true,
      message: "Mode Deleted Successfully",
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Server Error Contact Support",
      err: JSON.stringify(e),
    });
  }
});


router.get("/upiList",authMiddleware, async (req, res) => {
  try {
    const upiList = await UPI_ID.find();
    let upiLists = [];
    if (upiList.length > 0) {
      upiLists = upiList;
    }
    res.json({
      status: true,
      message: "Mode Deleted Succesfully",
      data: upiLists,
    });
  } catch (e) {
    res.json({ message: e });
  }
});

module.exports = router;
