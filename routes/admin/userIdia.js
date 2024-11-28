const router = require("express").Router();
const Useridea = require("../../model/UserSuggestion");
const moment =require("moment")
router.post("/", async (req, res) => {
  try {
    // Destructure the values from the request body
    const { page = 1, limit = 10, searchQuery = "" } = req.body;  // Default values for page, limit, and searchQuery
    const skip = (page - 1) * limit;

    // Define the fields for search
    const searchFields = ["username", "idea"];  // Fields to search in
    const searchConditions = searchQuery
      ? {
          $or: searchFields.map((field) => ({
            [field]: { $regex: searchQuery, $options: "i" },  // Case-insensitive search
          })),
        }
      : {};  // Empty object if no search query

    // Fetch data from Useridea collection with search and pagination
    const userIdea = await Useridea
      .find(searchConditions)  // Apply search condition
      .skip(skip)               // Apply pagination
      .limit(limit)             // Limit the number of records per page
      .sort({ _id: -1 });       // Sort by _id in descending order (latest first)

    // Get the total number of records that match the search condition
    const totalRecords = await Useridea.countDocuments(searchConditions);

    // Format the data for response
    const formattedData = userIdea.map((idea, index) => ({
      sno: skip + index + 1,   // Serial number (to show order)
      username: idea.username,
      idea: idea.idea.replace(/\n/g, "<br />"), // Replace newlines in idea content (if necessary)
      createdAt: idea.createdAt,
    }));

    // Check if no data was found
    if (userIdea.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No ideas found matching the search criteria.",
        recordsFiltered: 0,
        recordsTotal: totalRecords,
      });
    }

    // Send the response with the fetched data and pagination details
    return res.status(200).json({
      status: true,
      message: "User ideas fetched successfully.",
      data: formattedData,
      recordsFiltered: totalRecords,  // Number of records matching search criteria
      recordsTotal: totalRecords,     // Total number of records
    });
  } catch (err) {
    // Handle any errors
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: err.toString(),
    });
  }
});


module.exports = router;
