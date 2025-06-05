const bcrypt = require("bcrypt");
const db = require("../utils/db");
const jwt = require("jsonwebtoken");

// --- Faculty Login ---
exports.loginFaculty = async (req, res, next) => { // Added next
  const { email, password } = req.body;

  if (!email || !password) {
      // Using flash messages for consistency
      req.flash('error', 'Please provide email and password.');
      return res.redirect("/faculty/login");
  }

  try {
    const query = "SELECT * FROM faculty WHERE email = ?";
    // Using promise() for consistency
    const [result] = await db.promise().query(query, [email]);

      if (result.length === 0) {
           req.flash('error', 'Invalid email or password.');
           return res.redirect("/faculty/login");
      }

      const faculty = result[0];
      const isPasswordValid = await bcrypt.compare(password, faculty.password);

      if (!isPasswordValid) {
           req.flash('error', 'Invalid email or password.');
           return res.redirect("/faculty/login");
      }

      // --- Login Success ---
       req.session.regenerate(async (regenErr) => {
           if (regenErr) {
               console.error("[Faculty Login] Session regeneration error:", regenErr);
               req.flash('error', 'Login failed due to session error.');
               return res.redirect('/faculty/login');
           }

           // Set session data
           req.session.faculty = {
              faculty_id: faculty.faculty_id,
              first_name: faculty.first_name,
              last_name: faculty.last_name,
              email: faculty.email,
              phone_number: faculty.phone_number,
              department: faculty.department,
              specialization: faculty.specialization,
              availability_status: faculty.availability_status
              // Add other faculty details if needed later
           };
          req.session.isAuthenticated = true;
          req.session.userType = 'faculty';
           console.log("[Faculty Login] Login successful, session regenerated for faculty:", faculty.faculty_id);

          // Save session BEFORE redirecting
          req.session.save((saveErr) => {
               if (saveErr) {
                   console.error("[Faculty Login] Session save error:", saveErr);
                   req.flash('error', 'Login failed during session save.');
                   return res.redirect('/faculty/login');
               }
               console.log(`[Faculty Login] Session saved for faculty ${faculty.faculty_id}, redirecting to dashboard...`);
               // Redirect to faculty dashboard
               res.redirect(`/faculty/${faculty.faculty_id}/dashboard/existing`);
          }); // End req.session.save()
       }); // End req.session.regenerate()

  } catch (error) {
      console.error("[Faculty Login] Error:", error);
       req.flash('error', 'An internal server error occurred during login.');
       // next({ status: 500, message: 'An internal server error occurred during faculty login.' });
       res.redirect('/faculty/login'); // Redirect back on error
  }
};

