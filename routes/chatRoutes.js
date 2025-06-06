// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// isAuthenticated (Updated to check all potential user types in session)
// isAuthenticated (Updated to check all potential user types in session)
const isAuthenticated = (req, res, next) => {
    if (req.session && (req.session.student || req.session.faculty || req.session.staff)) { // Added staff
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Please log in.' }); // Clearer message
};

// --- Set req.user based on session (after isAuthenticated) ---
const attachUserInfo = (req, res, next) => {
    if (req.session.student) {
      req.user = {
        id: req.session.student.student_id,
        type: 'student',
      };
    } else if (req.session.faculty) {
      req.user = {
        id: req.session.faculty.faculty_id,
        type: 'faculty',
      };
    } else if (req.session.staff) {
      req.user = {
        id: req.session.staff.staff_id,
        type: 'staff',
      };
    } else {
      return res.status(401).json({ error: 'User session not found' });
    }
    next();
  };
  

// isGroupMember
const isGroupMember = (req, res, next) => {
    // Get groupId from params primarily, fallback to body maybe needed for non-RESTful uses
    const groupId = req.params.groupId || req.body.groupId;
    if (!groupId) { return res.status(400).json({error: 'Group ID missing'}); }

    let userId, userType, query;
    if (req.session.student) { userId = req.session.student.student_id; userType = 'student'; query = `SELECT COUNT(*) AS count FROM \`group_members\` WHERE group_id = ? AND student_id = ?`; }
    else if (req.session.faculty) { userId = req.session.faculty.faculty_id; userType = 'faculty'; query = `SELECT COUNT(*) AS count FROM \`group\` WHERE group_id = ? AND allocated_faculty_id = ?`;}
    else if (req.session.staff) { userId = req.session.staff.staff_id; userType = 'staff'; query = `SELECT COUNT(*) AS count FROM \`group\` WHERE group_id = ? AND assisting_staff_id = ?`;} // <<< staff Check
    else { return res.status(401).json({ error: 'Unauthorized' }); }

    const params = [groupId, userId];
    console.log(`[Auth Check - isGroupMember] UserType: ${userType}, UserID: ${userId}, GroupID: ${groupId}`); // <-- ADD LOGGING

    db.query(query, params, (err, results) => {
        if (err) {
            console.error(`[DB Error - isGroupMember] UserType: ${userType}, UserID: ${userId}, GroupID: ${groupId}:`, err);
            return res.status(500).json({ error: 'Database error during authorization.' });
        }

        const count = results?.[0]?.count; // Safely access count
        console.log(`[Auth Check Result - isGroupMember] UserType: ${userType}, UserID: ${userId}, GroupID: ${groupId}, Count: ${count}`); // <-- ADD LOGGING

        if (count > 0) {
            // User is authorized, attach details to request and proceed
            req.user = { id: userId, type: userType };
            console.log(`[Auth Success - isGroupMember] Allowing access for ${userType} ${userId} to group ${groupId}`);
            next();
        } else {
            // User is not authorized for this group
            console.warn(`[Auth Failure - isGroupMember] Forbidden access attempt: ${userType} ${userId} to group ${groupId}`);
            res.status(403).json({ error: 'Forbidden: You are not authorized to access this group\'s resources.' });
        }
    });
};

// Faculty specific auth for pinning (EXAMPLE - Adapt to your roles/perms)
const isFaculty = (req, res, next) => {
    if (req.session.faculty?.faculty_id) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Action requires faculty privileges.' });
    }
};

// --- Multer Config (Same as before) ---
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("chatFile");

// --- Routes ---

