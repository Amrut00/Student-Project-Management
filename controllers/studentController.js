// controllers/studentController.js
// Merged version prioritizing Controller 1's workflow and routes.
// Integrates improved logic/validation from Controller 2 where non-conflicting.

const db = require("../utils/db");
const bcrypt = require("bcrypt");

// --- Signup --- (Using logic mostly from Controller 2 for validation/flash)
exports.signupStudent = async (req, res, next) => {
  const { first_name, last_name, mis_number, contact_number, email, password, confirm_password, degree, branch, semester } = req.body;

  // Validation (Enhanced using Controller 2's checks)
  if (!first_name || !last_name || !mis_number || !contact_number || !email || !password || !confirm_password || !degree) {
    req.flash('error', 'Please fill in all required fields.');
    return res.redirect('/student/signup');
  }
  if (password !== confirm_password) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/student/signup');
  }
  if (!/^\d{9}$/.test(mis_number)) {
    req.flash('error', 'Invalid MIS Number format (should be 9 digits).');
    return res.redirect('/student/signup');
  }
  if (!/^\d{10}$/.test(contact_number)) {
    req.flash('error', 'Invalid Contact Number format (should be 10 digits).');
    return res.redirect('/student/signup');
  }
   if (password.length < 8) {
        req.flash('error', 'Password must be at least 8 characters long.');
       return res.redirect('/student/signup');
    }
   // Add more specific email regex validation if desired

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Status is 'Pending', group_id is NULL initially
    const query = `INSERT INTO student (first_name, last_name, mis_number, contact_number, email, password, degree, branch, semester, status, group_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)`;
    const values = [
      first_name, last_name, mis_number, contact_number, email,
      hashedPassword, degree, branch || null, semester || null
    ];

    // Using promise query for cleaner error handling within try/catch
    await db.promise().query(query, values);

    req.flash('success', 'Registration successful! Please log in.');
    // Controller 1's flow redirects to login after signup
    res.redirect("/student/login");

  } catch (error) {
    console.error("[Signup] Error:", error); // Log detailed error
    // Check for specific DB errors
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Email or MIS Number already exists.');
    } else {
      req.flash('error', 'Database error during registration. Please try again.');
    }
     res.redirect('/student/signup'); // Redirect back on any error
  }
};

// --- Login --- (Using Controller 1's logic and redirection)
exports.loginStudent = async (req, res, next) => {
  const { email, password } = req.body;
  console.log("[Login] Attempting login with email:", email);

  // Basic input check
  if (!email || !password) {
       req.flash('error', 'Please provide both email and password.');
       console.log("[Login] Missing email or password.");
       return res.redirect('/student/login');
  }

  try {
    const query = `SELECT * FROM student WHERE email = ?`;

    db.query(query, [email], async (err, result) => {
      if (err) {
        console.error("[Login] DB Error:", err);
        // Preserve original error handling using next()
        return next({ status: 500, message: "Database error during login" });
      }

      if (result.length === 0) {
        console.log("[Login] No student found with that email.");
        req.flash('error', 'Invalid email or password.');
        return res.redirect("/student/login");
      }

      const student = result[0];
      const isPasswordValid = await bcrypt.compare(password, student.password);
      if (!isPasswordValid) {
        console.log("[Login] Invalid password for email:", email);
        req.flash('error', 'Invalid email or password.');
        return res.redirect("/student/login");
      }

      // --- Login successful ---
       req.session.regenerate((sessionErr) => { // Regenerate session first
          if (sessionErr) {
             console.error("[Login] Session regeneration error:", sessionErr);
             req.flash('error', 'Session error during login. Please try again.');
             // It might be better to redirect than use next() for a user-facing error like this
             return res.redirect('/student/login');
             // Original might have used next, but redirect seems more appropriate here.
             // return next({ status: 500, message: "Session regeneration error" });
          }

          // --- Set session data AFTER regenerating ---
          req.session.student = {
            student_id: student.student_id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            degree: student.degree,
            branch: student.branch,
            semester: student.semester,
            mis_number: student.mis_number
          };
          // Setting generic flags can be useful for middleware/views
          req.session.isAuthenticated = true;
          req.session.userType = 'student';
          console.log("[Login] Login successful, session regenerated for student:", student.student_id);

           // --- Save session BEFORE the original redirect target ---
           req.session.save(saveErr => {
                if (saveErr) {
                    console.error("[Login] Session save error:", saveErr);
                    // Use next() for consistency with DB error handling
                    return next({ status: 500, message: "Session save error during login" });
                }
                // --- Session saved successfully ---
                console.log(`[Login] Session saved for student ${student.student_id}, proceeding to ORIGINAL redirect...`);
                // --- Execute the original redirect ---
                return res.redirect(`/student/${student.student_id}/homepage`); // <<<--- PRESERVED REDIRECT TARGET
            }); // --- End req.session.save() ---
       }); // --- End req.session.regenerate() ---
    }); // End db.query callback
  } catch (error) {
    console.error("[Login] Unexpected server error:", error);
     // Preserve original error handling using next()
    next({ status: 500, message: "Internal server error during login" });
  }
};

