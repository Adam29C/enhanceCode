const router = require("express").Router();
const Notice = require("../../../model/appSetting/NoticeBoard");

router.get("/", async (req, res) => {
  try {
    // Fetch all notices from the database
    const find = await Notice.find();

    // Send a success response with the retrieved data
    return res.status(200).json({
      status: true,
      message: "Notice Board Show Successfully",
      data: find, // data from the database
    });
  } catch (error) {
    console.error("Error fetching notice board:", error.message);

    // Send an error response if something goes wrong
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.post("/updateNotice", async (req, res) => {
    try {
      // Destructure the fields from the request body
      const {
        id,
        title1,
        title2,
        title3,
        desc1,
        desc2,
        desc3,
        contact,
      } = req.body;
  
      // Validate the input fields
      if (!id || !title1 || !title2 || !title3 || !desc1 || !desc2 || !desc3 || !contact) {
        return res.status(400).json({
          status: false,
          message: "Missing required fields",
        });
      }
  
      // Update the notice in the database
      const result = await Notice.updateOne(
        { _id: id },
        {
          $set: {
            title1,
            title2,
            title3,
            description1: desc1,
            description2: desc2,
            description3: desc3,
            contact,
          },
        }
      );
  
      // Check if the update was successful
      if (result.nModified === 0) {
        return res.status(404).json({
          status: false,
          message: "Notice not found or no changes made",
        });
      }
  
      // Fetch the updated document
      const updatedNotice = await Notice.findOne({ _id: id });
  
      // Return the updated document
      res.status(200).json({
        status: true,
        message: "Notice updated successfully",
        data: updatedNotice,
      });
    } catch (error) {
      console.error("Error updating notice:", error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
});
  

module.exports = router;
