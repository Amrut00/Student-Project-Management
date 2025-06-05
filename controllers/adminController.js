const db = require("../utils/db"); // Import MySQL connection
const bcrypt = require("bcrypt");

// Admin Login
exports.loginAdmin = (req, res, next) => { // Added next
  const { email, password } = req.body;

   if (!email || !password) {
       req.flash('error', 'Please provide email and password.');
       // res.locals.toastrErrorMessage = "Please provide email and password.";
       return res.render("admin/4admin_login"); // Re-render login form
   }

  db.query("SELECT * FROM admin WHERE email = ?", [email], async (err, result) => {
    if (err) {
      console.error("[Admin Login] Database error:", err);
       req.flash('error', 'Database error. Please try again later.');
       // res.locals.toastrErrorMessage = "Something went wrong. Please try again later.";
       // Instead of rendering, maybe redirect or use next? Let's redirect for now.
       // return res.render("admin/4admin_login");
       return res.redirect('/admin/login'); // Or use next(err)
    }

    if (result.length === 0) {
       req.flash('error', 'Invalid email or password.');
       // res.locals.toastrErrorMessage = "Invalid email or password. Please check your credentials.";
       return res.render("admin/4admin_login");
    }

    const admin = result[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
       req.flash('error', 'Invalid email or password.');
       // res.locals.toastrErrorMessage = "Invalid email or password. Please check your credentials.";
       return res.render("admin/4admin_login");
    }

    // --- Login Success ---
    req.session.regenerate((regenErr) => {
       if (regenErr) {
           console.error("[Admin Login] Session regeneration error:", regenErr);
            req.flash('error', 'Login failed due to session error.');
            // res.locals.toastrErrorMessage = "Login failed due to session error.";
            // Decide how to handle error - re-render or redirect
            return res.render("admin/4admin_login"); // Re-render login form on session error
       }

        // Set admin session data
       req.session.admin = {
            admin_id: admin.admin_id,
            email: admin.email,
            role: admin.role // Include role if useful
       };
        req.session.isAuthenticated = true; // Generic auth flag
        req.session.userType = 'admin';

        // NOTE: Setting cookie maxAge here is usually done in the main session config,
        // but keeping it if it was intentional.
        // req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // Session expires in 1 day
        console.log("[Admin Login] Login successful, session regenerated for admin:", admin.admin_id);

        // Save session BEFORE redirecting
        req.session.save((saveErr) => {
            if (saveErr) {
                console.error("[Admin Login] Session save error:", saveErr);
                req.flash('error', 'Login failed during session save.');
                 // res.locals.toastrErrorMessage = "Login failed during session save.";
                return res.render("admin/4admin_login"); // Re-render login form on save error
            }

            console.log(`[Admin Login] Session saved for admin ${admin.admin_id}, redirecting to dashboard...`);
             // Redirect to admin dashboard
            // Setting a success message via flash might be better than res.locals if using flash elsewhere
             req.flash('success', 'Login successful!');
             // res.locals.toastrSuccessMessage = "Login successful!";
            res.redirect("/admin/dashboard");
         }); // End req.session.save()
     }); // End req.session.regenerate()
  }); // End db.query()
};

//Admin Dashboard
exports.getDashboard = function(req, res) {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  const adminId = req.session.admin.admin_id; // ✅ Fetching admin_id correctly

  const query = 'SELECT * FROM admin WHERE admin_id = ?';
  db.query(query, [adminId], function(err, results) {
    if (err) {
      console.error("Database error:", err);
      return res.render('shared/error', { error: "Something went wrong." });
    }

    if (results.length === 0) {
      return res.render('shared/error', { error: "Admin not found." });
    }

    const admin = results[0];
    res.render('admin/4admin_dashboard', { admin: admin });
  });
};

// GET /admin/profile
exports.viewProfile = function(req, res) {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }

  const adminId = req.session.admin.admin_id;

  const sql = 'SELECT * FROM admin WHERE admin_id = ?';
  db.query(sql, [adminId], function(err, results) {
    if (err) return res.render('shared/error', { error: err });
    if (results.length === 0) return res.render('shared/error', { error: "Admin not found" });

    res.render('admin/admin_profile', { admin: results[0] });
  });
};

// POST /admin/update-profile
exports.updateProfile = function(req, res) {
  if (!req.session.admin) return res.redirect('/admin/login');

  const adminId = req.session.admin.admin_id;
  const { contact_number, email } = req.body;

  const sql = 'UPDATE admin SET contact_number = ?, email = ? WHERE admin_id = ?';
  db.query(sql, [contact_number, email, adminId], function(err) {
    if (err) return res.render('shared/error', { error: err });

    res.redirect('/admin/profile');
  });
};