// --- Student Homepage --- (From Controller 1)
exports.getStudentHomepage = (req, res, next) => {
  // Updated to use new session structure
  const sessionStudent = req.session.student;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("[Homepage] Session:", sessionStudent);
  console.log("[Homepage] Param ID:", paramStudentId);

  // Security check
  if (!sessionStudent || sessionStudent.student_id !== paramStudentId) {
    console.warn("[Homepage] Unauthorized access attempt.");
    req.flash('error', 'Unauthorized access.');
    return res.redirect('/student/login');
  }

  const query = `
    SELECT s.student_id, s.first_name, s.last_name, s.mis_number, s.email, s.degree, s.branch, s.semester,
           s.group_id,
           g.project_title, g.status AS group_status, g.allocated_faculty_id
    FROM student s
    LEFT JOIN \`group\` g ON g.group_id = s.group_id
    WHERE s.student_id = ?
  `;

  db.query(query, [paramStudentId], (err, result) => {
    if (err) {
      console.error("[Homepage] DB error:", err);
      return next({ status: 500, message: "Database error fetching homepage data" });
    }

    if (result.length === 0) {
      console.warn("[Homepage] Student not found with ID:", paramStudentId);
      req.session.destroy(); // Destroy session in case of stale session
      req.flash('error', 'Student record not found.');
      return res.redirect('/student/login');
    }

    const student = result[0];
    console.log("[Homepage] Student data for rendering:", student);

    return res.render("student/student_homepage", { student });
  });
};

