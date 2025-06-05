const express = require("express");
const path = require("path");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Admin Login
router.get("/login", (req, res) => {
  res.render("admin/4admin_login.ejs");
});
router.post("/login", adminController.loginAdmin);

// Admin Dashboard
router.get('/dashboard', adminController.getDashboard);

//Admin Profile
router.get('/profile', adminController.viewProfile);

// Update profile
router.get('/edit-profile', adminController.editProfilePage);
router.post('/update-profile', adminController.updateProfile);

//Change password
router.get('/change-password', adminController.changePasswordPage);
router.post('/change-password', adminController.changePassword);

// Add Admin
router.get("/add_admin", (req, res) => {
  res.render("admin/4admin_add_admin.ejs");
});
router.post("/add_admin", adminController.addAdmin);

// Add Student
router.get("/add_student", (req, res) => {
  res.render("admin/4admin_add_student.ejs");
});
router.post("/add_student", adminController.addStudent);

// Add Faculty
router.get("/add_faculty", (req, res) => {
  res.render("admin/4admin_add_faculty.ejs");
});
router.post("/add_faculty", adminController.addFaculty);

// Add Staff
router.get("/add_staff", adminController.getFacultyList);
router.post("/add_staff", adminController.addStaff);

// Allocate Faculty to Group
router.get("/allocate_faculty", (req, res) => {
  res.render("admin/4admin_allocate_faculty.ejs", { mode: "allocate" });
});
router.get("/faculty-list-allocation", adminController.getFacultyListForAllocation);
router.post("/allocate-faculty", adminController.allocateFaculty);

//Deallocate Faculty
router.get("/deallocate_faculty", (req, res) => {
  res.render("admin/4admin_allocate_faculty.ejs", { mode: "deallocate" });
});
router.post("/deallocate-faculty", adminController.deallocateFaculty);

// Search User
router.get("/search-user", (req, res) => {
  res.render("admin/searchUser");
});
router.get("/search-user/query", adminController.searchUser);

// Edit User Info
router.get("/edit/:userType/:userId", adminController.editUser);
router.post("/update/:userType/:userId", adminController.updateUser);

//Change User Password
router.get("/change-password/:type/:id", adminController.renderChangePasswordForm);
router.post("/change-password/:type/:id", adminController.updatePassword);

//View All Groups
router.get("/view-groups", adminController.viewGroups);
router.get("/group-details/:groupId", adminController.getGroupDetails);

// Manage groups
router.get("/manage-group/:groupId", adminController.getManageGroupPage);
router.get("/manage-group/:groupId/search-student", adminController.searchStudentForGroup);
router.get("/manage-group/:groupId/add-existing-student/:studentId", adminController.getConfirmAddPage);
router.post("/manage-group/:groupId/add-student", adminController.addStudentToGroup);
router.post("/manage-group/:groupId/confirm-add", adminController.confirmAddStudentToNewGroup);
router.post("/manage-group/:groupId/remove-student", adminController.removeStudentFromGroup);
router.post("/manage-group/:groupId/delete", adminController.deleteGroup);

//Set faculty allocation limits
router.get("/limits", adminController.viewLimits);
router.post("/limits/add", adminController.addLimit);
router.post("/limits/delete/:limitId", adminController.deleteLimit);

//Create panel
router.get('/panel/form', adminController.renderPanelForm);
router.get('/panel/create', adminController.renderPanelForm);
router.post('/panel/create', adminController.createPanel); 

//Auto generate panels
router.post('/panel/auto-generate', adminController.autoGeneratePanels);

// View all panels
router.get('/panels', adminController.listPanels);

// View individual panel dashboard
router.get('/panel/:panelId', adminController.viewPanelDashboard);

// Delete a panel
router.post('/panel/:panelId/delete', adminController.deletePanel);

// Add & remove faculty from panel
router.post('/panel/:panelId/add-faculty', adminController.addFacultyToPanel);
router.post('/panel/:panelId/remove-faculty', adminController.removeFacultyFromPanel);

// Add group to panel
router.post('/panel/:panelId/add-group', adminController.addGroupToPanel);

// Remove group from panel
router.post('/panel/:panelId/remove-group', adminController.removeGroupFromPanel);

//Add student to group



module.exports = router;