//Change password
exports.changePassword = async function(req, res) {
  const adminId = req.session.admin.admin_id;
  const { current_password, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    return res.render('shared/error', { error: "New passwords do not match." });
  }

  const query = "SELECT password FROM admin WHERE admin_id = ?";
  db.query(query, [adminId], async (err, results) => {
    if (err || results.length === 0) {
      return res.render('shared/error', { error: "Unable to verify admin." });
    }

    const valid = await bcrypt.compare(current_password, results[0].password);
    if (!valid) {
      return res.render('shared/error', { error: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    const updateQuery = "UPDATE admin SET password = ? WHERE admin_id = ?";

    db.query(updateQuery, [hashedPassword, adminId], (err) => {
      if (err) return res.render('shared/error', { error: err });

      res.redirect('/admin/profile');
    });
  });
};

// GET /admin/edit-profile
exports.editProfilePage = function(req, res) {
  if (!req.session.admin) return res.redirect('/admin/login');

  const adminId = req.session.admin.admin_id;
  const sql = 'SELECT * FROM admin WHERE admin_id = ?';

  db.query(sql, [adminId], function(err, results) {
    if (err || results.length === 0) {
      return res.render('shared/error', { error: "Unable to load admin info" });
    }
    res.render('admin/admin_edit_profile', { admin: results[0] });
  });
};

// GET /admin/change-password
exports.changePasswordPage = function(req, res) {
  if (!req.session.admin) return res.redirect('/admin/login');
  res.render('admin/admin_change_password');
};

// Add Admin
exports.addAdmin = async (req, res) => {
  // ✅ Check if admin is logged in
  if (!req.session.admin) {
    return res.redirect("/admin/4admin_login"); // Redirect to login if not authenticated
  }
  try {
    const { first_name, last_name, contact_number, email, password } = req.body;

    if (!first_name || !contact_number || !email || !password) {
      return res.status(400).send("All fields are required.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO admin (first_name, last_name, contact_number, email, password) VALUES (?, ?, ?, ?, ?)",
      [first_name, last_name, contact_number, email, hashedPassword],
      (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).send("Database error");
        }
        res.redirect("/admin/dashboard");
      }
    );
  } catch (error) {
    console.error("Error adding admin:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Add Student
exports.addStudent = async (req, res) => {
  try {
    // ✅ Check if admin is logged in
    if (!req.session.admin) {
      return res.redirect("/admin/4admin_login"); // Redirect to login if not authenticated
    }

    const { first_name, last_name, mis_number, contact_number, email, password, degree, branch, semester } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO student (first_name, last_name, mis_number, contact_number, email, password, degree, branch, semester, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      first_name, last_name, mis_number, contact_number, email, hashedPassword, degree, branch || null, semester || null, "pending",
    ];

    db.query(query, values, (err) => {
      if (err) {
        console.error("Database error:", err);
        return res.render("shared/error", { errorMessage: "Database error! Please try again later." });
      }
      res.redirect("/admin/dashboard");
    });
  } catch (error) {
    console.error("Error during adding student:", error);
    res.status(500).render("shared/error", { errorMessage: "Internal server error" });
  }
};

// Get Faculty List (for Staff Assignment)
exports.getFacultyList = (req, res) => {
  // ✅ Check if admin is logged in
  if (!req.session.admin) {
    return res.redirect("/admin/4admin_login"); // Redirect if not authenticated
  }

  db.query("SELECT faculty_id, first_name, last_name FROM faculty", (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).render("shared/error", { errorMessage: "Database error. Please try again later." });
    }
    res.render("admin/4admin_add_staff", { faculties: results });
  });
};

// Add Staff
exports.addStaff = async (req, res) => {
  // ✅ Check if admin is logged in
  if (!req.session.admin) {
    return res.redirect("/admin/4admin_login"); // Redirect if not authenticated
  }

  const { first_name, last_name, mis_number, contact_number, email, assisting_faculty_id, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO staff (first_name, last_name, mis_number, contact_number, email, assisting_faculty_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [first_name, last_name, mis_number, contact_number, email, assisting_faculty_id, hashedPassword],
      (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).render("shared/error", { errorMessage: "Database error. Please try again later." });
        }
        res.redirect("/admin/dashboard");
      }
    );
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).render("shared/error", { errorMessage: "Server error. Please try again later." });
  }
};

// Add Faculty
exports.addFaculty = async (req, res) => {
  // ✅ Check if admin is logged in
  if (!req.session.admin) {
    return res.redirect("/admin/4admin_login"); // Redirect if not authenticated
  }

  const { first_name, last_name, email, phone_number, department, specialization, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO faculty (first_name, last_name, email, phone_number, department, specialization, availability_status, password) VALUES (?, ?, ?, ?, ?, ?, 'available', ?)";

    db.query(query, [first_name, last_name, email, phone_number, department, specialization, hashedPassword], (err) => {
      if (err) {
        console.error("Error inserting faculty:", err);
        return res.status(500).render("shared/error", { errorMessage: "Database error. Please try again later." });
      }
      res.redirect("/admin/dashboard");
    });
  } catch (error) {
    console.error("Error adding faculty:", error);
    res.status(500).render("shared/error", { errorMessage: "Internal server error. Please try again later." });
  }
};

// Search User
exports.searchUser = (req, res) => {
  // ✅ Check if admin is logged in
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const { query, type } = req.query;

  if (!query) {
    return res.json({ error: "Please enter a valid input." });
  }

  let sqlQuery;
  let values;

  if (type === "student") {
    sqlQuery = "SELECT * FROM student WHERE student_id = ? OR mis_number = ? OR email = ? OR contact_number = ?";
    values = [query, query, query, query];
  } else if (type === "faculty") {
    sqlQuery = "SELECT * FROM faculty WHERE faculty_id = ? OR email = ? OR phone_number = ?";
    values = [query, query, query];
  } else if (type === "staff") {
    sqlQuery = "SELECT * FROM staff WHERE staff_id = ? OR mis_number = ? OR email = ? OR contact_number = ?";
    values = [query, query, query, query];
  } else {
    return res.status(400).json({ error: "Invalid user type." });
  }

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error. Please try again later." });
    }

    if (result.length === 0) {
      return res.json({ message: "No user found." });
    }

    res.json(result);
  });
};

// Get User Data for Editing
exports.getEditUser = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const { userType, id } = req.params;

  let sqlQuery;
  if (userType === "student") {
      sqlQuery = "SELECT * FROM student WHERE student_id = ?";
  } else if (userType === "faculty") {
      sqlQuery = "SELECT * FROM faculty WHERE faculty_id = ?";
  } else if (userType === "staff") {
      sqlQuery = "SELECT * FROM staff WHERE staff_id = ?";
  } else {
      return res.status(400).json({ error: "Invalid user type" });
  }

  db.query(sqlQuery, [id], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error. Please try again later." });
      }

      if (result.length === 0) {
          return res.status(404).json({ error: "User not found" });
      }

      const user = result[0];

      // If the user is staff, fetch faculty list
      if (userType === "staff") {
          db.query("SELECT faculty_id, first_name, last_name FROM faculty", (err, faculties) => {
              if (err) {
                  console.error("Database error:", err);
                  return res.status(500).json({ error: "Error fetching faculty list" });
              }
              res.render("admin/editUser.ejs", { user, userType, faculties });
          });
      } else {
          // **Ensure faculties is always defined**
          const faculties = [];
          res.render("admin/editUser.ejs", { user, userType, faculties});  // FIXED
      }
  });
};

// Edit User
exports.editUser = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const { userType, userId } = req.params;

  if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is missing" });
  }

  let query = "";
  let params = [userId];

  // Fetch all user details based on userType
  if (userType === "student") {
      query = `SELECT * FROM student WHERE student_id = ?`;
  } else if (userType === "faculty") {
      query = `SELECT * FROM faculty WHERE faculty_id = ?`;
  } else if (userType === "staff") {
      query = `SELECT * FROM staff WHERE staff_id = ?`;
  } else {
      return res.status(400).json({ success: false, message: "Invalid user type" });
  }

  db.query(query, params, (err, results) => {
      if (err) {
          console.error("Error fetching user:", err);
          return res.status(500).json({ success: false, message: "Internal server error" });
      }

      if (results.length === 0) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      const user = results[0];

      res.render("admin/editUser", { user, userType });
  });
};

