const router = require("express").Router();
const Bank = require("../../../model/bank");
// const session = require("../helpersModule/session");
// const permission = require("../helpersModule/permission");
// const revert = require("../../model/revertPayment");
// const transaction = require("../../model/transactionON-OFF");
const UPI_ID = require("../../../model/upi_ids");
const dateTime = require("node-datetime");
const SendOtp = require("sendotp");
// const sendOtp = new SendOtp("290393AuGCyi6j5d5bfd26");
const sendOtp = new SendOtp("1207171791436302472");

// router.post("/OTPsend", async (req, res) => {
// 	const userInfo = req.session.details;
// 	let mobile = userInfo.mobile;

// 	res.json({
// 		status: 1,
// 		message: "success",

// 	});

// 	// sendOtp.send(`+91${mobile}`, "DGAMES", function (error, data) {
// 	// 	res.json({
// 	// 		status: 1,
// 	// 		message: "success",
// 	// 		data: data,
// 	// 	});
// 	// });
// });

// router.get("/", session, permission, async (req, res) => {
// 	try {
// 		const bank = await Bank.find();
// 		const userInfo = req.session.details;
// 		const permissionArray = req.view;

// 		const check = permissionArray["bank"].showStatus;
// 		if (check === 1) {
// 			res.render("./masters/bank", {
// 				data: bank,
// 				userInfo: userInfo,
// 				permission: permissionArray,
// 				title: "Bank",
// 			});
// 		} else {
// 			res.render("./dashboard/starterPage", {
// 				userInfo: userInfo,
// 				permission: permissionArray,
// 				title: "Dashboard",
// 			});
// 		}
// 	} catch (e) {
// 		res.json({ message: e });
// 	}
// });

router.get("/", async (req, res) => {
  try {
    const bank = await UPI_ID.find();
    if (!bank || bank.length === 0) {
      return res.status(404).json({ message: "No UPI records found" });
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

router.post("/blockUnblock", async (req, res) => {
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

router.get("/fundMode", async (req, res) => {
  try {
    const list = await transaction.find();
  } catch (e) {
    res.json({ message: e });
  }
});

router.post("/registerbank", async (req, res) => {
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

router.post("/upiAdd", async (req, res) => {
  try {
    let { upiId, status, merchantName } = req.body;
    if (status == "true") {
      const findActiveUpi = await UPI_ID.findOne({ is_Active: true });
      if (findActiveUpi) {
        return res.json({
          status: 0,
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

router.post("/disable_upi", async (req, res) => {
  try {
    const id = req.body.id;
    const status = req.body.status;
    const updateCol = req.body.stat;
    let query = { is_Active: status };

    if (status == "true") {
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
      status: true,
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

router.post("/dlt_upi", async (req, res) => {
  try {
    const id = req.body.id;
    const bank = await UPI_ID.deleteOne({ _id: id });
    res.json({
      status: true,
      message: "UPI ID Deleted Succesfully",
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

router.post("/dltBank", async (req, res) => {
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

router.post("/modeAdd", async (req, res) => {
  try {
    let { mode, status, urlWeb } = req.body;

    if (urlWeb == "") {
      urlWeb = null;
    }

    const data = new transaction({
      mode: mode,
      disabled: status,
      redirectURL: urlWeb,
    });

    await data.save();

    res.json({
      status: true,
      message: "Added",
    });
  } catch (e) {
    res.json({ status: flase, message: e.toString() });
  }
});

router.post("/disable_mode", async (req, res) => {
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

router.post("/dlt_mode", async (req, res) => {
  try {
    const id = req.body.id;
    await transaction.deleteOne({ _id: id });
    res.json({
      status: true,
      message: "Mode Deleted Succesfully",
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Server Error Contact Support",
      err: JSON.stringify(e),
    });
  }
});

router.get("/upiList", async (req, res) => {
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