exports.checkGroupStatus = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);
  const urlGroupId = parseInt(req.params.groupId);

  console.log("[GroupStatus Check] Session ID:", sessionStudentId);
  console.log("[GroupStatus Check] Param Student ID:", paramStudentId);
  console.log("[GroupStatus Check] Param Group ID:", urlGroupId);

  // 🔒 Security check
  if (!sessionStudentId || sessionStudentId !== paramStudentId) {
    console.warn("[GroupStatus Check] Unauthorized attempt.");
    req.flash('error', 'Unauthorized access.');
    return res.redirect('/student/login');
  }

  const verifyStudentGroupQuery = `SELECT group_id FROM student WHERE student_id = ?`;
  db.query(verifyStudentGroupQuery, [sessionStudentId], (verifyErr, verifyResult) => {
    if (verifyErr || verifyResult.length === 0) {
      console.error("[GroupStatus Check] Error verifying student's group or student not found:", verifyErr);
      return next({ status: 500, message: "Error verifying group membership." });
    }

    const studentActualGroupId = parseInt(verifyResult[0].group_id);

    // ✅ Confirm groupId matches session student's actual group
    if (!studentActualGroupId || studentActualGroupId !== urlGroupId) {
      console.warn(`[GroupStatus Check] Mismatch: Student ${sessionStudentId} (Group: ${studentActualGroupId}) tried to check Group ${urlGroupId}`);
      req.flash('error', 'You are not assigned to the group you tried to check.');
      return res.redirect(`/student/${paramStudentId}/homepage`);
    }

    const groupStatusQuery = `SELECT allocated_faculty_id, status FROM \`group\` WHERE group_id = ?`;
    console.log("[GroupStatus Check] Executing query:", groupStatusQuery, "with groupId:", urlGroupId);

    db.query(groupStatusQuery, [urlGroupId], (err, result) => {
      if (err) {
        console.error("[GroupStatus Check] DB Error:", err);
        return next({ status: 500, message: "Error checking group status" });
      }

      if (result.length === 0) {
        console.warn("[GroupStatus Check] Group not found:", urlGroupId);
        req.flash('error', 'Your assigned group could not be found.');
        return res.redirect(`/student/${paramStudentId}/homepage`);
      }

      const facultyId = result[0].allocated_faculty_id;
      const groupStatus = result[0].status;

      console.log(`[GroupStatus Check] Group ${urlGroupId}: Faculty ID: ${facultyId}, Status: ${groupStatus}`);

      // 🎯 Final Redirection
      if (facultyId && groupStatus === 'Allocated') {
        console.log(`[GroupStatus Check] Group ${urlGroupId} is allocated. Redirecting to dashboard.`);
        return res.redirect(`/student/${paramStudentId}/dashboard/${urlGroupId}`);
      } else {
        console.log(`[GroupStatus Check] Group ${urlGroupId} not yet allocated. Redirecting to form-submitted.`);
        return res.redirect(`/student/${paramStudentId}/form-submitted`);
      }
    });
  });
};

exports.handleStudentGroupRedirection = (req, res) => {
  const sessionStudent = req.session.student; // New style
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("🔍 Session Student ID:", sessionStudentId);
  console.log("🔍 Param Student ID:", paramStudentId);

  if (!sessionStudentId || sessionStudentId !== paramStudentId) {
    console.warn("⚠️ Unauthorized access attempt by student:", sessionStudentId);
    req.flash('error', 'Unauthorized access. Please log in again.');
    return res.redirect('/student/login');
  }

  const selectedGroupId = req.body.selectedGroupId;
  console.log("📦 Selected Group ID from body:", selectedGroupId);

  req.session.selectedGroupId = selectedGroupId;

  const groupQuery = `
    SELECT g.group_id, g.project_title, g.project_domain, g.allocated_faculty_id, 
           f.first_name AS faculty_first_name, f.last_name AS faculty_last_name
    FROM \`group\` g
    LEFT JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
    WHERE g.group_id = ?
  `;

  db.query(groupQuery, [selectedGroupId], (err, groupResult) => {
    if (err) {
      console.error("❌ DB error fetching group:", err);
      return res.status(500).send("Database error fetching group");
    }

    if (groupResult.length === 0) {
      console.warn("⚠️ Group not found:", selectedGroupId);
      return res.status(404).send("Group not found");
    }

    const group = groupResult[0];

    const studentQuery = `SELECT * FROM student WHERE student_id = ?`;

    db.query(studentQuery, [paramStudentId], (err, studentResult) => {
      if (err) {
        console.error("❌ DB error fetching student:", err);
        return res.status(500).send("Database error fetching student");
      }

      if (studentResult.length === 0) {
        console.warn("⚠️ Student not found:", paramStudentId);
        return res.status(404).send("Student not found");
      }

      const student = studentResult[0];

      return res.render("student/1student_dashboard.ejs", {
        groupId: group.group_id,
        data: {
          projectTitle: group.project_title,
          projectDomain: group.project_domain,
          faculty: group.faculty_first_name && group.faculty_last_name
            ? `${group.faculty_first_name} ${group.faculty_last_name}`
            : "Not Assigned",
          studentId: student.student_id,
          studentName: `${student.first_name} ${student.last_name}`,
          degree: student.degree,
          branch: student.branch,
          semester: student.semester
        },
        student: req.session.student
      });
    });
  });
};