// Update user details
exports.updateUser = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const { userType, userId } = req.params;
  const userData = req.body; // Contains all editable fields

  if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is missing" });
  }

  let query = "";
  let params = [];

  // Update student details
  if (userType === "student") {
      query = `UPDATE student SET first_name = ?, last_name = ?, email = ?, contact_number = ?, degree = ?, branch = ?, semester = ?, status = ?, group_id = ? WHERE student_id = ?`;
      params = [
          userData.first_name,
          userData.last_name,
          userData.email,
          userData.contact_number,
          userData.degree,
          userData.branch,
          userData.semester,
          userData.status,
          userData.group_id || "",
          userId
      ];
  }
  // Update faculty details
  else if (userType === "faculty") {
      query = `UPDATE Faculty SET first_name = ?, last_name = ?, email = ?, phone_number = ?, department = ?, specialization = ?, availability_status = ? WHERE faculty_id = ?`;
      params = [
          userData.first_name,
          userData.last_name,
          userData.email,
          userData.contact_number,
          userData.department,
          userData.specialization,
          userData.availability_status,
          userId
      ];
  }
  // Update staff details
  else if (userType === "staff") {
      query = `UPDATE staff SET first_name = ?, last_name = ?, email = ?, contact_number = ?, mis_number = ?, assisting_faculty_id = ? WHERE staff_id = ?`;
      params = [
          userData.first_name,
          userData.last_name,
          userData.email,
          userData.contact_number,
          userData.mis_number,
          userData.assisting_faculty_id || null,
          userId
      ];
  }
  else {
      return res.status(400).json({ success: false, message: "Invalid user type" });
  }

  db.query(query, params, (err, result) => {
      if (err) {
          console.error("Error updating user:", err);
          return res.status(500).json({ success: false, message: "Internal server error" });
      }

      if (result.affectedRows > 0) {
        res.redirect("/admin/search-user");
      } else {
          res.status(404).json({ success: false, message: "User not found or no changes made" });
      }
  });
};

//Change user password
exports.renderChangePasswordForm = (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  const { type, id } = req.params;

  if (!["student", "faculty", "staff"].includes(type)) {
    return res.render("shared/error", { message: "Invalid user type." });
  }

  res.render("admin/changeUserPassword", { userId: id, userType: type });
};

exports.updatePassword = (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  const { type, id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.render("shared/error", { message: "Password must be at least 6 characters." });
  }

  const tableMap = {
    student: "Student",
    faculty: "Faculty",
    staff: "Staff"
  };

  const table = tableMap[type];
  const idColumn = `${type}_id`;

  bcrypt.hash(new_password, 10, (err, hash) => {
    if (err) {
      console.error("Hash error:", err);
      return res.render("shared/error", { message: "Something went wrong. Try again." });
    }

    const sql = `UPDATE ${table} SET password = ? WHERE ${idColumn} = ?`;
    db.query(sql, [hash, id], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res.render("shared/error", { message: "Database error." });
      }

      res.redirect("/admin/search-user");
    });
  });
};

// Get Faculty List for Faculty Allocation/Deallocation
exports.getFacultyListForAllocation = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  db.query("SELECT faculty_id, first_name, last_name FROM faculty", (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
      }
      return res.json(results);
  });
};

// Allocate Faculty to a Group
exports.allocateFaculty = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }
  const { faculty_id, group_id } = req.body;

  if (!faculty_id || !group_id) {
      return res.status(400).json({ message: "Faculty ID and Group ID are required." });
  }

  // Allocate faculty to the group
  db.query(
      "UPDATE `group` SET allocated_faculty_id = ?, current_faculty_id = NULL WHERE group_id = ?",
      [faculty_id, group_id],
      (err) => {
          if (err) {
              console.error("Error allocating faculty:", err);
              return res.status(500).json({ message: "Error allocating faculty." });
          }

          // Check if group status is Pending
          db.query("SELECT status FROM `group` WHERE group_id = ?", [group_id], (err, groupResult) => {
              if (err) {
                  console.error("Error checking group status:", err);
                  return res.status(500).json({ message: "Error checking group status." });
              }

              if (groupResult.length > 0 && groupResult[0].status === "Pending") {
                  // Update group status to Allocated
                  db.query("UPDATE `group` SET status = 'Allocated' WHERE group_id = ?", [group_id], (err) => {
                      if (err) {
                          console.error("Error updating group status:", err);
                          return res.status(500).json({ message: "Error updating group status." });
                      }

                      // Update student status to Allocated
                      // Update student status to 'Allocated' for all students in the given group
                      db.query(
                        "UPDATE student SET status = 'Allocated' WHERE student_id IN (SELECT student_id FROM group_members WHERE group_id = ?)",
                        [group_id],
                        (err) => {
                            if (err) {
                                console.error("Error updating student status:", err);
                                return res.status(500).json({ message: "Error updating student status." });
                            }

                            res.status(200).json({ message: "Faculty allocated successfully!" });
                        }
                      );
                  });
              } else {
                  res.status(200).json({ message: "Faculty allocated successfully!" });
              }
          });
      }
  );
};