// --- Existing Groups Dashboard
exports.getExistingGroups = async (req, res) => {
    if (!req.session.faculty) {
      return res.redirect("/faculty/login");
    }
  
    const facultyId = req.params.facultyId;
  
    // Ensure faculty is accessing their own data
    if (req.session.faculty.faculty_id != facultyId) {
      return res.status(403).send("Unauthorized access");
    }
  
    // Query to fetch allocated groups with leader's degree & semester
    const groupsQuery = `
      SELECT g.group_id, g.project_title, 
             COALESCE(g.project_domain, 'Not Assigned') AS project_domain,  
             GROUP_CONCAT(CONCAT(s.first_name, ' ', s.last_name) SEPARATOR ', ') AS members,
             leader.degree, leader.semester
      FROM \`group\` g
      LEFT JOIN group_members gm ON g.group_id = gm.group_id
      LEFT JOIN student s ON gm.student_id = s.student_id
      LEFT JOIN student leader ON g.leader_id = leader.student_id
      WHERE g.allocated_faculty_id = ? AND g.status = 'Allocated'
      GROUP BY g.group_id, g.project_title, g.project_domain, leader.degree, leader.semester
      ORDER BY leader.degree, leader.semester, g.group_id`;
  
    // Query to fetch allocation limits
    const limitsQuery = `SELECT degree, semester, limit_count FROM faculty_allocation_limits`;
  
    try {
      const [groupsResults, limitsResults] = await Promise.all([
        db.promise().query(groupsQuery, [facultyId]),
        db.promise().query(limitsQuery)
      ]);
  
      const groups = groupsResults[0];
      const limits = limitsResults[0];
  
      // Object to store the highest-priority allocation limits
      const allocationLimits = {};
  
      // Default global limit (Lowest Priority)
      let globalLimit = null;
  
      // Process allocation limits with priority
      limits.forEach(limit => {
        const { degree, semester, limit_count } = limit;
        const key = `${degree}-${semester}`;
  
        if (degree === 'All Degrees' && semester === -1) {
          globalLimit = limit_count; // Global Default (Lowest Priority)
        } else {
          // Fix key format to maintain consistency
          allocationLimits[key] = limit_count;
        }
      });
  
      // Object to store allocated group counts
      const facultyAllocationCounts = {};
  
      // Object to store grouped data by degree & semester
      const groupedData = {};
  
      groups.forEach(group => {
        const categoryKey = `${group.degree} - Semester ${group.semester}`;
  
        if (!groupedData[categoryKey]) groupedData[categoryKey] = [];
  
        groupedData[categoryKey].push({
          groupNo: group.group_id,
          projectTitle: group.project_title,
          projectDomain: group.project_domain,
          studentName: group.members ? group.members.split(', ') : []
        });
  
        // Counting allocated groups
        facultyAllocationCounts[categoryKey] = (facultyAllocationCounts[categoryKey] || 0) + 1;
      });
  
      // Determine the highest-priority limit for each category
      const highestPriorityLimits = {};
  
      Object.keys(groupedData).forEach(category => {
        const [degree, semesterStr] = category.split(" - Semester ");
        const semester = parseInt(semesterStr.trim());
  
        // **Correct priority order:**
        let limit = 
            allocationLimits[`${degree}-${semester}`] ||  // 1. Exact Match (Highest Priority)
            allocationLimits[`${degree}--1`] ||         // 2. Degree-wide Limit (Fixed Key Format)
            globalLimit;                                 // 3. Global Default (Lowest Priority)
  
        if (limit !== undefined) {
        } else {
          limit = "No Limit Set";
        }
  
        highestPriorityLimits[category] = limit;
      });
  
      res.render('faculty/3faculty_existing_groups.ejs', { 
        groupedData, 
        faculty_id: facultyId,
        facultyAllocationCounts,
        allocationLimits: highestPriorityLimits,
        faculty: req.session.faculty
      });
  
    } catch (err) {
      console.error('Error fetching existing groups and allocation limits:', err);
      return res.status(500).send('Error fetching data');
    }
  };