// --- Group Form ---
exports.getFacultyList = (req, res) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  if (!sessionStudentId || sessionStudentId !== paramStudentId) {
    console.warn("❌ Unauthorized group form submission attempt");
    return res.status(403).send("Unauthorized access to student group dashboard.");
  }

  const query = "SELECT faculty_id, first_name, last_name FROM faculty";
  db.query(query, (err, faculties) => {
    if (err) {
      console.error("Error fetching faculty list:", err);
      return res.status(500).send("Error fetching faculty list");
    }

    res.render(`student/1googleform`, { faculties, studentId: paramStudentId, student: req.session.student });
  });
};

exports.submitGroupForm = async (req, res) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("🔐 Session Student ID:", sessionStudentId);
  console.log("🧾 Param Student ID:", paramStudentId);

  if (!sessionStudentId || sessionStudentId !== paramStudentId) {
    console.warn("❌ Unauthorized group form submission attempt");
    return res.status(403).send("Unauthorized access to student group dashboard.");
  }

  const { projectTitle, projectDomain, leader_name, leader_mis, leader_email, leader_contact } = req.body;
  const members = req.body.members;
  const preferences = req.body.preferences;

  console.log("📌 Project Title:", projectTitle);
  console.log("📌 Project Domain:", projectDomain);
  console.log("👤 Leader MIS:", leader_mis);
  console.log("👥 Members MIS List:", members.map(m => m.mis));
  console.log("🏫 Faculty Preferences:", preferences);

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const misNumbers = members.map((m) => m.mis?.trim()).filter((mis) => mis);
    misNumbers.push(leader_mis.trim());

    // Check duplicate MIS
    const misSet = new Set(misNumbers);
    if (misSet.size !== misNumbers.length) {
      console.warn("⚠️ Duplicate MIS entries found in form:", misNumbers);
      return res.send(`<script>alert("Duplicate MIS entries found in the form. Please ensure each member is unique."); window.history.back();</script>`);
    }

    console.log("✅ Unique MIS Numbers:", misNumbers);

    const [students] = await connection.query(
      `SELECT * FROM student WHERE mis_number IN (?)`,
      [misNumbers]
    );

    console.log("📊 Fetched Students from DB:", students.map(s => `${s.first_name} ${s.last_name} (${s.mis_number})`));

    const alreadyGrouped = students.filter(student => student.group_id && student.group_id.trim() !== "");
    if (alreadyGrouped.length > 0) {
      const names = alreadyGrouped.map(s => `${s.first_name} ${s.last_name} (${s.mis_number})`).join(", ");
      console.warn("❗ Already grouped students:", names);
      return res.send(`<script>alert("The following students are already in a group: ${names}"); window.history.back();</script>`);
    }

    const leader = students.find((student) => student.mis_number === leader_mis.trim());
    if (!leader) {
      console.error("❌ Leader not found in DB with MIS:", leader_mis);
      return res.send(`<script>alert("Leader MIS not found in the system."); window.history.back();</script>`);
    }

    if (students.length !== misNumbers.length) {
      console.error("❌ Mismatch in provided MIS numbers and DB results");
      return res.send(`<script>alert("Some MIS numbers were not found. Please verify all students have created an account."); window.history.back();</script>`);
    }

    const leaderId = leader.student_id;
    console.log("👨‍💼 Leader Student ID:", leaderId);

    const [groupResult] = await connection.query(
      `INSERT INTO \`group\` (leader_id, project_title, project_domain, status, current_faculty_id) VALUES (?, ?, ?, ?, ?)`,
      [leaderId, projectTitle, projectDomain, "Pending", preferences[0]]
    );

    const groupId = groupResult.insertId;
    console.log("📁 New Group ID Created:", groupId);

    for (const student of students) {
      await connection.query(
        `INSERT INTO group_members (group_id, student_id) VALUES (?, ?)`,
        [groupId, student.student_id]
      );
      await connection.query(
        `UPDATE student SET group_id = ? WHERE student_id = ?`,
        [groupId.toString(), student.student_id]
      );
      console.log(`👤 Added student ${student.first_name} (${student.mis_number}) to group ${groupId}`);
    }

    for (let i = 0; i < preferences.length; i++) {
      await connection.query(
        `INSERT INTO group_faculty_preferences (group_id, faculty_id, preference_order) VALUES (?, ?, ?)`,
        [groupId, preferences[i], i + 1]
      );
      console.log(`📌 Inserted preference ${i + 1} with Faculty ID: ${preferences[i]}`);
    }

    await connection.commit();
    console.log("✅ Group successfully submitted and committed to DB.");
    res.redirect(`/student/${paramStudentId}/form-submitted`);
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error inserting group:", error);
    res.status(500).send("Failed to submit group details.");
  } finally {
    connection.release();
    console.log("🔁 DB connection released");
  }
};