// Deallocate Faculty from a Group
exports.deallocateFaculty = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const { group_id } = req.body;

  if (!group_id) {
      return res.status(400).json({ message: "Group ID is required." });
  }

  // Remove faculty from allocated_faculty_id
  db.query("UPDATE `group` SET allocated_faculty_id = NULL, assisting_staff_id = NULL WHERE group_id = ?", [group_id], (err) => {
      if (err) {
          console.error("Error deallocating faculty:", err);
          return res.status(500).json({ message: "Error deallocating faculty." });
      }

      // Get first faculty preference from `group_faculty_preferences`
      db.query(
          "SELECT faculty_id FROM group_faculty_preferences WHERE group_id = ? ORDER BY preference_order ASC LIMIT 1",
          [group_id],
          (err, facultyPreferences) => {
              if (err) {
                  console.error("Error fetching faculty preferences:", err);
                  return res.status(500).json({ message: "Error fetching faculty preferences." });
              }

              let firstFacultyId = facultyPreferences.length > 0 ? facultyPreferences[0].faculty_id : null;

              // Update current_faculty_id back to first preference
              db.query("UPDATE `group` SET current_faculty_id = ? WHERE group_id = ?", [firstFacultyId, group_id], (err) => {
                  if (err) {
                      console.error("Error updating current_faculty_id:", err);
                      return res.status(500).json({ message: "Error updating current_faculty_id." });
                  }

                  // Update group status to Pending
                  db.query("UPDATE `group` SET status = 'Pending' WHERE group_id = ?", [group_id], (err) => {
                      if (err) {
                          console.error("Error updating group status:", err);
                          return res.status(500).json({ message: "Error updating group status." });
                      }

                      // Update student status to Pending
                      db.query(
                        "UPDATE student SET status = 'Pending' WHERE student_id IN (SELECT student_id FROM group_members WHERE group_id = ?)",
                        [group_id],
                        (err) => {
                            if (err) {
                                console.error("Error updating student status:", err);
                                return res.status(500).json({ message: "Error updating student status." });
                            }

                            res.status(200).json({ message: "Faculty deallocated successfully!" });
                        }
                      );
                  });
              });
          }
      );
  });
};

// Get all groups (Preview Data)
exports.viewGroups = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const query = `
      SELECT g.group_id, g.project_title, g.project_domain, g.status, 
             f.first_name AS faculty_first_name, f.last_name AS faculty_last_name, 
             COALESCE(s.degree, 'Unknown') AS degree, 
             COALESCE(s.semester, 'Unknown') AS semester
      FROM \`group\` g
      LEFT JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
      LEFT JOIN student s ON g.leader_id = s.student_id
      ORDER BY degree ASC, semester ASC`;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Error fetching groups:", err);
          return res.status(500).json({ message: "Error fetching groups." });
      }
      res.render("admin/view_groups", { groups: results });
  });
};

// Get Detailed Group Information
exports.getGroupDetails = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  const { groupId } = req.params;

  const query = `
      SELECT g.group_id, g.project_title, g.project_domain, g.status, 
             f.faculty_id, f.first_name AS faculty_first_name, f.last_name AS faculty_last_name, 
             f.email AS faculty_email, f.phone_number AS faculty_phone, 
             st.staff_id, st.first_name AS staff_first_name, st.last_name AS staff_last_name, 
             st.email AS staff_email, st.contact_number AS staff_phone, 
             COALESCE(s.degree, 'Unknown') AS degree, 
             COALESCE(s.semester, 'Unknown') AS semester
      FROM \`group\` g
      LEFT JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
      LEFT JOIN Staff st ON g.assisting_staff_id = st.staff_id
      LEFT JOIN student s ON g.leader_id = s.student_id
      WHERE g.group_id = ?`;

  db.query(query, [groupId], (err, groupResults) => {
      if (err) {
          console.error("Error fetching group details:", err);
          return res.status(500).json({ message: "Error fetching group details." });
      }

      if (groupResults.length === 0) {
          return res.status(404).json({ message: "Group not found." });
      }

      const membersQuery = `
          SELECT s.student_id, s.first_name, s.last_name, s.mis_number, s.email, 
                 s.contact_number, COALESCE(s.degree, 'Unknown') AS degree, 
                 COALESCE(s.semester, 'Unknown') AS semester
          FROM group_members gm
          JOIN student s ON gm.student_id = s.student_id
          WHERE gm.group_id = ?
          ORDER BY s.first_name, s.last_name`;  // Sort members alphabetically for better UI

      db.query(membersQuery, [groupId], (err, memberResults) => {
          if (err) {
              console.error("Error fetching group members:", err);
              return res.status(500).json({ message: "Error fetching group members." });
          }

          if (memberResults.length === 0) {
              console.warn(`No members found for group_id: ${groupId}`);
          }

          res.render("admin/group_details", {
              group: groupResults[0],
              members: memberResults || [], // Ensure it does not break if empty
              projectDomain: groupResults[0].project_domain // Pass project domain to EJS
          });
      });
  });
};

//Manage groups
exports.getManageGroupPage = (req, res) => {
  const groupId = req.params.groupId;
  const searchedStudent = null;

  const groupQuery = `
    SELECT s.student_id, s.first_name, s.last_name, s.mis_number
    FROM group_members gm
    JOIN student s ON gm.student_id = s.student_id
    WHERE gm.group_id = ?
  `;

  db.query(groupQuery, [groupId], (err, groupMembers) => {
    if (err) return res.status(500).send("Error loading group members.");

    res.render("admin/manage_group", {
      groupId,
      groupMembers,
      searchedStudent // null by default
    });
  });
};

exports.searchStudentForGroup = (req, res) => {
  const groupId = req.params.groupId;
  const query = req.query.query;

  const searchQuery = `
    SELECT student_id, first_name, last_name, mis_number, group_id 
    FROM student 
    WHERE mis_number = ? OR email = ? OR contact_number = ?
  `;

  db.query(searchQuery, [query, query, query], (err, results) => {
    if (err) return res.status(500).send("Error searching student.");

    const searchedStudent = results[0] || null;

    const groupQuery = `
      SELECT s.student_id, s.first_name, s.last_name, s.mis_number
      FROM group_members gm
      JOIN student s ON gm.student_id = s.student_id
      WHERE gm.group_id = ?
    `;

    db.query(groupQuery, [groupId], (err2, groupMembers) => {
      if (err2) return res.status(500).send("Error loading group members.");

      res.render("admin/manage_group", {
        groupId,
        groupMembers,
        searchedStudent
      });
    });
  });
};

function assignStudentToGroup(student_id, groupId, res) {
  const addMemberQuery = `INSERT INTO group_members (group_id, student_id) VALUES (?, ?)`;
  const updateStudentQuery = `UPDATE student SET group_id = ?, status = 'allocated' WHERE student_id = ?`;

  db.query(addMemberQuery, [groupId, student_id], (err) => {
    if (err) return res.status(500).send("Error adding to group.");
    db.query(updateStudentQuery, [groupId, student_id], (err2) => {
      if (err2) return res.status(500).send("Error updating student.");
      res.redirect(`/admin/manage-group/${groupId}`);
    });
  });
}

