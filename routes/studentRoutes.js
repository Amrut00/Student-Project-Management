const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

// Student Signup
router.get("/signup", (req, res) => {
  res.render("student/1student_signup.ejs");
});
router.post("/signup", studentController.signupStudent);

// Student Login
router.get("/login", (req, res) => {
  res.render("student/1student_login.ejs");
});
router.post("/login", studentController.loginStudent);

// Group Google Form
router.get("/:studentId/form", studentController.getFacultyList);
router.post("/:studentId/form", studentController.submitGroupForm);

// Group Form Submitted
router.get("/:studentId/form-submitted", (req, res) => {
  const studentId = req.params.studentId;
  res.render("student/1googleform_submitted", { studentId });
});

// Protected Routes with :studentId
router.get("/:studentId/homepage", studentController.getStudentHomepage);
router.get("/:studentId/check-group-status/:groupId", studentController.checkGroupStatus);

// Profile
router.get("/:studentId/profile", studentController.getProfile);
router.get("/:studentId/profile/edit", studentController.getEditProfile);
router.post("/:studentId/profile/edit", studentController.postEditProfile);

// Change Password
router.get("/:studentId/profile/change-password", studentController.getChangePassword);
router.post("/:studentId/profile/change-password", studentController.postChangePassword);

// Student Dashboard (After selecting a group)
router.get("/:studentId/dashboard/:groupId", studentController.studentDashboard);

module.exports = router;