// --- Unallocated Groups Dashboard 
exports.getUnallocatedGroups = async (req, res) => {
    if (!req.session.faculty) {
      return res.redirect("/faculty/login");
    }
  
    const facultyId = req.params.facultyId;
    const { error } = req.query; // Capture error from query string
  
      // Ensure faculty is accessing their own data
      if (req.session.faculty.faculty_id != facultyId) {
        return res.status(403).send("Unauthorized access");
      }
  
    try {
      // ✅ Query to fetch unallocated groups
      const groupsQuery = `
          SELECT g.group_id, g.project_title, 
                 COALESCE(g.project_domain, 'Not Assigned') AS project_domain, 
                 s_leader.degree, s_leader.semester,
                 CONCAT(s_leader.first_name, ' ', s_leader.last_name) AS leader_name,
                 GROUP_CONCAT(CONCAT(s.first_name, ' ', s.last_name) SEPARATOR ', ') AS members
          FROM \`group\` g
          JOIN student s_leader ON g.leader_id = s_leader.student_id
          JOIN group_members gm ON g.group_id = gm.group_id
          JOIN student s ON gm.student_id = s.student_id
          WHERE g.current_faculty_id = ? AND g.status = 'Pending'
          GROUP BY g.group_id, s_leader.degree, s_leader.semester, s_leader.first_name, s_leader.last_name`;
  
      // ✅ Query to fetch already allocated group counts
      const allocatedQuery = `
          SELECT s.degree, s.semester, COUNT(*) AS allocated_count
          FROM \`group\` g
          JOIN student s ON g.leader_id = s.student_id
          WHERE g.allocated_faculty_id = ?
          GROUP BY s.degree, s.semester`;
  
      // ✅ Query to fetch allocation limits
      const limitsQuery = `SELECT degree, semester, limit_count FROM faculty_allocation_limits`;
  
      // Execute queries concurrently
      const [groupResults, allocatedResults, limitsResults] = await Promise.all([
        db.promise().query(groupsQuery, [facultyId]),
        db.promise().query(allocatedQuery, [facultyId]),
        db.promise().query(limitsQuery),
      ]);
  
      // ✅ Process allocation limits
      const allocationLimits = {};
      let globalLimit = null; // Default to null
  
      limitsResults[0].forEach(limit => {
        const { degree, semester, limit_count } = limit;
        const key = `${degree}-${semester}`;
  
        if (degree === 'All Degrees' && semester === -1) {
          globalLimit = limit_count; // Global limit (Lowest Priority)
        } else {
          allocationLimits[key] = limit_count;
        }
      });
  
      // ✅ Process allocated group counts
      const facultyAllocationCounts = {};
      allocatedResults[0].forEach(row => {
        facultyAllocationCounts[`${row.degree}-${row.semester}`] = row.allocated_count;
      });
  
      // ✅ Group unallocated groups for rendering
      const groupedData = {};
      groupResults[0].forEach(group => {
        const category = `${group.degree} - Semester ${group.semester}`;
        const allocatedKey = `${group.degree}-${group.semester}`;
  
        if (!groupedData[category]) {
          groupedData[category] = { groups: [], allocationLimit: 0, allocatedCount: 0 };
        }
  
        groupedData[category].groups.push({
          groupNo: group.group_id,
          projectTitle: group.project_title,
          projectDomain: group.project_domain,
          studentName: group.members ? group.members.split(', ') : [],
        });
  
        // ✅ Determine the correct allocation limit with priority order
        groupedData[category].allocationLimit =
          allocationLimits[`${group.degree}-${group.semester}`] ||  // 1. Exact match (Highest Priority)
          allocationLimits[`${group.degree}--1`] ||                // 2. Degree-wide Limit (Corrected Key Format)
          globalLimit ||                                           // 3. Global Default (Lowest Priority)
          "No Limit Set";                                          // 4. If no limit is found
  
        groupedData[category].allocatedCount = facultyAllocationCounts[allocatedKey] || 0; // ✅ Fix for undefined counts
      });
  
      res.render('faculty/3faculty_to_be_allocated_groups.ejs', {
        groupedData,
        faculty_id: facultyId,
        allocationLimits,
        facultyAllocationCounts,
        globalLimit,
        error,
        faculty: req.session.faculty
      });
  
    } catch (err) {
      console.error('❌ Error fetching unallocated groups:', err);
      res.status(500).send('Error fetching data');
    }
  };

// --- Faculty Profile Management
exports.getFacultyProfile = (req, res) => {
    const facultyId = req.params.facultyId;
  
    if (!req.session.faculty || req.session.faculty.faculty_id != facultyId) {
      return res.status(403).send("Unauthorized");
    }
  
    const query = "SELECT * FROM faculty WHERE faculty_id = ?";
    db.query(query, [facultyId], (err, results) => {
      if (err) return res.status(500).send("Database error");
      if (results.length === 0) return res.status(404).send("Faculty not found");
  
      res.render("faculty/faculty_profile", {
        faculty: results[0],
        alert: req.query.alert || null,
        facultySession: req.session.faculty,
        faculty: req.session.faculty
      });
    });
};
  
exports.getEditFacultyProfile = (req, res) => {
    const facultyId = req.params.facultyId;
  
    if (!req.session.faculty || req.session.faculty.faculty_id != facultyId) {
      return res.status(403).send("Unauthorized");
    }
  
    db.query("SELECT * FROM faculty WHERE faculty_id = ?", [facultyId], (err, result) => {
      if (err) return res.status(500).send("Database error");
      if (result.length === 0) return res.status(404).send("Faculty not found");
  
      res.render("faculty/faculty_edit_profile", {
        faculty: result[0],
        faculty: req.session.faculty
      });
    });
};
  