exports.addStudentToGroup = (req, res) => {
  const groupId = req.params.groupId;
  const { student_id } = req.body;

  const checkQuery = `SELECT student_id, first_name, last_name, mis_number, group_id FROM student WHERE student_id = ?`;

  db.query(checkQuery, [student_id], (err, result) => {
    if (err) return res.status(500).send("Error checking student.");

    const student = result[0];
    const currentGroup = student?.group_id;

    if (currentGroup && currentGroup != groupId) {
      // Already in another group
      return res.render("admin/confirm_add_group", {
        student,
        targetGroupId: groupId
      });
    }

    assignStudentToGroup(student_id, groupId, res);
  });
};

exports.getConfirmAddPage = (req, res) => {
  const { groupId, studentId } = req.params;

  const query = `
    SELECT student_id, first_name, last_name, mis_number, group_id
    FROM student
    WHERE student_id = ?
  `;

  db.query(query, [studentId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).send("Student not found or DB error.");
    }

    const student = results[0];

    res.render("admin/confirm_add_group", {
      student,
      targetGroupId: groupId
    });
  });
};

exports.confirmAddStudentToNewGroup = (req, res) => {
  const { student_id, groupId, currentGroup } = req.body;

  const removeQuery = `DELETE FROM group_members WHERE group_id = ? AND student_id = ?`;

  db.query(removeQuery, [currentGroup, student_id], (err) => {
    if (err) return res.status(500).send("Error removing student from old group.");

    // Then assign to new group
    assignStudentToGroup(student_id, groupId, res);
  });
};

exports.removeStudentFromGroup = (req, res) => {
  const groupId = req.params.groupId;
  const { student_id } = req.body;

  const deleteQuery = `DELETE FROM group_members WHERE group_id = ? AND student_id = ?`;
  const updateStudentQuery = `UPDATE student SET group_id = NULL, status = 'pending' WHERE student_id = ?`;

  db.query(deleteQuery, [groupId, student_id], (err) => {
    if (err) return res.status(500).send("Error removing student.");
    db.query(updateStudentQuery, [student_id], (err2) => {
      if (err2) return res.status(500).send("Error updating student.");
      res.redirect(`/admin/manage-group/${groupId}`);
    });
  });
};

exports.deleteGroup = (req, res) => {
  const groupId = req.params.groupId;

  const disableSafeUpdates = `SET SQL_SAFE_UPDATES = 0`;
  const enableSafeUpdates = `SET SQL_SAFE_UPDATES = 1`;
  const resetStudentsQuery = `UPDATE student SET group_id = NULL, status = 'pending' WHERE group_id = ?`;
  const deleteGroupMembers = `DELETE FROM group_members WHERE group_id = ?`;
  const deleteGroupPreferences = `DELETE FROM group_faculty_preferences WHERE group_id = ?`;
  const deletePanelAssignments = `DELETE FROM panel_group_assignments WHERE group_id = ?`;
  const deleteGroupQuery = `DELETE FROM \`group\` WHERE group_id = ?`;

  console.log("Starting group deletion process for group ID:", groupId);

  db.query(disableSafeUpdates, (err) => {
    if (err) {
      console.error("Error disabling safe updates:", err);
      return res.status(500).send("Error disabling safe updates.");
    }

    db.query(resetStudentsQuery, [groupId], (err2) => {
      if (err2) {
        console.error("Error updating students:", err2);
        db.query(enableSafeUpdates, () => {});
        return res.status(500).send("Error updating students.");
      }

      db.query(deleteGroupMembers, [groupId], (err3) => {
        if (err3) {
          console.error("Error deleting group members:", err3);
          db.query(enableSafeUpdates, () => {});
          return res.status(500).send("Error deleting group members.");
        }

        db.query(deleteGroupPreferences, [groupId], (err4) => {
          if (err4) {
            console.error("Error deleting faculty preferences:", err4);
            db.query(enableSafeUpdates, () => {});
            return res.status(500).send("Error deleting faculty preferences.");
          }

          db.query(deletePanelAssignments, [groupId], (err5) => {
            if (err5) {
              console.error("Error deleting panel assignments:", err5);
              db.query(enableSafeUpdates, () => {});
              return res.status(500).send("Error deleting panel assignments.");
            }

            db.query(deleteGroupQuery, [groupId], (err6) => {
              db.query(enableSafeUpdates, () => {}); // Always re-enable

              if (err6) {
                console.error("Error deleting group:", err6);
                return res.status(500).send("Error deleting group.");
              }

              console.log("Group deleted successfully:", groupId);
              res.redirect("/admin/view-groups");
            });
          });
        });
      });
    });
  });
};

//Group allocation limit for faculty
exports.addLimit = async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  try {
      const { degree_hidden, semester_hidden, allocation_limit } = req.body;
      
      // Validate inputs
      if (!degree_hidden || !semester_hidden || !allocation_limit) {
          return res.status(400).send("All fields are required");
      }

      // Convert semester input to array
      const semesters = semester_hidden === '-1' ? [-1] : semester_hidden.split(',').map(Number);
      
      // Convert degrees to array
      const degrees = degree_hidden === 'All Degrees' ? ['All Degrees'] : degree_hidden.split(',');

      // Validate PhD/All Degrees requirements
      if (degrees.includes('PhD') && !semesters.includes(-1)) {
          return res.status(400).send("PhD requires All Semesters");
      }

      if (degrees.includes('All Degrees') && !semesters.includes(-1)) {
          return res.status(400).send("All Degrees requires All Semesters");
      }

      // Process each degree-semester combination
      const connection = await db.promise().getConnection();
      try {
          await connection.beginTransaction();

          for (const degree of degrees) {
              for (const semester of semesters) {
                  // Validate PhD/All Degrees semester requirement
                  if ((degree === 'PhD' || degree === 'All Degrees') && semester !== -1) {
                      await connection.rollback();
                      return res.status(400).send(`Invalid semester for ${degree}`);
                  }

                  // Check for existing entry
                  const [existing] = await connection.query(
                      'SELECT * FROM faculty_allocation_limits WHERE degree = ? AND semester = ?',
                      [degree, semester]
                  );

                  if (existing.length > 0) {
                      await connection.rollback();
                      return res.status(400).send(`Limit already exists for ${degree} semester ${semester}`);
                  }

                  // Insert new limit
                  await connection.query(
                      'INSERT INTO faculty_allocation_limits (degree, semester, limit_count) VALUES (?, ?, ?)',
                      [degree, semester, allocation_limit]
                  );
              }
          }

          await connection.commit();
          res.redirect("/admin/limits");
      } catch (error) {
          await connection.rollback();
          throw error;
      } finally {
          connection.release();
      }
  } catch (error) {
      console.error("Error adding limit:", error);
      res.status(500).send("Error adding limit");
  }
};

