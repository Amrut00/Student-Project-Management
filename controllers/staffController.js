const bcrypt = require("bcrypt");
const db = require("../utils/db"); // Database connection
const jwt = require("jsonwebtoken");

//Faculty list in dropdown menu
exports.getFacultyList = (req, res) => {
    const query = "SELECT faculty_id, first_name, last_name FROM faculty";

    db.query(query, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Database error");
        }
        // Pass faculty list to the signup page
        res.render("staff/2staff_signup", { 
          faculties: results,                 
          staff: req.session.staff
        });
    });
};

//signup form
exports.signupStaff = async (req, res) => {
    const { first_name, last_name, mis_number, contact_number, email, assisting_faculty_id, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            "INSERT INTO staff (first_name, last_name, mis_number, contact_number, email, assisting_faculty_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [first_name, last_name, mis_number, contact_number, email, assisting_faculty_id, hashedPassword]
        );

        res.redirect("/staff/login");
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Server error. Please try again later." });
    }
};

//login form
exports.loginStaff = async (req, res, next) => { // Added next for error handling consistency
  const { email, password } = req.body;

  if (!email || !password) {
      req.flash('error', 'Please provide email and password.');
      return res.redirect('/staff/login');
  }

  try {
      const query = "SELECT * FROM staff WHERE email = ?";
      // Using promise() interface simplifies async/await here
      const [results] = await db.promise().query(query, [email]);

      if (results.length === 0) {
          req.flash('error', 'Invalid email or password.');
          return res.redirect("/staff/login");
      }

      const staff = results[0];
      const isPasswordValid = await bcrypt.compare(password, staff.password);

      if (!isPasswordValid) {
          req.flash('error', 'Invalid email or password.');
          return res.redirect("/staff/login");
      }

      // --- Login Success ---
      req.session.regenerate(async (regenErr) => { // Regenerate session
          if (regenErr) {
              console.error("[Staff Login] Session regeneration error:", regenErr);
               req.flash('error', 'Login failed due to session error.');
               return res.redirect('/staff/login');
          }

          // Set session data AFTER regenerating
          req.session.staff = {
              staff_id: staff.staff_id,
              first_name: staff.first_name,
              last_name: staff.last_name,
              email: staff.email,
              assisting_faculty_id: staff.assisting_faculty_id,
           };
          req.session.isAuthenticated = true;
          req.session.userType = 'staff';
          console.log("[Staff Login] Login successful, session regenerated for staff:", staff.staff_id);

          // Save session BEFORE redirecting
           req.session.save((saveErr) => {
              if (saveErr) {
                   console.error("[Staff Login] Session save error:", saveErr);
                   req.flash('error', 'Login failed during session save.');
                   return res.redirect('/staff/login');
               }
               console.log(`[Staff Login] Session saved for staff ${staff.staff_id}, redirecting to dashboard...`);
               // Redirect to the dashboard
              res.redirect(`/staff/${staff.staff_id}/dashboard`);
           }); // End req.session.save()
       }); // End req.session.regenerate()

  } catch (error) {
      console.error("[Staff Login] Error:", error);
       req.flash('error', 'An internal server error occurred during login.');
       // Or use next() if you have global error handling middleware
       // next({ status: 500, message: 'An internal server error occurred during staff login.' });
       res.redirect('/staff/login'); // Redirect back on catch
  }
};

exports.viewProfile = (req, res) => {
  const { staffId } = req.params;

  const query = "SELECT * FROM staff WHERE staff_id = ?";
  db.query(query, [staffId], (err, result) => {
    if (err) {
      console.error("Error fetching staff profile:", err);
      return res.status(500).send("Error fetching profile");
    }

    if (result.length === 0) {
      return res.status(404).send("Staff not found");
    }

    res.render("staff/staff_profile.ejs", {
      staff: result[0]
    });
  });
};

// Show Edit Profile Page
exports.editProfile = (req, res) => {
  const { staffId } = req.params;

  const query = "SELECT * FROM staff WHERE staff_id = ?";
  db.query(query, [staffId], (err, result) => {
    if (err) {
      console.error("Error fetching staff:", err);
      return res.status(500).send("Error loading profile");
    }

    if (result.length === 0) {
      return res.status(404).send("Staff not found");
    }

    res.render("staff/staff_edit_profile.ejs", {
      staff: result[0]
    });
  });
};

// Update Profile Info
exports.updateProfile = (req, res) => {
  const { staffId } = req.params;
  const { first_name, last_name, contact_number, email } = req.body;

  const query = `
    UPDATE staff
    SET first_name = ?, last_name = ?, contact_number = ?, email = ?
    WHERE staff_id = ?
  `;

  db.query(query, [first_name, last_name, contact_number, email, staffId], (err, result) => {
    if (err) {
      console.error("Error updating profile:", err);
      return res.send(`<script>alert("Update failed."); window.history.back();</script>`);
    }

    res.send(`<script>alert("Profile updated successfully."); window.location.href='/staff/${staffId}/profile';</script>`);
  });
};