exports.studentDashboard = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);
  const urlGroupId = parseInt(req.params.groupId); // groupId from URL

  console.log("[Render Dashboard] Session ID:", sessionStudentId);
  console.log("[Render Dashboard] Param Student ID:", paramStudentId);
  console.log("[Render Dashboard] Param Group ID:", urlGroupId);


  // Security check
  if (!sessionStudentId || sessionStudentId !== paramStudentId) {
      console.warn("[Render Dashboard] Unauthorized attempt.");
      req.flash('error', 'Unauthorized access.');
      return res.redirect('/student/login');
   }

  // Verify student belongs to this group (redundant with checkGroupStatus, but good practice here)
   const verifyStudentGroupQuery = `SELECT group_id FROM student WHERE student_id = ?`;
   db.query(verifyStudentGroupQuery, [sessionStudentId], (verifyErr, verifyResult) => {
      if (verifyErr || verifyResult.length === 0) {
          return next({ status: 500, message: "Error verifying group membership." });
       }
      const studentActualGroupId = parseInt(verifyResult[0].group_id);
      if (!studentActualGroupId || studentActualGroupId !== urlGroupId) {
           console.warn(`[Render Dashboard] Mismatch: Student ${sessionStudentId} (Group: ${studentActualGroupId}) tried accessing Group ${urlGroupId}.`);
           req.flash('error', 'You are not currently assigned to this group dashboard.');
           return res.redirect(`/student/${paramStudentId}/homepage`); // Redirect to homepage
      }

      // Student is verified, fetch dashboard details (Adopted query structure from Controller 2 for detail)
     const dashboardQuery = `
            SELECT
                g.project_title,
                g.project_domain,
                f.first_name AS faculty_first_name,
                f.last_name AS faculty_last_name,
                s.first_name AS student_first_name, -- Need current student name if not relying solely on session
                s.last_name AS student_last_name,
                s.degree,
                s.branch,
                s.semester
            FROM \`group\` g
            LEFT JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
            INNER JOIN student s ON s.student_id = ? -- Fetch details for THIS student
            WHERE g.group_id = ?
              AND g.status = 'Allocated' -- Ensure group is actually allocated
              AND g.allocated_faculty_id IS NOT NULL; -- Ensure faculty assigned (matches redirect logic)
              -- No need for group_members join if checking student.group_id
              `;

      db.query(dashboardQuery, [sessionStudentId, urlGroupId], (err, results) => {
         if (err) {
           console.error("[Render Dashboard] DB Error:", err);
           return next({ status: 500, message: "Database error loading dashboard" });
         }

         if (results.length === 0) {
           // This means group exists but isn't allocated/doesn't meet criteria - redirect based on actual status?
           // OR means the group isn't allocated - redirect back based on checkGroupStatus's logic
           console.warn(`[Render Dashboard] No *allocated* group data found for Group ${urlGroupId} / Student ${sessionStudentId}. Redirecting based on status.`);
            // Re-check status to be safe
            const groupStatusQuery = `SELECT allocated_faculty_id FROM \`group\` WHERE group_id = ?`;
             db.query(groupStatusQuery, [urlGroupId], (statusErr, statusResult) => {
                 if (statusErr || statusResult.length === 0){
                     req.flash('error', 'Could not find your assigned group.');
                     return res.redirect(`/student/${paramStudentId}/homepage`);
                 }
                 if (statusResult[0].allocated_faculty_id) { // Should have been caught above, but safeguard
                      return next({ status: 500, message: "Inconsistent state: Group found allocated but dashboard query failed." });
                 } else {
                     return res.redirect(`/student/${paramStudentId}/form-submitted`);
                 }
             });
           return; // Stop further processing
         }

         const resultData = results[0];
         console.log("[Render Dashboard] Data for rendering:", resultData);

         const data = {
           projectTitle: resultData.project_title || "Not Assigned",
           projectDomain: resultData.project_domain || "Not Assigned",
            // Use faculty names from the query result
           faculty: resultData.faculty_first_name && resultData.faculty_last_name
             ? `Dr. ${resultData.faculty_first_name} ${resultData.faculty_last_name}` // Prefix faculty name
             : "Not Assigned", // Faculty check done in query WHERE clause
            // Use student names/details from query result (fresher than session potentially)
           studentName: `${resultData.student_first_name} ${resultData.student_last_name}`,
           degree: resultData.degree,
           branch: resultData.branch || 'N/A',
           semester: resultData.semester || 'N/A',
           studentId: sessionStudentId // Ensure studentId is available if needed
         };

         res.render("student/1student_dashboard.ejs", {
              data, // Pass the dashboard specific data
              groupId: urlGroupId, // Pass groupId for chat JS etc.
              studentUser: req.session.student,
              student: req.session.student // Pass full student session object
             // userId and userType automatically added via res.locals from index.js middleware
          });
       });
  });
};

