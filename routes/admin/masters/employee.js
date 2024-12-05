const router = require("express").Router();
const empInsert = require("../../../model/dashBoard/AdminModel");
const authMiddleware = require("../../helpersModule/athetication");
const fetch = require("node-fetch");
const dateTime = require("node-datetime");
const bcrypt = require("bcryptjs");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { searchQuery, page = 1, limit = 10 } = req.body;

    let filter = { role: 1 };

    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { username: { $regex: searchQuery, $options: "i" } },
      ];

      if (
        searchQuery.toLowerCase() === "true" ||
        searchQuery.toLowerCase() === "false"
      ) {
        filter.loginStatus = searchQuery.toLowerCase() === "true";
      }
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const totalCount = await empInsert.countDocuments(filter);

    const empList = await empInsert
      .find(filter, { name: 1, username: 1, loginStatus: 1, banned: 1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    return res.status(200).json({
      status: true,
      message: "Employee list fetched successfully",
      data: empList,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalCount: totalCount,
      },
    });
  } catch (e) {
    res.json({
      status: false,
      message: "An error occurred while fetching the employee list.",
      error: e.message,
    });
  }
});

router.post("/updatePassword", authMiddleware, async function (req, res) {
  try {
    const { password, adminId } = req.body;

    if (!password || !adminId) {
      return res.json({
        status: false,
        message: "Both password and adminId are required.",
      });
    }

    const admin = await empInsert.findById(adminId);
    if (!admin) {
      return res.json({
        status: false,
        message: "Admin not found.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const update = await empInsert.updateOne(
      { _id: adminId },
      {
        $set: {
          password: hashedPassword,
        },
      }
    );

    if (update.modifiedCount === 0) {
      return res.json({
        status: false,
        message: "Password update failed. No changes made.",
      });
    }

    res.json({
      status: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    res.json({
      status: false,
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
});

router.post("/blockEmployee", authMiddleware, async (req, res) => {
  try {
    const { adminId, status } = req.body;

    if (!adminId || typeof status === "undefined") {
      return res.json({
        status: false,
        message: "Both adminId and status are required.",
      });
    }

    const bannedStatus = status === 1;

    await empInsert.updateOne(
      { _id: adminId },
      { $set: { banned: bannedStatus } }
    );

    let empList = await empInsert.find({ role: 1 });

    return res.json({
      status: true,
      message: bannedStatus ? "Blocked Successfully" : "Unblocked Successfully",
      //response: empList,
    });
  } catch (e) {
    console.log("Error: ", e);
    return res.json({
      status: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/empById/:id", authMiddleware, async function (req, res) {
  try {
    const empID = req.params.id;
    if (!empID) {
      return res.status(400).json({
        status: false,
        message: "empId is required",
      });
    }
    const findEmp = await empInsert.findOne({ _id: empID }, { password: 0 });
    return res.status(200).json({
      status: true,
      message: "Employee informition show successfully",
      data: findEmp,
    });
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: "Something Bad Happend Contact Support",
    });
  }
});

router.post("/updateEmployee", authMiddleware, async function (req, res) {
  try {
    const { id, colViewPermission, username, loginPermission } = req.body;
    if (!id || !colViewPermission || !username) {
      return res.status(400).json({
        status: false,
        message: "id,col_view_permission,username is required",
      });
    }
    const updatePermition = await empInsert.updateOne(
      { _id: id },
      { $set: { col_view_permission: colViewPermission, username } }
    );
    return res.status(200).json({
      status: true,
      message: "Permission Update Successfully",
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      message: "Internal Server Error",
    });
  }
});

router.post("/deleteEmp", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Employee ID is required.",
      });
    }

    const emp = await empInsert.findOne({ _id: id });

    if (!emp) {
      return res.status(404).json({
        status: false,
        message: "Employee not found.",
      });
    }

    await empInsert.deleteOne({ _id: id });

    return res.status(200).json({
      status: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);

    return res.status(500).json({
      status: false,
      message: "Server error. Please try again later.",
    });
  }
});

router.post("/createEmployee", authMiddleware, async function (req, res) {
  try {
    const {
      name,
      username,
      designation,
      password,
      colViewPermission,
      loginPermission,
      loginFor,
    } = req.body;
    if (
      !name ||
      !username ||
      !designation ||
      !password ||
      !colViewPermission ||
      (loginFor !== 0 && loginFor !== 1)
    ) {
      return res.status(400).json({
        status: false,
        message:
          "name, username,  designation, password, permission, loginFor fields are required and loginFor must be 0 (false) or 1 (true)",
      });
    }

    let checkEmp = await empInsert.findOne({
      username: username.toLowerCase().replace(/\s/g, ""),
    });

    if (checkEmp) {
      return res.status(400).json({
        status: false,
        message: "USERNAME ALREADY EXISTS",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const emp_data = new empInsert({
      name,
      password: hashedPassword,
      username: username.toLowerCase().replace(/\s/g, ""),
      designation,
      user_counter: 0,
      role: "1",
      banned: 1,
      loginStatus: "Offline",
      last_login: "null",
      col_view_permission: colViewPermission,
      loginFor,
    });

    await emp_data.save();

    return res.status(200).json({
      status: true,
      message: "Registered Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Server Error",
      error: error.message || "An unexpected error occurred",
    });
  }
});

router.get("/profileAdmin",authMiddleware, async (req, res) => {
  try {
    const empList = await empInsert.find({ role: 1 },{name:1,username:1,banned:1});
    return res.status(200).json({
      status: true,
      message: "Profile list show successfully",
      data: empList,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