exports.postEditFacultyProfile = (req, res) => {
    const facultyId = req.params.facultyId;
  
    if (!req.session.faculty || req.session.faculty.faculty_id != facultyId) {
      return res.status(403).send("Unauthorized");
    }
  
    const { first_name, last_name, phone_number, department, specialization } = req.body;
  
    const query = `
      UPDATE faculty SET first_name = ?, last_name = ?, phone_number = ?, department = ?, specialization = ?
      WHERE faculty_id = ?
    `;
  
    db.query(query, [first_name, last_name, phone_number, department, specialization, facultyId], (err) => {
      if (err) return res.status(500).send("Database error");
      return res.redirect(`/faculty/${facultyId}/profile?alert=Profile updated successfully`);
    });
}; 

exports.getChangeFacultyPassword = (req, res) => {
    const facultyId = req.params.facultyId;
  
    if (!req.session.faculty || req.session.faculty.faculty_id != facultyId) {
      return res.status(403).send("Unauthorized");
    }
  
    res.render("faculty/faculty_change_password", {
      faculty_id: facultyId,
      alert: req.query.alert || null,
      faculty: req.session.faculty
    });
};
  
exports.postChangeFacultyPassword = async (req, res) => {
    const facultyId = req.params.facultyId;
  
    if (!req.session.faculty || req.session.faculty.faculty_id != facultyId) {
      return res.status(403).send("Unauthorized");
    }
  
    const { old_password, new_password, confirm_password } = req.body;
  
    db.query("SELECT password FROM faculty WHERE faculty_id = ?", [facultyId], async (err, results) => {
      if (err) return res.status(500).send("Database error");
  
      const currentHash = results[0]?.password;
      if (!currentHash) return res.status(404).send("Faculty not found");
  
      const isMatch = await bcrypt.compare(old_password, currentHash);
  
      if (!isMatch) {
        return res.redirect(`/faculty/${facultyId}/change-password?alert=Old password is incorrect`);
      }
  
      if (new_password !== confirm_password) {
        return res.redirect(`/faculty/${facultyId}/change-password?alert=Passwords do not match`);
      }
  
      const newHash = await bcrypt.hash(new_password, 10);
      db.query("UPDATE faculty SET password = ? WHERE faculty_id = ?", [newHash, facultyId], (err) => {
        if (err) return res.status(500).send("Database error");
        return res.redirect(`/faculty/${facultyId}/profile?alert=Password changed successfully`);
      });
    });
};