// Show password form
exports.getChangePassword = (req, res) => {
  res.render('staff/staff_change_password.ejs', { staffId: req.params.staffId });
};

// Handle password update
exports.updatePassword = async (req, res) => {
  const { staffId } = req.params;
  const { old_password, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    return res.send(`<script>alert("New passwords do not match."); window.history.back();</script>`);
  }

  const query = "SELECT password FROM staff WHERE staff_id = ?";
  db.query(query, [staffId], async (err, results) => {
    if (err || results.length === 0) {
      return res.send(`<script>alert("Something went wrong."); window.history.back();</script>`);
    }

    const isValid = await bcrypt.compare(old_password, results[0].password);
    if (!isValid) {
      return res.send(`<script>alert("Old password is incorrect."); window.history.back();</script>`);
    }

    const hashed = await bcrypt.hash(new_password, 10);
    const updateQuery = "UPDATE staff SET password = ? WHERE staff_id = ?";
    db.query(updateQuery, [hashed, staffId], (err2) => {
      if (err2) {
        return res.send(`<script>alert("Error updating password."); window.history.back();</script>`);
      }

      res.send(`<script>alert("Password changed successfully."); window.location.href='/staff/${staffId}/profile';</script>`);
    });
  });
};

exports.getAssignedGroups = (req, res) => {
  // Auth check - Ensure staff accessing their own dashboard
   if (!req.session.staff || req.session.staff.staff_id != req.params.staffId) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect('/staff/login');
  }

  const { staffId } = req.params;

  const query = `
      SELECT g.group_id, g.project_title, g.project_domain,
             GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.first_name SEPARATOR ', ') AS members
             -- Removed student details like degree/semester unless needed on this overview page
      FROM \`group\` g
      LEFT JOIN group_members gm ON g.group_id = gm.group_id
      LEFT JOIN student s ON gm.student_id = s.student_id
      WHERE g.assisting_staff_id = ? AND g.status = 'Allocated' -- Only show allocated groups
      GROUP BY g.group_id, g.project_title, g.project_domain
      ORDER BY g.group_id
  `; // Use LEFT JOIN for members in case a group has no members somehow

  db.query(query, [staffId], (err, results) => {
      if (err) {
          console.error("Error fetching assigned groups for staff:", err);
          req.flash('error', 'Could not load assigned groups.');
           // Render dashboard with empty data or redirect home
           return res.render("staff/2staff_dashboard.ejs", { data: [], staff: req.session.staff });
      }

      res.render("staff/2staff_dashboard.ejs", {
          data: results, // Contains the groups array
          staff: req.session.staff // Pass the whole staff session object
          // staff_id is implicitly available via req.session.staff.staff_id in EJS if needed
      });
  });
};
  
exports.getGroupDetailsForStaff = (req, res) => {
  // Auth check
  if (!req.session.staff || req.session.staff.staff_id != req.params.staffId) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect('/staff/login');
  }
  const { staffId, groupId } = req.params;
  const loggedInStaffUserId = req.session.staff.staff_id; // Get ID from session

  const query = `
      SELECT g.project_title, g.project_domain,
             f.first_name AS faculty_first_name, f.last_name AS faculty_last_name,
             GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.first_name SEPARATOR ', ') AS members
      FROM \`group\` g
      LEFT JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
      LEFT JOIN group_members gm ON g.group_id = gm.group_id
      LEFT JOIN student s ON gm.student_id = s.student_id
      WHERE g.group_id = ? AND g.assisting_staff_id = ?
      GROUP BY g.group_id, g.project_title, g.project_domain, f.first_name, f.last_name;
  `;

  db.query(query, [groupId, staffId], (err, results) => {
      if (err) {
          console.error("Error fetching group details for staff:", err);
          req.flash('error', 'Error loading group details.');
          return res.redirect(`/staff/${staffId}/dashboard`);
      }

      if (results.length === 0) {
          req.flash('error', 'Group not found or you are not assigned to assist this group.');
          return res.redirect(`/staff/${staffId}/dashboard`);
      }

      const group = results[0];
      const membersList = group.members ? group.members.split(", ") : [];

      res.render("staff/2staff_group_dashboard.ejs", {
          projectTitle: group.project_title || 'N/A',
          projectDomain: group.project_domain || "Not Assigned",
          facultyName: (group.faculty_first_name && group.faculty_last_name)
                          ? `Dr. ${group.faculty_first_name} ${group.faculty_last_name}`
                          : "Faculty Not Assigned",
          members: membersList,
          staffId: staffId,      // staffId from URL param (redundant maybe?)
          groupId: groupId,      // groupId from URL param (needed for chat)
          staffUser: req.session.staff, // Pass the whole staff user object
          // ***Explicitly pass userId and userType for the hidden fields***
          userId: loggedInStaffUserId,
          userType: 'staff'
      });
  });
};
