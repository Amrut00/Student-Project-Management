const express = require("express");
const path = require("path");
const router = express.Router();
const facultyController = require("../controllers/facultyController");
const authMiddleware = require("../utils/authMiddleware");

router.use("/:facultyId/dashboard", authMiddleware.isFacultyAuthenticated);

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/faculty/3faculty_login.html"));
});

router.post("/login", facultyController.loginFaculty);

// Faculty Dashboards
router.get("/:facultyId/dashboard/existing", facultyController.getExistingGroups);
router.get("/:facultyId/dashboard/existing/group/:groupId", facultyController.getGroupDetails);

router.get("/:facultyId/dashboard/unallocated", facultyController.getUnallocatedGroups);
router.get("/:facultyId/dashboard/unallocated/group/:groupId", (req, res) => {
  const { facultyId, groupId } = req.params;
  res.render("faculty/3faculty_group_details.ejs", { facultyId, groupId });
});

//Faculty profile
router.get('/:facultyId/profile', facultyController.getFacultyProfile);
router.get('/:facultyId/edit-profile', facultyController.getEditFacultyProfile);
router.post('/:facultyId/edit-profile', facultyController.postEditFacultyProfile);
router.get('/:facultyId/change-password', facultyController.getChangeFacultyPassword);
router.post('/:facultyId/change-password', facultyController.postChangeFacultyPassword);

//Choose and pass group
router.post("/:facultyId/dashboard/unallocated/choose/:groupId", facultyController.chooseGroup);
router.post("/:facultyId/dashboard/unallocated/pass/:groupId", facultyController.passGroup);

// New Routes for Assigning Staff
router.get("/:facultyId/dashboard/existing/group/:groupId/assign-staff", facultyController.getStaffList);
router.post("/:facultyId/dashboard/existing/group/:groupId/assign-staff", facultyController.assignGroupToStaff);


module.exports = router;