exports.viewLimits = (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }

  db.query("SELECT * FROM faculty_allocation_limits", (err, results) => {
      if (err) {
          console.error("Error fetching limits:", err);
          return res.status(500).send("Database error");
      }

      // Get list of degrees for selection
      db.query("SELECT DISTINCT degree FROM student", (err, degrees) => {
        if (err) {
            console.error("Error fetching degrees:", err);
            return res.status(500).send("Database error");
        }
        
        // Map the semester to "All Semesters" if it's -1
        const formattedResults = results.map(limit => {
          return {
            ...limit,
            semester: limit.semester === -1 ? "All Semesters" : limit.semester,
            degree: limit.degree === null ? "All Degrees" : limit.degree
          };
        });

        res.render("admin/admin_set_limits", {
            limits: formattedResults,
            degrees: degrees.map(d => d.degree), // Here degrees.map() is used
        });
    });      
  });
};

exports.deleteLimit = async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized access. Please log in as an admin." });
  }
  
  const limitId = req.params.limitId;

  try {
      // Delete the limit using a promise-based query
      await db.promise().query("DELETE FROM faculty_allocation_limits WHERE limit_id = ?", [limitId]);

      // Redirect after successful deletion
      res.redirect("/admin/limits");
  } catch (error) {
      console.error("Error deleting limit:", error);
      res.status(500).send("Error deleting limit");
  }
};

//Create panel
exports.renderPanelForm = (req, res) => {
  const { degree, semester } = req.query;
  console.log("Render panel form for:", { degree, semester });

  if (!degree || semester === undefined) {
    console.log("Missing degree or semester. Rendering selection page.");
    return res.render('admin/select_degree_semester');
  }

  const facultyQuery = `
    SELECT f.faculty_id, f.first_name, f.last_name, f.department,
      (
        SELECT COUNT(g.group_id)
        FROM \`group\` g
        JOIN student s ON g.leader_id = s.student_id
        WHERE g.allocated_faculty_id = f.faculty_id
          AND s.degree = ?
          AND (? = -1 OR s.semester = ?)
      ) AS group_count,
      EXISTS (
        SELECT 1 FROM panel_faculty_members pf
        JOIN panel p ON pf.panel_id = p.panel_id
        WHERE pf.faculty_id = f.faculty_id
          AND p.degree = ?
          AND p.semester = ?
      ) AS alreadyAssigned
    FROM faculty f
    ORDER BY f.department, group_count DESC
  `;

  const totalGroupsQuery = `
    SELECT COUNT(*) AS total FROM \`group\` g
    JOIN student s ON g.leader_id = s.student_id
    WHERE s.degree = ? AND (? = -1 OR s.semester = ?)
  `;

  const existingPanelsQuery = `
    SELECT COUNT(*) AS count FROM panel
    WHERE degree = ? AND semester = ?
  `;

  db.query(
    facultyQuery,
    [degree, semester, semester, degree, semester],
    (err, faculties) => {
      if (err) {
        console.error("Error fetching faculties:", err);
        return res.status(500).send('Error loading panel form');
      }

      db.query(totalGroupsQuery, [degree, semester, semester], (err2, groupResult) => {
        if (err2) {
          console.error("Error fetching group count:", err2);
          return res.status(500).send('Error loading panel form');
        }

        db.query(existingPanelsQuery, [degree, semester], (err3, panelResult) => {
          if (err3) {
            console.error("Error fetching panel count:", err3);
            return res.status(500).send('Error loading panel form');
          }

          const totalGroups = groupResult[0].total;
          const existingPanels = panelResult[0].count;
          const suggestedMaxGroups = Math.ceil(totalGroups / (existingPanels + 1)) || 1;

          console.log("Suggested Max Groups:", suggestedMaxGroups);

          const departments = { CSE: [], ECE: [], ASH: [] };
          faculties.forEach(f => departments[f.department]?.push(f));

          res.render('admin/manual_create_panel', {
            degree,
            semester,
            departments,
            suggestedMaxGroups
          });
        });
      });
    }
  );
};

exports.createPanel = (req, res) => {
  const { degree, semester, max_groups, selectedFaculties } = req.body;
  const facultyIds = Array.isArray(selectedFaculties) ? selectedFaculties : [selectedFaculties];

  console.log("Creating panel with degree:", degree, "semester:", semester, "facultyIds:", facultyIds);

  db.query(
    `INSERT INTO panel (degree, semester, max_groups) VALUES (?, ?, ?)`,
    [degree, semester, max_groups],
    (err, result) => {
      if (err) {
        console.error("Error creating panel:", err);
        return res.status(500).send('Error creating panel');
      }

      const panelId = result.insertId;
      console.log("Panel created with ID:", panelId);

      let pendingFaculties = facultyIds.length;

      facultyIds.forEach(facultyId => {
        // 1. Insert into panel_faculty_members
        db.query(
          `INSERT INTO panel_faculty_members (panel_id, faculty_id) VALUES (?, ?)`,
          [panelId, facultyId],
          (err) => {
            if (err) {
              console.error(`Error adding faculty ${facultyId} to panel:`, err);
              pendingFaculties--;
              return;
            }

            // 2. Find groups for this faculty
            const groupQuery = `
              SELECT g.group_id 
              FROM \`group\` g
              JOIN student s ON g.leader_id = s.student_id
              WHERE g.allocated_faculty_id = ?
                AND s.degree = ?
                AND (? = -1 OR s.semester = ?)
            `;

            db.query(groupQuery, [facultyId, degree, semester, semester], (err, groups) => {
              if (err) {
                console.error(`Error fetching groups for faculty ${facultyId}:`, err);
                pendingFaculties--;
                return;
              }

              console.log(`Faculty ${facultyId} — Groups found: ${groups.length}`);

              if (!groups || groups.length === 0) {
                pendingFaculties--;
                if (pendingFaculties === 0) {
                  console.log("All faculties processed. Redirecting...");
                  return res.redirect(`/admin/panel/${panelId}`);
                }
                return;
              }

              let groupInsertPending = groups.length;

              groups.forEach(group => {
                db.query(
                  `INSERT IGNORE INTO panel_group_assignments (panel_id, group_id) VALUES (?, ?)`,
                  [panelId, group.group_id],
                  (err) => {
                    if (err) console.error(`Error assigning group ${group.group_id} to panel:`, err);
                    groupInsertPending--;
                    if (groupInsertPending === 0) {
                      pendingFaculties--;
                      if (pendingFaculties === 0) {
                        console.log("All faculties and groups processed. Redirecting...");
                        return res.redirect(`/admin/panel/${panelId}`);
                      }
                    }
                  }
                );
              });
            });
          }
        );
      });
    }
  );
};

