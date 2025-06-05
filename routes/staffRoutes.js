const express = require("express");
const path = require("path");
const router = express.Router();
const staffController = require("../controllers/staffController");

router.get("/signup", staffController.getFacultyList);
router.post("/signup", staffController.signupStaff);

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/staff/2staff_login.html"));
});
router.post("/login", staffController.loginStaff);

router.get("/:staffId/dashboard", staffController.getAssignedGroups);

// View profile
router.get('/:staffId/profile', staffController.viewProfile);

// Edit profile page
router.get('/:staffId/edit', staffController.editProfile);
router.post('/:staffId/edit', staffController.updateProfile);

// Change password page
router.get('/:staffId/change-password', staffController.getChangePassword);
router.post('/:staffId/change-password', staffController.updatePassword);

router.get("/:staffId/dashboard/group/:groupId", staffController.getGroupDetailsForStaff);

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
      res.redirect("/staff/login");
  });
});

module.exports = router;
