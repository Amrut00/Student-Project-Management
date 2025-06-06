// socketHandler.js

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes for editing time window

module.exports = (io, db) => {

    // --- Helper function to get user details safely from socket session ---
    function getUserDetails(socket) {
        const session = socket.handshake.session;
        // Ensure session exists and has one of the known user types
        if (!session || (!session.student && !session.faculty && !session.staff)) {
            return null;
        }

        let userDetails = {};
        if (session.student) {
            userDetails.type = 'student';
            userDetails.id = session.student.student_id; // Ensure this path matches your session structure
            userDetails.name = `${session.student.first_name || ''} ${session.student.last_name || ''}`.trim();
        } else if (session.faculty) {
            userDetails.type = 'faculty';
            userDetails.id = session.faculty.faculty_id; // Ensure this path matches your session structure
            userDetails.name = `Dr. ${session.faculty.first_name || ''} ${session.faculty.last_name || ''}`.trim();
        } else if (session.staff) {
             userDetails.type = 'staff';
             userDetails.id = session.staff.staff_id; // Ensure this path matches your session structure
             userDetails.name = `${session.staff.first_name || ''} ${session.staff.last_name || ''} (staff)`.trim(); // Added "(Staff)" suffix
        } else {
            // Should not be reached if the initial check works, but acts as a safeguard
            return null;
        }
         // Ensure essential properties exist
        if (!userDetails.id || !userDetails.type) {
            console.error("getUserDetails failed: Missing ID or Type.", userDetails);
             return null;
         }
        return userDetails;
    }

     // --- Helper function for DB check: can the user access this group? ---
    async function isUserAuthorizedForGroup(user, groupId) {
        if (!user || !user.id || !user.type || !groupId) {
            console.warn("Authorization check failed: Missing user details or groupId.");
            return false;
        }

        let query = '';
        const params = [groupId, user.id];

        // Determine the correct authorization query based on user type
        switch (user.type) {
            case 'student':
                // Student needs to be a member of the group
                query = `SELECT COUNT(*) AS count FROM \`group_members\` WHERE group_id = ? AND student_id = ?`;
                break;
            case 'faculty':
                // Faculty needs to be the allocated faculty for the group
                query = `SELECT COUNT(*) AS count FROM \`group\` WHERE group_id = ? AND allocated_faculty_id = ?`;
                break;
            case 'staff':
                // Staff needs to be the assisting staff for the group
                 query = `SELECT COUNT(*) AS count FROM \`group\` WHERE group_id = ? AND assisting_staff_id = ?`;
                 break;
            default:
                 console.error(`Authorization check failed: Unknown user type "${user.type}"`);
                return false; // Reject unknown user types
        }

        try {
            // Execute the query using promise-based DB interaction
            const [results] = await db.promise().query(query, params);
            // Check if the count is greater than 0 (user is associated with the group)
            return results[0]?.count > 0;
        } catch (error) {
            // Log database errors during authorization check
            console.error(`DB Error checking group authorization for ${user.type} ${user.id} in group ${groupId}:`, error);
            return false; // Deny access if there's a DB error
        }
    }


    // --- Main Socket.IO connection handler ---
    io.on('connection', (socket) => {
        console.log('User attempting connection:', socket.id);
        // Authenticate the user based on session data
        const user = getUserDetails(socket);

        // If authentication fails (no valid user details), disconnect the socket
        if (!user) {
            console.log('Socket connection rejected: No valid session/user details found.', socket.id);
            socket.disconnect(true); // Force disconnection
            return; // Stop further processing for this socket
        }

        // Store validated user information on the socket object for easy access in event handlers
        socket.user = user;
        console.log(`Socket ${socket.id} authenticated as ${user.type} ID: ${user.id} (${user.name})`);

        // --- Socket Event Handlers ---

        // --- 'joinRoom' Event Handler ---
        // Allows a client to subscribe to updates for a specific group chat
        socket.on('joinRoom', async (groupId) => {
            if (!groupId) {
                 console.warn(`Join room attempt failed: No groupId provided by socket ${socket.id}`);
                 return; // Ignore if no group ID is provided
             }
             groupId = String(groupId).trim(); // Sanitize groupId

            // Verify the user is authorized to join this specific group's room
            const isAuthorized = await isUserAuthorizedForGroup(socket.user, groupId);

            if (isAuthorized) {
                // Define the room name based on the group ID
                const roomName = `group_${groupId}`;
                // Subscribe the socket to the room
                socket.join(roomName);
                console.log(`${socket.user.type} ${socket.user.id} (${socket.id}) successfully joined room: ${roomName}`);
                // OPTIONAL: Notify others in the room that a user has joined
                // socket.to(roomName).emit('userJoined', { userId: socket.user.id, userName: socket.user.name });
            } else {
                // Log unauthorized join attempts
                 console.warn(`Unauthorized join attempt: ${socket.user.type} ${socket.user.id} (${socket.id}) tried to join group ${groupId}`);
                 // Notify the client that they are not authorized
                 socket.emit('joinError', `You are not authorized to join the chat for group ${groupId}.`);
            }
        });

        // --- 'sendMessage' Event Handler ---
        // Handles receiving and processing new text messages (and replies) from clients
        socket.on('sendMessage', async (data) => {
             // Destructure expected data
             const { groupId, messageContent, replyToMessageId } = data || {};

            // 1. Input Validation
            if (!groupId || typeof messageContent !== 'string' || messageContent.trim() === '') {
                console.warn(`Invalid message data from ${socket.user?.type} ${socket.user?.id} (${socket.id}):`, data);
                socket.emit('messageError', 'Invalid message data provided.');
                return;
            }
            const trimmedMessage = messageContent.trim();
            if (trimmedMessage.length > 4000) { // Check message length limit
                socket.emit('messageError', 'Message exceeds maximum length.');
                return;
            }

            // 2. Authorization Check: Is the user actually in the specified room?
             const roomName = `group_${groupId}`;
            if (!socket.rooms.has(roomName)) {
                 console.warn(`Unauthorized message attempt by ${socket.user.type} ${socket.user.id} (${socket.id}) to group ${groupId} (not in room)`);
                 socket.emit('messageError', 'Authorization failed: Not joined to room.');
                 return;
            }

            // 3. Prepare Sender Fields (Ensuring exactly one is set)
            let studentIdField = null;
            let facultyIdField = null;
            let staffIdField = null;
            switch (socket.user.type) {
                case 'student': studentIdField = socket.user.id; break;
                case 'faculty': facultyIdField = socket.user.id; break;
                case 'staff': staffIdField = socket.user.id; break;
                default:
                     console.error(`sendMessage Error: Unknown user type "${socket.user.type}" for socket ${socket.id}`);
                     socket.emit('messageError', 'Internal server error: Unknown sender type.');
                    return;
            }
             // Application level check (should always be 1 based on above)
             if ([studentIdField, facultyIdField, staffIdField].filter(id => id !== null).length !== 1) {
                console.error(`Internal Validation Error: Invalid sender state for ${socket.user.type} ${socket.user.id}.`);
                socket.emit('messageError', 'Internal server error: Sender validation failed.');
                return;
             }

            // 4. Validate Reply ID (if provided)
             let validReplyId = null;
             if (replyToMessageId) {
                const replyIdNum = parseInt(replyToMessageId, 10);
                 if (!isNaN(replyIdNum)) {
                    try {
                         // Check if the message exists IN THE SAME GROUP
                        const [replyCheck] = await db.promise().query(
                             'SELECT message_id FROM chatmessage WHERE message_id = ? AND group_id = ?',
                             [replyIdNum, groupId]
                         );
                        if (replyCheck.length > 0) {
                             validReplyId = replyIdNum;
                        } else {
                             console.warn(`User ${socket.user.id} attempted reply to non-existent/wrong group message ${replyIdNum}`);
                             // Optionally notify user? For now, just ignore the invalid reply ID.
                         }
                    } catch (dbErr) {
                         console.error(`DB Error validating replyToMessageId ${replyToMessageId}:`, dbErr);
                         socket.emit('messageError', 'Database error during reply validation.');
                         return; // Stop processing if DB check failed
                     }
                 }
             }

            // 5. Save message to the Database
            try {
                 const insertQuery = `
                     INSERT INTO chatmessage (
                         group_id, sender_student_id, sender_faculty_id, sender_staff_id,
                         message_content, reply_to_message_id
                         -- Defaults handle timestamp, is_edited, edited_timestamp, is_pinned, is_file
                     ) VALUES (?, ?, ?, ?, ?, ?)
                 `;
                const values = [groupId, studentIdField, facultyIdField, staffIdField, trimmedMessage, validReplyId];
                const [result] = await db.promise().query(insertQuery, values);
                const insertedMessageId = result.insertId;
                const currentTimestamp = new Date().toISOString(); // Use consistent timestamp

                // 6. Prepare the message object for broadcasting to clients
                const newMessage = {
                     message_id: insertedMessageId,
                     group_id: groupId,
                     sender_id: socket.user.id,
                     sender_type: socket.user.type,
                     sender_name: socket.user.name, // Name added during authentication
                     message_content: trimmedMessage,
                     timestamp: currentTimestamp,
                     reply_to_message_id: validReplyId, // Include validated reply ID
                     // Set default/initial values for other fields
                     is_edited: false,
                     edited_timestamp: null,
                     is_pinned: false,
                     is_file: false
                 };

                // 7. Broadcast the new message to all clients in the room
                io.to(roomName).emit('newMessage', newMessage);
                console.log(`Message (ID: ${newMessage.message_id}) by ${socket.user.type} ${socket.user.id} broadcasted to room ${roomName}`);

            } catch (dbErr) {
                 // Handle potential database errors during insertion
                 console.error("DB Error saving new message:", dbErr);
                 socket.emit('messageError', 'Failed to send message due to database error.');
            }
        });

        // --- 'editMessage' Event Handler ---
        // Allows users to edit their own previously sent text messages within a time limit
        socket.on('editMessage', async (data) => {
            // Destructure and validate input data
            const { groupId, messageId, newMessageContent } = data || {};
             if (!groupId || !messageId || typeof newMessageContent !== 'string' || newMessageContent.trim() === '') {
                 console.warn(`Invalid edit data from ${socket.user?.id} (${socket.id}):`, data);
                 socket.emit('editError', { messageId, error: 'Invalid edit data provided.' });
                 return;
             }
            const trimmedEdit = newMessageContent.trim();
            if (trimmedEdit.length > 4000) { // Check length
                 socket.emit('editError', { messageId, error: 'Edited message exceeds maximum length.' });
                 return;
            }
             const messageIdNum = parseInt(messageId, 10);
             if(isNaN(messageIdNum)) {
                  socket.emit('editError', { messageId, error: 'Invalid message ID.' });
                  return;
              }


             // Authorization Check: Is user in the room?
             const roomName = `group_${groupId}`;
            if (!socket.rooms.has(roomName)) {
                 console.warn(`Unauthorized edit attempt by ${socket.user.id} (${socket.id}) on msg ${messageId} (not in room)`);
                 socket.emit('editError', { messageId: messageIdNum, error: 'Authorization failed.' });
                 return;
            }

            try {
                 // 1. Verify message exists, check ownership and edit time window
                 const selectQuery = `
                    SELECT sender_student_id, sender_faculty_id, sender_staff_id, timestamp
                    FROM chatmessage
                    WHERE message_id = ? AND group_id = ?
                 `;
                 // Note: Fetched staff sender ID now
                const [messages] = await db.promise().query(selectQuery, [messageIdNum, groupId]);

                // Message doesn't exist or isn't in this group
                 if (messages.length === 0) {
                      console.warn(`Edit failed: Message ${messageIdNum} not found in group ${groupId}.`);
                      socket.emit('editError', { messageId: messageIdNum, error: 'Message not found.' });
                      return;
                 }
                const msg = messages[0];

                // Check ownership: Does the sender type/ID match the message's sender?
                 const isOwner = (socket.user.type === 'student' && msg.sender_student_id === socket.user.id) ||
                                 (socket.user.type === 'faculty' && msg.sender_faculty_id === socket.user.id) ||
                                 (socket.user.type === 'staff' && msg.sender_staff_id === socket.user.id); // Check staff sender
                 if (!isOwner) {
                     console.warn(`Edit failed: User ${socket.user.id} attempted to edit msg ${messageIdNum} not owned by them.`);
                      socket.emit('editError', { messageId: messageIdNum, error: 'You can only edit your own messages.' });
                      return;
                 }

                // Check time window
                 const messageTime = new Date(msg.timestamp).getTime();
                 if (Date.now() - messageTime > EDIT_WINDOW_MS) {
                     console.log(`Edit failed: Edit window expired for msg ${messageIdNum}.`);
                      socket.emit('editError', { messageId: messageIdNum, error: `Edit time limit (${EDIT_WINDOW_MS / 60000} minutes) has passed.` });
                     return;
                 }

                // 2. Update the message in the Database
                const updateQuery = `
                    UPDATE chatmessage
                    SET message_content = ?, is_edited = TRUE, edited_timestamp = NOW()
                    WHERE message_id = ?
                 `; // is_edited flag set, timestamp updated
                const [updateResult] = await db.promise().query(updateQuery, [trimmedEdit, messageIdNum]);

                // Check if the update was successful
                if (updateResult.affectedRows === 0) {
                    // Should not normally happen if select worked, but good to check
                     console.error(`Edit DB update failed: Message ${messageIdNum} affected 0 rows.`);
                    socket.emit('editError', { messageId: messageIdNum, error: 'Failed to update message in database.' });
                    return;
                 }

                // 3. Broadcast the update to all clients in the room
                const editedTimestamp = new Date().toISOString(); // Get precise time for broadcast
                io.to(roomName).emit('messageEdited', {
                     messageId: messageIdNum,
                     newMessageContent: trimmedEdit,
                     isEdited: true,
                     editedTimestamp: editedTimestamp // Send timestamp of edit
                 });
                console.log(`Message ${messageIdNum} edited by ${socket.user.type} ${socket.user.id} and update broadcasted to ${roomName}`);

             } catch (dbErr) {
                 // Handle potential database errors during edit process
                 console.error(`DB Error editing message ${messageIdNum}:`, dbErr);
                 socket.emit('editError', { messageId: messageIdNum, error: 'Database error occurred during edit.' });
             }
        });


         // --- Listens for 'messagePinStatusChanged' (emitted by server from HTTP route) ---
         // Clients need this to update their UI when *someone else* pins/unpins
         socket.on('messagePinStatusChanged', (data) => {
             // The client-side chat.js should handle updating the UI based on this event
             console.log(`Client socket ${socket.id} received pin status change for msg ${data?.messageId}: ${data?.isPinned}`);
         });


        // --- 'leaveRoom' Event Handler ---
        // Allows a client to unsubscribe from a group's updates
        socket.on('leaveRoom', (groupId) => {
             if (!groupId) return;
            const roomName = `group_${groupId}`;
            // Check if socket was actually in the room before leaving
            if(socket.rooms.has(roomName)) {
                socket.leave(roomName);
                console.log(`${socket.user.type} ${socket.user.id} (${socket.id}) left room: ${roomName}`);
                 // OPTIONAL: Notify others in the room
                 // socket.to(roomName).emit('userLeft', { userId: socket.user.id, userName: socket.user.name });
             } else {
                 console.warn(`${socket.user.type} ${socket.user.id} (${socket.id}) tried to leave room ${roomName} but was not in it.`);
             }
        });

        // --- 'disconnect' Event Handler ---
        // Cleans up when a client disconnects (browser close, network issue, etc.)
        socket.on('disconnect', (reason) => {
            // User might be undefined if auth failed initially
            const userDesc = socket.user ? `${socket.user.type} ${socket.user.id} (${socket.user.name})` : 'Unauthenticated user';
            console.log(`User disconnected: ${socket.id} (${userDesc}). Reason: ${reason}`);
            // NOTE: Socket.IO automatically handles leaving all rooms on disconnect.
            // If you need to broadcast 'userLeft' to rooms they were in, you'd need
            // to track socket room memberships more actively on the server.
        });

    }); // End io.on('connection')

}; // End module.exports