//List all panels
exports.listPanels = (req, res) => {
  const query = `
    SELECT p.panel_id, p.degree, p.semester, p.max_groups,
           COUNT(DISTINCT pf.faculty_id) AS faculty_count,
           COUNT(DISTINCT pg.group_id) AS group_count
    FROM panel p
    LEFT JOIN panel_faculty_members pf ON p.panel_id = pf.panel_id
    LEFT JOIN panel_group_assignments pg ON p.panel_id = pg.panel_id
    GROUP BY p.panel_id
    ORDER BY p.degree, p.semester
  `;
  db.query(query, (err, panels) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error loading panel list');
    }
    res.render('admin/panel_list', { panels });
  });
};

//View single panel dashboard
exports.viewPanelDashboard = (req, res) => {
  const { panelId } = req.params;

  db.query(`SELECT * FROM panel WHERE panel_id = ?`, [panelId], (err, panelRows) => {
    if (err) {
      console.error("Error fetching panel:", err);
      return res.status(500).send('Error loading panel');
    }

    if (!panelRows || panelRows.length === 0) {
      console.log("Panel not found:", panelId);
      return res.render("shared/error", {
        errorMessage: "Panel not found.",
      });
    }

    const panel = panelRows[0];

    db.query(`
      SELECT f.faculty_id, f.first_name, f.last_name, f.department
      FROM panel_faculty_members pf
      JOIN faculty f ON pf.faculty_id = f.faculty_id
      WHERE pf.panel_id = ?
    `, [panelId], (err, members) => {
      if (err) {
        console.error("Error loading panel members:", err);
        return res.status(500).send('Error loading panel members');
      }

      db.query(`
        SELECT g.group_id, g.project_title, f.first_name AS faculty_first_name, f.last_name AS faculty_last_name
        FROM panel_group_assignments pga
        JOIN \`group\` g ON pga.group_id = g.group_id
        JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
        WHERE pga.panel_id = ?
      `, [panelId], (err, groups) => {
        if (err) {
          console.error("Error loading panel groups:", err);
          return res.status(500).send('Error loading panel groups');
        }

        const unassignedGroupsQuery = `
          SELECT g.group_id, g.project_title,
                f.first_name AS faculty_first_name, f.last_name AS faculty_last_name
          FROM \`group\` g
          JOIN student s ON g.leader_id = s.student_id
          JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
          WHERE s.degree = ? AND s.semester = ?
          AND g.group_id NOT IN (
            SELECT group_id FROM panel_group_assignments
          )
        `;

        db.query(unassignedGroupsQuery, [panel.degree, panel.semester], (err, unassignedGroups) => {
          if (err) {
            console.error("Error loading unassigned groups:", err);
            return res.status(500).send('Error loading unassigned groups');
          }

          const eligibleFacultyQuery = `
            SELECT faculty_id, first_name, last_name, department
            FROM faculty
            WHERE faculty_id NOT IN (
              SELECT faculty_id
              FROM panel_faculty_members pf
              JOIN panel p ON pf.panel_id = p.panel_id
              WHERE p.degree = ? AND p.semester = ?
            )
          `;

          db.query(eligibleFacultyQuery, [panel.degree, panel.semester], (err, eligibleFaculty) => {
            if (err) {
              console.error("Error loading eligible faculty:", err);
              return res.status(500).send("Error loading eligible faculty");
            }

            res.render("admin/panel_dashboard", {
              panel,
              members,
              groups,
              unassignedGroups,
              eligibleFaculty
            });
          });
        });
      });
    });
  });
};

//Delete panel
exports.deletePanel = (req, res) => {
  const panelId = req.params.panelId;

  // Step 1: Delete from panel_group_assignments
  const deleteGroupAssignmentsQuery = `DELETE FROM panel_group_assignments WHERE panel_id = ?`;

  db.query(deleteGroupAssignmentsQuery, [panelId], (err) => {
    if (err) {
      console.error("Error deleting group assignments:", err);
      return res.status(500).send("Error deleting group assignments.");
    }

    // Step 2: Delete from panel_faculty_members
    const deleteMembersQuery = `DELETE FROM panel_faculty_members WHERE panel_id = ?`;

    db.query(deleteMembersQuery, [panelId], (err) => {
      if (err) {
        console.error("Error deleting panel members:", err);
        return res.status(500).send("Error deleting panel members.");
      }

      // Step 3: Delete the panel
      const deletePanelQuery = `DELETE FROM panel WHERE panel_id = ?`;

      db.query(deletePanelQuery, [panelId], (err) => {
        if (err) {
          console.error("Error deleting panel:", err);
          return res.status(500).send("Error deleting panel.");
        }

        console.log(`Panel ${panelId} deleted successfully.`);
        res.redirect('/admin/panels');
      });
    });
  });
};