// GET /chat/:groupId/messages (Updated Select & Formatting)
router.get(
  "/:groupId/messages",
  isAuthenticated,
  attachUserInfo,
  isGroupMember,
  async (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.user.id; // Current user from middleware
    const userType = req.user.type;

    const query = `
        SELECT
            cm.message_id, cm.group_id, cm.timestamp, cm.is_edited, cm.edited_timestamp,
            cm.reply_to_message_id, cm.is_pinned,
            cm.message_content, cm.file_path, cm.file_original_name,
            -- Senders
            s.student_id as sender_student_id, s.first_name as student_fname, s.last_name as student_lname,
            f.faculty_id as sender_faculty_id, f.first_name as faculty_fname, f.last_name as faculty_lname,
            st.staff_id as sender_staff_id, st.first_name as staff_fname, st.last_name as staff_lname, -- <<< Added staff Sender
            -- Reply Context
            reply.message_content AS reply_original_content,
            reply_s.first_name AS reply_student_fname, reply_s.last_name AS reply_student_lname,
            reply_f.first_name AS reply_faculty_fname, reply_f.last_name AS reply_faculty_lname,
            reply_st.first_name AS reply_staff_fname, reply_st.last_name AS reply_staff_lname -- <<< Added Reply staff Sender
        FROM chatmessage cm
        LEFT JOIN student s ON cm.sender_student_id = s.student_id
        LEFT JOIN faculty f ON cm.sender_faculty_id = f.faculty_id
        LEFT JOIN staff st ON cm.sender_staff_id = st.staff_id -- <<< JOIN staff
        -- Reply Context Joins
        LEFT JOIN chatmessage reply ON cm.reply_to_message_id = reply.message_id
        LEFT JOIN student reply_s ON reply.sender_student_id = reply_s.student_id
        LEFT JOIN faculty reply_f ON reply.sender_faculty_id = reply_f.faculty_id
        LEFT JOIN staff reply_st ON reply.sender_staff_id = reply_st.staff_id -- <<< JOIN Reply staff
        WHERE cm.group_id = ?
        ORDER BY cm.timestamp ASC`;

    try {
      const [messages] = await db.promise().query(query, [groupId]);

      // Format messages
      const formattedMessages = messages.map((msg) => {
        let senderId = null;
        let senderType = null;
        let senderName = "Unknown User";
        if (msg.sender_student_id) {
          senderId = msg.sender_student_id;
          senderType = "student";
          senderName = `${msg.student_fname} ${msg.student_lname}`;
        } else if (msg.sender_faculty_id) {
          senderId = msg.sender_faculty_id;
          senderType = "faculty";
          senderName = `Dr. ${msg.faculty_fname} ${msg.faculty_lname}`;
        } else if (msg.sender_staff_id) {
          senderId = msg.sender_staff_id;
          senderType = "staff";
          senderName = `${msg.staff_fname} ${msg.staff_lname} (staff)`;
        } // <<< Format staff Name

        let replyContext = null;
        if (msg.reply_to_message_id) {
          let replySenderName = "User";
          if (msg.reply_student_fname) {
            replySenderName = `${msg.reply_student_fname} ${msg.reply_student_lname}`;
          } else if (msg.reply_faculty_fname) {
            replySenderName = `Dr. ${msg.reply_faculty_fname} ${msg.reply_faculty_lname}`;
          } else if (msg.reply_staff_fname) {
            replySenderName = `${msg.reply_staff_fname} ${msg.reply_staff_lname} (staff)`;
          } // <<< Format Reply staff Name
          replyContext = {
            message_id: msg.reply_to_message_id,
            // Truncate original content for preview
            original_content: msg.reply_original_content
              ? msg.reply_original_content.length > 50
                ? msg.reply_original_content.substring(0, 47) + "..."
                : msg.reply_original_content
              : "[Original message unavailable]",
            sender_name: replySenderName,
          };
        }

        return {
          message_id: msg.message_id,
          group_id: msg.group_id,
          sender_id: senderId,
          sender_type: senderType,
          sender_name: senderName,
          message_content: msg.message_content,
          timestamp: msg.timestamp,
          is_edited: !!msg.is_edited,
          edited_timestamp: msg.edited_timestamp,
          reply_to_message_id: msg.reply_to_message_id,
          reply_context: replyContext,
          is_pinned: !!msg.is_pinned,
          is_file: !!msg.file_path,
          file_path: msg.file_path
            ? `/uploads/${path.basename(msg.file_path)}`
            : null,
          file_original_name: msg.file_original_name,
          is_owner: senderId === userId && senderType === userType, // Simplified ownership check
        };
      });
      res.json(formattedMessages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

// GET /chat/:groupId/messages/pinned (Updated Select)
router.get(
  "/:groupId/messages/pinned",
  isAuthenticated,
  attachUserInfo,
  isGroupMember,
  async (req, res) => {
    const groupId = req.params.groupId;
    const query = `
        SELECT
            cm.message_id, cm.group_id, cm.timestamp, cm.is_edited, cm.edited_timestamp,
            cm.is_pinned, cm.message_content, cm.file_path, cm.file_original_name,
            s.student_id as sender_student_id, s.first_name as student_fname, s.last_name as student_lname,
            f.faculty_id as sender_faculty_id, f.first_name as faculty_fname, f.last_name as faculty_lname,
            st.staff_id as sender_staff_id, st.first_name as staff_fname, st.last_name as staff_lname -- <<< Added staff
        FROM chatmessage cm
        LEFT JOIN student s ON cm.sender_student_id = s.student_id
        LEFT JOIN faculty f ON cm.sender_faculty_id = f.faculty_id
        LEFT JOIN staff st ON cm.sender_staff_id = st.staff_id -- <<< JOIN staff
        WHERE cm.group_id = ? AND cm.is_pinned = TRUE
        ORDER BY cm.timestamp DESC`;
    try {
      const [pinnedMessages] = await db.promise().query(query, [groupId]);
      const formatted = pinnedMessages.map((msg) => {
        let senderId = null;
        let senderType = null;
        let senderName = "Unknown";
        if (msg.sender_student_id) {
          senderId = msg.sender_student_id;
          senderType = "student";
          senderName = `${msg.student_fname || ""} ${
            msg.student_lname || ""
          }`.trim();
        } else if (msg.sender_faculty_id) {
          senderId = msg.sender_faculty_id;
          senderType = "faculty";
          senderName = `Dr. ${msg.faculty_fname || ""} ${
            msg.faculty_lname || ""
          }`.trim();
        } else if (msg.sender_staff_id) {
          senderId = msg.sender_staff_id;
          senderType = "staff";
          senderName = `${msg.staff_fname || ""} ${
            msg.staff_lname || ""
          } (staff)`.trim();
        } // <<< Format staff

        return {
          /* ... (formatting like above, include ownership based on req.user) ... */
          message_id: msg.message_id,
          group_id: msg.group_id,
          sender_id: senderId,
          sender_type: senderType,
          sender_name: senderName,
          message_content: msg.message_content,
          timestamp: msg.timestamp,
          is_edited: !!msg.is_edited,
          edited_timestamp: msg.edited_timestamp,
          is_pinned: !!msg.is_pinned,
          is_file: !!msg.file_path,
          file_path: msg.file_path
            ? `/uploads/${path.basename(msg.file_path)}`
            : null,
          file_original_name: msg.file_original_name,
          is_owner: senderId === req.user.id && senderType === req.user.type,
        };
      });
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
      res.status(500).json({ error: "Failed to fetch pinned messages" });
    }
  }
);

// POST /chat/:groupId/messages/:messageId/pin - Toggle Pin Status (NEW)
router.post(
  "/:groupId/messages/:messageId/pin",
  isAuthenticated,
  isFaculty,
  attachUserInfo,
  isGroupMember,
  async (req, res) => {
    // Note: isGroupMember also applied, ensures faculty is associated with the group
    const groupId = req.params.groupId;
    const messageId = req.params.messageId;

    try {
      // 1. Find the message to get its current pin state
      const [messages] = await db
        .promise()
        .query(
          "SELECT is_pinned FROM chatmessage WHERE message_id = ? AND group_id = ?",
          [messageId, groupId]
        );

      if (messages.length === 0) {
        return res
          .status(404)
          .json({ error: "Message not found in this group." });
      }
      const currentPinState = messages[0].is_pinned;
      const newPinState = !currentPinState; // Toggle the state

      // 2. Update the pin state in the DB
      const [updateResult] = await db
        .promise()
        .query("UPDATE chatmessage SET is_pinned = ? WHERE message_id = ?", [
          newPinState,
          messageId,
        ]);

      if (updateResult.affectedRows === 0) {
        // Should not happen based on previous check
        return res.status(500).json({ error: "Failed to update pin status." });
      }

      // 3. Emit event via Socket.IO to notify clients
      const io = req.app.locals.io; // Get socket.io instance
      if (io) {
        const roomName = `group_${groupId}`;
        const eventData = { messageId: messageId, isPinned: newPinState };
        io.to(roomName).emit("messagePinStatusChanged", eventData); // Emit specific event
        console.log(
          `Pin status change (${newPinState}) for message ${messageId} broadcasted to ${roomName}`
        );
      } else {
        console.error("Socket.IO instance not found during pin toggle!");
      }

      res.json({ success: true, messageId: messageId, isPinned: newPinState });
    } catch (error) {
      console.error(`Error toggling pin for message ${messageId}:`, error);
      res.status(500).json({ error: "Failed to toggle pin status." });
    }
  }
);

// --- POST /chat/:groupId/upload - UPDATED with validation ---
router.post("/:groupId/upload", 
    isAuthenticated,
    attachUserInfo,
    isGroupMember, 
    (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: "File upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided." });
    }

    // File uploaded successfully by multer, proceed
    const groupId = req.params.groupId;
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const senderId = req.user.id;
    const senderType = req.user.type;

    let studentIdField = null;
    let facultyIdField = null;
    let staffIdField = null;
    let senderName = "Unknown User"; // To be used for socket emission

    if (senderType === "student") {
      studentIdField = senderId;
      if (req.session.student)
        senderName = `${req.session.student.first_name} ${req.session.student.last_name}`;
    } else if (senderType === "faculty") {
      facultyIdField = senderId;
      if (req.session.faculty)
        senderName = `Dr. ${req.session.faculty.first_name} ${req.session.faculty.last_name}`;
    } else if (senderType === "staff") {
      staffIdField = senderId;
      if (req.session.staff)
        senderName = `${req.session.staff.first_name} ${req.session.staff.last_name} (staff)`;
    } // <<< Set staff fields
    else {
      // Invalid user type from middleware? Should not happen.
      fs.unlink(filePath, (e) => {
        if (e) console.error("Orphan file delete error:", e);
      });
      return res.status(500).json({ error: "Invalid user type identified." });
    }

    // Application Validation: Check exactly one sender is set
    const senderCount = [studentIdField, facultyIdField, staffIdField].filter(
      (id) => id !== null
    ).length;
    if (senderCount !== 1) {
      console.error(
        `Validation Error: Invalid sender state during upload for user ${senderId}. Count: ${senderCount}`
      );
      fs.unlink(filePath, (e) => {
        if (e) console.error("Orphan file delete error:", e);
      });
      return res
        .status(500)
        .json({ error: "Internal sender validation failed." });
    }

    // Save file info to DB
    const insertQuery = `
             INSERT INTO chatmessage (group_id, sender_student_id, sender_faculty_id, sender_staff_id, file_path, file_original_name)
             VALUES (?, ?, ?, ?, ?, ?) -- Added sender_staff_id column
         `;
    const values = [
      groupId,
      studentIdField,
      facultyIdField,
      staffIdField,
      filePath,
      originalName,
    ]; // Pass staff field

    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error("DB Error saving file message:", err);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error deleting orphaned file:", unlinkErr);
        });
        return res
          .status(500)
          .json({ error: "Failed to record file message." });
      }

      // Emit socket event (Requires io instance on app.locals - ensure setup in index.js)
      const socketIoInstance = req.app.locals.io;
      if (socketIoInstance) {
        const roomName = `group_${groupId}`;
        // Construct sender name based on type (assuming session has names)
        let senderName = "Unknown User";
        if (senderType === "student" && req.session.student) {
          senderName = `${req.session.student.first_name} ${req.session.student.last_name}`;
        } else if (senderType === "faculty" && req.session.faculty) {
          senderName = `Dr. ${req.session.faculty.first_name} ${req.session.faculty.last_name}`;
        }

        const newMessage = {
          message_id: result.insertId,
          group_id: groupId,
          sender_id: senderId,
          sender_type: senderType,
          sender_name: senderName, // Get name dynamically
          timestamp: new Date().toISOString(),
          is_file: true,
          file_path: `/uploads/${path.basename(filePath)}`, // Relative URL for client
          file_original_name: originalName,
          is_edited: false,
          edited_timestamp: null,
          reply_to_message_id: null,
          is_pinned: false,
        };
        socketIoInstance.to(roomName).emit("newMessage", newMessage);
        console.log(`File message broadcasted to room ${roomName}`);
      } else {
        console.error("Socket.IO instance not found on app locals!");
      }

      // Send success response
      res.json({
        success: true,
        message: "File uploaded successfully!",
        fileInfo: {
          /* ... as before ... */ message_id: result.insertId,
          file_path: `/uploads/${path.basename(filePath)}`,
          file_original_name: originalName,
          timestamp: new Date().toISOString(),
        },
      });
    });
  });
});

module.exports = router;