// --- Group Actions (Choose/Pass)
exports.chooseGroup = (req, res) => {
    const { groupId, facultyId } = req.params;
  
    db.getConnection((err, connection) => {
      if (err) {
        return res.status(500).send("Database connection error");
      }
  
      connection.beginTransaction((err) => {
        if (err) {
          console.error("❌ Error starting transaction:", err);
          connection.release();
          return res.status(500).send("Transaction error");
        }
  
        // Step 1: Get group's degree & semester
        connection.query(
          `SELECT s_leader.degree, s_leader.semester 
           FROM \`group\` g
           JOIN student s_leader ON g.leader_id = s_leader.student_id
           WHERE g.group_id = ?`,
          [groupId],
          (err, groupResult) => {
            if (err || groupResult.length === 0) {
              console.error("❌ Error fetching group details:", err);
              return connection.rollback(() => {
                connection.release();
                res.status(500).send("Error fetching group details");
              });
            }
  
            const { degree, semester } = groupResult[0];
  
            // Step 2: Fetch allocation limits (No faculty_id filtering)
            console.log(`🔍 Fetching global allocation limits...`);
            connection.query(
              `SELECT degree, semester, limit_count 
               FROM faculty_allocation_limits`,
              (err, limitResults) => {
                if (err) {
                  console.error("❌ Error fetching allocation limits:", err);
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).send("Error fetching allocation limits");
                  });
                }
  
                let allocationLimit = 5; // Default limit
                const allocationLimits = {};
  
                limitResults.forEach((row) => {
                  allocationLimits[`${row.degree}_${row.semester}`] = row.limit_count;
                });
  
                // Determine the correct allocation limit
                const degreeSemesterKey = `${degree}_${semester}`;
                const generalSemesterKey = `${degree}_-1`;
                const allDegreesKey = `All Degrees_${semester}`;
                const allDegreesGeneralKey = `All Degrees_-1`;
  
                if (allocationLimits[allDegreesGeneralKey] !== undefined) {
                  allocationLimit = allocationLimits[allDegreesGeneralKey];
                }
                if (allocationLimits[allDegreesKey] !== undefined) {
                  allocationLimit = allocationLimits[allDegreesKey];
                }
                if (allocationLimits[generalSemesterKey] !== undefined) {
                  allocationLimit = allocationLimits[generalSemesterKey];
                }
                if (allocationLimits[degreeSemesterKey] !== undefined) {
                  allocationLimit = allocationLimits[degreeSemesterKey];
                }
  
                // Step 3: Count currently allocated groups for this faculty
                console.log(`🔍 Counting currently allocated groups for Faculty ID: ${facultyId}`);
                connection.query(
                  `SELECT COUNT(*) AS allocatedCount
                   FROM \`group\` g
                   JOIN student s_leader ON g.leader_id = s_leader.student_id
                   WHERE g.allocated_faculty_id = ? 
                   AND (s_leader.degree = ? OR 'All Degrees' = ?) 
                   AND (s_leader.semester = ? OR -1 = ?);`,
                  [facultyId, degree, degree, semester, semester],
                  (err, countResult) => {
                    if (err) {
                      console.error("❌ Error counting allocated groups:", err);
                      return connection.rollback(() => {
                        connection.release();
                        res.status(500).send("Error counting allocated groups");
                      });
                    }
  
                    const allocatedCount = countResult[0]?.allocatedCount || 0;
  
                    // Step 4: Check if faculty has reached the allocation limit
                    if (allocatedCount >= allocationLimit) {
                      console.warn(`⚠️ Faculty ID: ${facultyId} has reached the allocation limit!`);
                      connection.release();
                      return res.redirect(`/faculty/${facultyId}/dashboard/unallocated?error=LimitReached`);
                    }
  
                    // Step 5: Allocate the group
                    connection.query(
                      `UPDATE \`group\` 
                       SET allocated_faculty_id = ?, current_faculty_id = NULL, status = "Allocated" 
                       WHERE group_id = ?`,
                      [facultyId, groupId],
                      (err) => {
                        if (err) {
                          console.error("❌ Error allocating group:", err);
                          return connection.rollback(() => {
                            connection.release();
                            res.status(500).send("Error allocating group");
                          });
                        }
  
                        // Step 5.5: Update status of students in the group
                        connection.query(
                          `UPDATE student 
                          SET status = 'Allocated' 
                          WHERE student_id IN (
                            SELECT student_id FROM group_members WHERE group_id = ?
                          )`,
                          [groupId],
                          (err) => {
                            if (err) {
                              console.error("❌ Error updating student status:", err);
                              return connection.rollback(() => {
                                connection.release();
                                res.status(500).send("Error updating student status");
                              });
                            }
  
                            // Step 6: Commit transaction
                            connection.commit((err) => {
                              if (err) {
                                console.error("❌ Transaction commit failed:", err);
                                return connection.rollback(() => {
                                  connection.release();
                                  res.status(500).send("Transaction commit failed");
                                });
                              } else {
                                connection.release();
                                res.redirect(`/faculty/${facultyId}/dashboard/existing`);
                              }
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
};
  
exports.passGroup = (req, res) => {
    const { groupId, facultyId } = req.params;
  
    db.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection:", err);
        return res.status(500).send("Database connection error");
      }
  
      console.log(`Processing pass request for group ${groupId} by faculty ${facultyId}`);
  
      connection.query(
        `SELECT faculty_id FROM group_faculty_preferences 
         WHERE group_id = ? ORDER BY preference_order`,
        [groupId],
        (err, preferences) => {
          if (err) {
            connection.release();
            console.error("Error fetching preferences:", err);
            return res.status(500).send("Error fetching preferences");
          }
  
          console.log("Faculty preferences for group:", preferences);
  
          const facultyIndex = preferences.findIndex((pref) => pref.faculty_id == facultyId);
  
          if (facultyIndex === -1) {
            connection.release();
            console.error("Faculty preference not found for this group.");
            return res.status(400).send("Faculty preference not found for this group");
          }
  
          const nextFaculty = preferences[facultyIndex + 1];
  
          if (nextFaculty) {
            console.log(`Passing group ${groupId} to next preferred faculty ${nextFaculty.faculty_id}`);
  
            connection.query(
              `UPDATE \`group\` SET current_faculty_id = ? WHERE group_id = ?`,
              [nextFaculty.faculty_id, groupId],
              (err) => {
                connection.release();
                if (err) {
                  console.error("Error updating current faculty:", err);
                  return res.status(500).send("Error updating current faculty");
                }
                res.redirect(`/faculty/${facultyId}/dashboard/unallocated`);
              }
            );
          } else {
            console.log(`No more preferences left. Assigning group ${groupId} randomly.`);
  
            connection.query(
              `SELECT s.degree, s.semester 
               FROM \`group\` g
               JOIN student s ON g.leader_id = s.student_id
               WHERE g.group_id = ?`,
              [groupId],
              (err, groupResult) => {
                if (err || groupResult.length === 0) {
                  connection.release();
                  console.error("Error fetching group details:", err);
                  return res.status(500).send("Error fetching group details");
                }
  
                const { degree, semester } = groupResult[0];
                console.log(`Group ${groupId} details - Degree: ${degree}, Semester: ${semester}`);
  
                // **NEW STEP: Fetch faculty allocation limits dynamically**
                connection.query(
                  `SELECT limit_count FROM faculty_allocation_limits 
                   WHERE (degree = ? OR degree = "All Degrees") 
                   AND (semester = ? OR semester = -1) 
                   ORDER BY (degree = "All Degrees") ASC, (semester = -1) ASC 
                   LIMIT 1`,
                  [degree, semester],
                  (err, limitResult) => {
                    if (err || limitResult.length === 0) {
                      connection.release();
                      console.error(`No applicable limit found for degree ${degree}, semester ${semester}`);
                      return res.status(500).send("No faculty allocation limit found");
                    }
  
                    const applicableLimit = limitResult[0].limit_count;
                    console.log(`Applicable faculty limit for group ${groupId}: ${applicableLimit}`);
  
                    connection.query(
                      `SELECT f.faculty_id 
                       FROM faculty f
                       LEFT JOIN (
                         SELECT allocated_faculty_id, COUNT(*) AS allocatedCount
                         FROM \`group\`
                         WHERE allocated_faculty_id IS NOT NULL
                         GROUP BY allocated_faculty_id
                       ) g_count ON f.faculty_id = g_count.allocated_faculty_id
                       WHERE f.availability_status = "Available"
                       AND (g_count.allocatedCount IS NULL OR g_count.allocatedCount < ?)
                       ORDER BY RAND() 
                       LIMIT 1`,
                      [applicableLimit],
                      (err, facultyResult) => {
                        if (err || facultyResult.length === 0) {
                          connection.release();
                          console.error("No available faculty within limit:", err);
                          return res.status(500).send("No available faculty found within limit");
                        }
                    
                        const randomFacultyId = facultyResult[0].faculty_id;
                        console.log(`Randomly selected faculty for group ${groupId}: ${randomFacultyId}`);
                    
                        connection.beginTransaction((err) => {
                          if (err) {
                            connection.release();
                            return res.status(500).send("Transaction error");
                          }
  
                          connection.query(
                            `UPDATE \`group\` 
                             SET allocated_faculty_id = ?, current_faculty_id = NULL, status = "Allocated" 
                             WHERE group_id = ?`,
                            [randomFacultyId, groupId],
                            (err) => {
                              if (err) {
                                return connection.rollback(() => {
                                  connection.release();
                                  console.error("Error updating group allocation:", err);
                                  res.status(500).send("Error updating group allocation");
                                });
                              }
  
                              console.log(`Group ${groupId} successfully allocated to faculty ${randomFacultyId}`);
  
                              connection.query(
                                `UPDATE student 
                                 SET status = "Allocated" 
                                 WHERE student_id IN (
                                   SELECT student_id FROM group_members WHERE group_id = ?
                                 ) 
                                 AND NOT EXISTS (
                                   SELECT 1 FROM \`group\` g 
                                   JOIN group_members gm ON g.group_id = gm.group_id 
                                   WHERE gm.student_id = Student.student_id 
                                   AND g.status = 'Pending'
                                 )`,
                                [groupId],
                                (err) => {
                                  if (err) {
                                    return connection.rollback(() => {
                                      connection.release();
                                      console.error("Error updating student statuses:", err);
                                      res.status(500).send("Error updating student statuses");
                                    });
                                  }
  
                                  console.log(`Student statuses updated for group ${groupId}`);
  
                                  connection.commit((err) => {
                                    if (err) {
                                      return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).send("Transaction commit error");
                                      });
                                    }
                                    connection.release();
                                    console.log(`Transaction committed successfully for group ${groupId}`);
                                    res.redirect(`/faculty/${facultyId}/dashboard/unallocated`);
                                  });
                                }
                              );
                            }
                          );
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        }
      );
    });
};

// --- Assign Staff Section ---

// Fetch all staff members for the dropdown
exports.getStaffList = (req, res) => {
    if (!req.session || !req.session.faculty) {
      return res.status(401).send("Unauthorized: Please log in first");
    }
  
    const { facultyId, groupId } = req.params;
  
    // ✅ Ensure URL facultyId matches session
    if (parseInt(facultyId) !== req.session.faculty.faculty_id) {
      console.warn(`[getStaffList] Faculty ID mismatch: Session ${req.session.faculty.faculty_id}, Param ${facultyId}`);
      return res.status(403).send("Unauthorized access to staff list");
    }
  
    const query = "SELECT staff_id, first_name, last_name FROM staff";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Database error");
      }
  
      res.render("faculty/3faculty_group_dashboard.ejs", {
        staffList: results,
        faculty_id: facultyId,
        group_id: groupId,
        faculty: req.session.faculty
      });
    });
  };  

  exports.getGroupDetails = (req, res) => {
    // Authentication check: Ensure a faculty user is logged in
    if (!req.session || !req.session.faculty) {
      req.flash('error', 'Please log in first.'); // Use flash for login redirect
      return res.redirect('/faculty/login');
    }

    // Get IDs from parameters and session
    const { groupId } = req.params; // groupId from URL
    const facultyId = parseInt(req.params.facultyId, 10); // facultyId from URL, ensure number
    const sessionFacultyId = req.session.faculty.faculty_id; // Logged-in user's ID

    // Authorization check: Ensure the logged-in faculty matches the ID in the URL
    if (facultyId !== sessionFacultyId) {
      console.warn(`[getGroupDetails] Faculty ID mismatch: Session ${sessionFacultyId}, Param ${facultyId}. Unauthorized access attempt.`);
      req.flash('error', 'Unauthorized access.');
      // Redirect to their own dashboard or a generic error page
      return res.redirect(`/faculty/${sessionFacultyId}/dashboard/existing`);
    }

    // Query to fetch group details, faculty name, and members
    const query = `
      SELECT g.project_title, g.project_domain,
             f.first_name AS faculty_first_name, f.last_name AS faculty_last_name,
             GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.first_name SEPARATOR ', ') AS members
      FROM \`group\` g
      -- Make Faculty LEFT JOIN in case allocated_faculty_id is somehow null but shouldn't be here
      LEFT JOIN faculty f ON g.allocated_faculty_id = f.faculty_id
      -- LEFT JOIN Members to handle groups with potentially no members yet assigned
      LEFT JOIN group_members gm ON g.group_id = gm.group_id
      LEFT JOIN student s ON gm.student_id = s.student_id
      WHERE g.group_id = ? AND g.allocated_faculty_id = ? -- Verify faculty assignment again
      GROUP BY g.group_id, g.project_title, g.project_domain, f.first_name, f.last_name;
    `;

    db.query(query, [groupId, facultyId], (err, groupResults) => {
        if (err) {
            console.error("Error fetching group details for faculty:", err);
            req.flash('error', 'Error loading group details.');
            return res.redirect(`/faculty/${facultyId}/dashboard/existing`); // Redirect back to dashboard
        }

        // Check if group was found and faculty is correctly assigned
        if (groupResults.length === 0) {
            req.flash('error', 'Group not found or you are not assigned to it.');
            return res.redirect(`/faculty/${facultyId}/dashboard/existing`);
        }

        const group = groupResults[0];
        const membersList = group.members ? group.members.split(", ") : []; // Handle null members safely

        // Fetch staff list for the dropdown (async operation needed)
        db.query("SELECT staff_id, first_name, last_name FROM staff", (staffErr, staffResults) => {
            if (staffErr) {
                console.error("Error fetching staff list:", staffErr);
                req.flash('error', 'Could not load staff list for assignment.');
                // Still render the page, but maybe disable the assign button?
                staffResults = []; // Provide empty list
                // Decide if this is a critical error or not. For now, render with warning.
            }

            // --- RENDER THE PAGE ---
            res.render("faculty/3faculty_group_dashboard.ejs", {
                // Group Data
                projectTitle: group.project_title || 'N/A',
                projectDomain: group.project_domain || "Not Assigned",
                facultyName: `${group.faculty_first_name} ${group.faculty_last_name}`,
                members: membersList,
                // IDs for URLs, forms, and JavaScript
                groupId: groupId,             // Changed from group_id to groupId for consistency
                faculty_id: facultyId,       // Keeping faculty_id for assign staff form URL if needed
                // *** Explicitly passing user context for chat.js hidden fields ***
                userId: sessionFacultyId,     // Use the session's faculty ID
                userType: 'faculty',         // Set the type correctly
                // Staff List for Dropdown
                staffList: staffResults,
                // Session faculty data (for profile icon, etc.)
                faculty: req.session.faculty
                // Add flash messages if needed (handled by res.locals generally)
            });
        }); // End staff list query
    }); // End group details query
};
  
// Assign a staff member to a group
exports.assignGroupToStaff = (req, res) => {
    if (!req.session || !req.session.faculty) {
      return res.status(401).send("Unauthorized: Please log in first");
    }
  
    const { facultyId, groupId } = req.params;
    const { staffId } = req.body;
  
    // ✅ Ensure session faculty matches URL param
    if (parseInt(facultyId) !== req.session.faculty.faculty_id) {
      console.warn(`[assignGroupToStaff] Faculty ID mismatch: Session ${req.session.faculty.faculty_id}, Param ${facultyId}`);
      return res.status(403).send("Unauthorized access to assign group");
    }
  
    db.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting database connection:", err);
        return res.status(500).send("Database connection error");
      }
  
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          console.error("Transaction error:", err);
          return res.status(500).send("Transaction error");
        }
  
        const updateGroupQuery = "UPDATE `group` SET assisting_staff_id = ? WHERE group_id = ?";
        connection.query(updateGroupQuery, [staffId, groupId], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error("Error assigning group to staff:", err);
              res.status(500).send("Error assigning group");
            });
          }
  
          const updateStudentQuery = `
            UPDATE student 
            SET group_id = 
              CASE 
                WHEN FIND_IN_SET(?, group_id) = 0 THEN CONCAT(group_id, ',', ?) 
                ELSE group_id
              END
            WHERE student_id IN (SELECT student_id FROM group_members WHERE group_id = ?)
          `;
  
          connection.query(updateStudentQuery, [groupId, groupId, groupId], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                console.error("Error updating students' group_id:", err);
                res.status(500).send("Error updating students' group information");
              });
            }
  
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error("Transaction commit error:", err);
                  res.status(500).send("Transaction commit error");
                });
              }
              connection.release();
              res.redirect(`/faculty/${facultyId}/dashboard/existing`);
            });
          });
        });
      });
    });
};