//Student profile page
exports.getProfile = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("[Profile] Session Student ID:", sessionStudentId);
  console.log("[Profile] URL Param Student ID:", paramStudentId);

  // Security check
  if (sessionStudentId !== paramStudentId) {
    console.warn("[Profile] Unauthorized access attempt to profile.");
    return res.status(403).render("shared/error", {
      message: "Unauthorized access to student profile."
    });
  }

  const query = `SELECT * FROM student WHERE student_id = ?`;
  console.log("[Profile] Executing query:", query, "with ID:", paramStudentId);

  db.query(query, [paramStudentId], (err, result) => {
    if (err) {
      console.error("[Profile] DB Error while fetching profile:", err);
      return next({ status: 500, message: "Error fetching student profile" });
    }

    if (result.length === 0) {
      console.warn("[Profile] No student found with given ID.");
      return res.render("shared/error", {
        message: "Student not found"
      });
    }

    const student = result[0];
    console.log("[Profile] Fetched student data:", student);
    res.render("student/student_profile", { student });
  });
};

// GET: Show Edit Profile Form
exports.getEditProfile = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("[Edit Profile - GET] Session ID:", sessionStudentId);
  console.log("[Edit Profile - GET] Param ID:", paramStudentId);

  if (sessionStudentId !== paramStudentId) {
    console.warn("[Edit Profile - GET] Unauthorized access attempt.");
    return res.status(403).render("shared/error", { message: "Unauthorized access to edit profile." });
  }

  const query = `SELECT * FROM student WHERE student_id = ?`;
  console.log("[Edit Profile - GET] Executing query:", query);

  db.query(query, [paramStudentId], (err, result) => {
    if (err) {
      console.error("[Edit Profile - GET] DB error:", err);
      return next({ status: 500, message: "Database error" });
    }

    if (result.length === 0) {
      console.warn("[Edit Profile - GET] No student found.");
      return res.render("shared/error", { message: "Student not found" });
    }

    const student = result[0];
    console.log("[Edit Profile - GET] Student data fetched:", student);
    res.render("student/student_edit_profile", { student });
  });
};

