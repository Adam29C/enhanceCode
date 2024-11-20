const router = require("express").Router();
const Useridea = require("../../model/UserSuggestion");
router.get("/userIdea", async (req, res) => {
  try {
    const userIdia = await Useridea.find({});
    return res.json.status(200)({
      status: true,
      data: userIdia,
    });
  } catch (err) {
    return res.json.status(500)({
      status: true,
      message: "Internal Server Error",
    });
  }
});

router.post("/userIdea", async (req, res) => {
  try {
    let index = parseInt(req.body.start) + 1;
    const { length, start, order, columns, search } = req.body;

    Useridea
      .dataTables({
        limit: length,
        skip: start,
        order: order,
        columns: columns,
        search: {
          value: search.value,
          fields: ["username"],
        },
        sort: { _id: -1 },
      })
      .then((table) => {
        const dataTab = table.data;
        const tableData = dataTab.map((data, idx) => {
          let ideaContent = data.idea.replace(/\n/g, "<br />");
          return {
            _id: index + idx,
            idea: ideaContent,
            username: data.username,
            createdAt: data.createdAt,
          };
        });

        res.json({
          status: 1,
          message: "Ideas fetched successfully",
          data: {
            tableData,
            recordsFiltered: table.total,
            recordsTotal: table.total,
          },
        });
      })
      .catch((error) => {
        res.status(400).json({
          status: 0,
          message: "Request is too large or failed to fetch data",
          error: error.toString(),
        });
      });
  } catch (error) {
    res.status(500).json({
      status: 0,
      message: "Server Error: Could not process the request",
      error: error.toString(),
    });
  }
});

router.post("/ideas", async (req, res) => {
	try {
		const { userid, username, idea } = req.body;
		const time = moment().format("DD/MM/YYYY hh:mm a");
		const timeStamp = moment(time, "DD/MM/YYYY hh:mm a").unix();

		if (idea == "") {
			return res.json({
				status: 0,
				message: "Cannot Submit Empty Suggestion"
			})
		}

		const ideaData = new Useridea({
			userid: userid,
			username: username,
			idea: idea,
			createdAt: time,
			timestamp: timeStamp,
			approveIdea: false
		})
		const saveIdea = await ideaData.save();
		return res.json({
			status: 1,
			message: "Your Idea is Submitted Successfully, We Will Review Your Idea Soon 🥳🥳"
		})
	} catch (error) {
		return res.json({
			status: 0,
			message: `Server Error : ${error.toString()}`
		})
	}
});

module.exports = router;