//Auto Generate Panels
exports.autoGeneratePanels = (req, res) => {
  const { degree, semester, max_groups } = req.body;

  if (!degree || !semester) {
    console.log("Missing degree or semester. Rendering selection page.");
    return res.render('admin/select_degree_semester');
  }

  console.log("Render panel form for:", { degree, semester });

  const MAX_GROUPS_PER_PANEL = parseInt(max_groups) || 5;
  console.log("Max groups : ", max_groups);

  const facultyQuery = `
    SELECT f.faculty_id, f.first_name, f.last_name, f.department,
      (
        SELECT COUNT(g.group_id)
        FROM \`group\` g
        JOIN student s ON g.leader_id = s.student_id
        WHERE g.allocated_faculty_id = f.faculty_id
          AND s.degree = ?
          AND (? = -1 OR s.semester = ?)
      ) AS group_count
    FROM faculty f
    WHERE NOT EXISTS (
      SELECT 1 FROM panel_faculty_members pf
      JOIN panel p ON pf.panel_id = p.panel_id
      WHERE pf.faculty_id = f.faculty_id
        AND p.degree = ?
        AND p.semester = ?
    )
    ORDER BY group_count DESC
  `;

  const groupQuery = `
    SELECT g.group_id, g.allocated_faculty_id
    FROM \`group\` g
    JOIN student s ON g.leader_id = s.student_id
    WHERE s.degree = ? AND (? = -1 OR s.semester = ?)
  `;

  db.query(facultyQuery, [degree, semester, semester, degree, semester], (err, faculties) => {
    if (err) {
      console.error("❌ Error fetching faculties:", err);
      return res.status(500).send("Error generating panels");
    }

    db.query(groupQuery, [degree, semester, semester], (err2, groups) => {
      if (err2) {
        console.error("❌ Error fetching groups:", err2);
        return res.status(500).send("Error generating panels");
      }

      if (faculties.length < 2 || groups.length === 0) {
        return res.status(400).send("Not enough faculties or groups to create panels");
      }

      console.log(`✅ Found ${faculties.length} eligible faculties`);
      console.log(`✅ Found ${groups.length} groups`);

      const groupPool = [...groups]; // clone
      const assignedFacultySet = new Set(); // 🚨 GLOBAL faculty usage tracker
      let panelCounter = 1;

      while (groupPool.length > 0 && faculties.length >= 2) {
        const assignedGroups = groupPool.splice(0, MAX_GROUPS_PER_PANEL);

        // Match a faculty already guiding one of these groups (if available)
        let matchFaculty = null;
        for (let f of faculties) {
          if (
            !assignedFacultySet.has(f.faculty_id) && 
            assignedGroups.some(g => g.allocated_faculty_id === f.faculty_id)
          ) {
            matchFaculty = f;
            break;
          }
        }

        const panelFaculties = [];
        const usedDepartments = new Set();

        if (matchFaculty) {
          panelFaculties.push(matchFaculty);
          assignedFacultySet.add(matchFaculty.faculty_id);
          usedDepartments.add(matchFaculty.department);
        }

        // Fill remaining panel spots (max 3 faculties per panel)
        for (let i = 0; i < faculties.length && panelFaculties.length < 3; i++) {
          const f = faculties[i];
          if (
            !assignedFacultySet.has(f.faculty_id) &&
            !usedDepartments.has(f.department)
          ) {
            panelFaculties.push(f);
            assignedFacultySet.add(f.faculty_id);
            usedDepartments.add(f.department);
          }
        }

        if (panelFaculties.length < 2) {
          console.warn(`⚠️ Skipping Panel ${panelCounter} — Not enough diverse faculties.`);
          continue;
        }

        const facultyIds = panelFaculties.map(f => f.faculty_id);
        console.log(`➡️ Processing Panel ${panelCounter} | Faculties: ${facultyIds.join(', ')} | Groups: ${assignedGroups.length}`);

        db.query(
          `INSERT INTO panel (degree, semester, max_groups) VALUES (?, ?, ?)`,
          [degree, semester, MAX_GROUPS_PER_PANEL],
          (err, result) => {
            if (err) {
              console.error("❌ Error creating panel:", err);
              return;
            }

            const panelId = result.insertId;
            console.log(`✅ Panel ${panelId} created with ${assignedGroups.length} group(s)`);

            // Add faculty members to panel
            facultyIds.forEach(fid => {
              db.query(
                `INSERT INTO panel_faculty_members (panel_id, faculty_id) VALUES (?, ?)`,
                [panelId, fid],
                err => {
                  if (err) console.error(`❌ Error adding faculty ${fid} to panel ${panelId}:`, err);
                }
              );
            });

            // Add groups to panel
            assignedGroups.forEach(group => {
              db.query(
                `INSERT INTO panel_group_assignments (panel_id, group_id) VALUES (?, ?)`,
                [panelId, group.group_id],
                err => {
                  if (err) console.error(`❌ Error assigning group ${group.group_id} to panel ${panelId}:`, err);
                }
              );
            });
          }
        );

        panelCounter++;
      }

      console.log("🎉 All panels created. Redirecting...");
      return res.redirect('/admin/panels');
    });
  });
};

//Add faculty to panel
exports.addFacultyToPanel = (req, res) => {
  const { panelId } = req.params;
  const { faculty_id } = req.body;

  db.query(`
    INSERT INTO panel_faculty_members (panel_id, faculty_id)
    VALUES (?, ?)
  `, [panelId, faculty_id], (err) => {
    if (err) {
      console.error("Error adding faculty:", err);
      return res.status(500).send("Failed to add faculty");
    }
    res.redirect(`/admin/panel/${panelId}`);
  });
};

//Remove faculty from panel
exports.removeFacultyFromPanel = (req, res) => {
  const { panelId } = req.params;
  const { faculty_id } = req.body;

  db.query(`
    DELETE FROM panel_faculty_members
    WHERE panel_id = ? AND faculty_id = ?
  `, [panelId, faculty_id], (err) => {
    if (err) {
      console.error("Error removing faculty:", err);
      return res.status(500).send("Failed to remove faculty");
    }
    res.redirect(`/admin/panel/${panelId}`);
  });
};

//Add group to panel
exports.addGroupToPanel = (req, res) => {
  const panelId = req.params.panelId;
  const groupId = req.body.group_id;

  const query = `INSERT INTO panel_group_assignments (panel_id, group_id) VALUES (?, ?)`;

  db.query(query, [panelId, groupId], (err) => {
    if (err) {
      console.error("❌ Error adding group:", err);
      return res.status(500).send("Error adding group to panel");
    }

    console.log(`✅ Group ${groupId} added to panel ${panelId}`);
    return res.redirect(`/admin/panel/${panelId}`);
  });
};

//Remove group from panel
exports.removeGroupFromPanel = (req, res) => {
  const panelId = req.params.panelId;
  const groupId = req.body.group_id;

  const query = `DELETE FROM panel_group_assignments WHERE panel_id = ? AND group_id = ?`;

  db.query(query, [panelId, groupId], (err) => {
    if (err) {
      console.error("❌ Error removing group:", err);
      return res.status(500).send("Error removing group from panel");
    }

    console.log(`🗑️ Group ${groupId} removed from panel ${panelId}`);
    return res.redirect(`/admin/panel/${panelId}`);
  });
};