// POST: Save Edited Profile
exports.postEditProfile = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("[Edit Profile - POST] Session ID:", sessionStudentId);
  console.log("[Edit Profile - POST] Param ID:", paramStudentId);

  if (sessionStudentId !== paramStudentId) {
    console.warn("[Edit Profile - POST] Unauthorized profile update attempt.");
    return res.status(403).render("shared/error", { message: "Unauthorized profile update attempt." });
  }

  const { first_name, last_name, contact_number } = req.body;
  console.log("[Edit Profile - POST] Received data:", { first_name, last_name, contact_number });

  const updateQuery = `
    UPDATE student 
    SET first_name = ?, last_name = ?, contact_number = ?
    WHERE student_id = ?
  `;
  console.log("[Edit Profile - POST] Executing update:", updateQuery);

  db.query(updateQuery, [first_name, last_name, contact_number, paramStudentId], (err, result) => {
    if (err) {
      console.error("[Edit Profile - POST] DB error while updating:", err);
      return next({ status: 500, message: "Error updating profile" });
    }

    console.log("[Edit Profile - POST] Profile updated successfully.");
    res.redirect(`/student/${paramStudentId}/profile`);
  });
};

// GET: Show Change Password Form
exports.getChangePassword = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("[Change Password - GET] Session ID:", sessionStudentId);
  console.log("[Change Password - GET] Param ID:", paramStudentId);

  if (sessionStudentId !== paramStudentId) {
    console.warn("[Change Password - GET] Unauthorized access attempt.");
    return res.status(403).render("shared/error", { message: "Unauthorized access to change password." });
  }

  res.render("student/student_change_password", { studentId: paramStudentId, student: req.session.student });
};

// POST: Handle Password Change
exports.postChangePassword = (req, res, next) => {
  const sessionStudent = req.session.student; // Updated session structure
  const sessionStudentId = sessionStudent?.student_id;
  const paramStudentId = parseInt(req.params.studentId);

  console.log("[Change Password - POST] Session ID:", sessionStudentId);
  console.log("[Change Password - POST] Param ID:", paramStudentId);

  if (sessionStudentId !== paramStudentId) {
    console.warn("[Change Password - POST] Unauthorized password change attempt.");
    return res.status(403).render("shared/error", { message: "Unauthorized password change attempt." });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;
  console.log("[Change Password - POST] Incoming data:", { currentPassword, newPassword, confirmPassword });

  if (newPassword !== confirmPassword) {
    console.warn("[Change Password - POST] Passwords do not match.");
    return res.render("student/student_change_password", {
      error: "New passwords do not match.",
      studentId: paramStudentId,
      student: req.session.student 
    });
  }

  const getQuery = `SELECT password FROM student WHERE student_id = ?`;
  console.log("[Change Password - POST] Executing password fetch query:", getQuery);

  db.query(getQuery, [paramStudentId], async (err, result) => {
    if (err) {
      console.error("[Change Password - POST] DB error fetching current password:", err);
      return next({ status: 500, message: "Database error fetching current password" });
    }

    if (result.length === 0) {
      console.warn("[Change Password - POST] Student not found.");
      return res.render("shared/error", { message: "Student not found" });
    }

    const isValid = await bcrypt.compare(currentPassword, result[0].password);
    if (!isValid) {
      console.warn("[Change Password - POST] Incorrect current password.");
      return res.render("student/student_change_password", {
        error: "Current password is incorrect.",
        studentId: paramStudentId,
        student: req.session.student 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = `UPDATE student SET password = ? WHERE student_id = ?`;
    console.log("[Change Password - POST] Executing update query:", updateQuery);

    db.query(updateQuery, [hashedNewPassword, paramStudentId], (err) => {
      if (err) {
        console.error("[Change Password - POST] Error updating password:", err);
        return next({ status: 500, message: "Error updating password" });
      }

      console.log("[Change Password - POST] Password updated successfully.");
      res.redirect(`/student/${paramStudentId}/profile`);
    });
  });
};
