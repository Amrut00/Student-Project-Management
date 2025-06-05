// public/js/chat.js
console.log(">>> chat.js script loaded and executing <<<"); 
document.addEventListener('DOMContentLoaded', () => {
    const socket = io({ // Optional: Add transports for reliability
        // transports: ['websocket', 'polling']
    });

    // --- DOM Elements ---
    const groupIdElement = document.getElementById('groupId');
    const userIdElement = document.getElementById('userId');
    const userTypeElement = document.getElementById('userType');

    // Check if essential elements exist before proceeding
    if (!groupIdElement || !userIdElement || !userTypeElement) {
        console.error("Chat initialization failed: Missing required hidden input fields (groupId, userId, userType).");
        // Optionally display an error message to the user on the page
        const body = document.querySelector('body');
        if (body) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Chat Error: Cannot load user or group information. Please refresh or contact support.';
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '10px';
            errorDiv.style.backgroundColor = '#ffe0e0';
            errorDiv.style.border = '1px solid red';
            errorDiv.style.textAlign = 'center';
            // Prepend to body or a designated error area
             if (body.firstChild) body.insertBefore(errorDiv, body.firstChild); else body.appendChild(errorDiv);
        }
        return; // Stop execution if critical info is missing
    }


    const groupId = groupIdElement.value;
    const currentUserId = parseInt(userIdElement.value, 10); // Ensure it's a number
    const currentUserType = userTypeElement.value; // 'student', 'faculty', or 'staff'

    const pinnedMessagesContainer = document.getElementById('pinnedMessages');
    const pinnedMessagesList = document.getElementById('pinnedMessagesList');
    const messagesArea = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput'); // Changed to textarea
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const fileInput = document.getElementById('fileInput');
    const sendFileBtn = document.getElementById('sendFileBtn');
    const emojiBtn = document.getElementById('emojiBtn');
    const uploadStatus = document.getElementById('uploadStatus');

    const replyContextIndicator = document.getElementById('replyContextIndicator');
    const replyUserName = document.getElementById('replyUserName');
    const replyMessagePreview = document.getElementById('replyMessagePreview');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');

    const editingIndicator = document.getElementById('editingIndicator');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    // Check if all chat-specific elements exist
    if (!messagesArea || !messageInput || !sendMessageBtn || !pinnedMessagesList || !replyContextIndicator) {
        console.error("Chat initialization failed: Missing essential chat UI elements.");
        return; // Stop if the chat interface itself is broken
    }


    // --- State Variables ---
    let currentReplyToId = null;
    let currentEditingId = null;
    const messageCache = new Map(); // Store fetched messages by ID for quick lookup
    const EDIT_WINDOW_MINS = 5; // Client-side check (should ideally match server)

    // --- Helper Functions ---
    function scrollToBottom(element = messagesArea) {
         if (!element) return;
         // Using requestAnimationFrame helps prevent layout thrashing during rapid message additions
        requestAnimationFrame(() => {
             element.scrollTop = element.scrollHeight;
        });
    }

    function formatTimestamp(isoString) {
         if (!isoString) return '';
         try {
             const date = new Date(isoString);
              // Example format: "Jun 25, 23, 10:30 AM"
             const options = { year:'2-digit', month:'short', day:'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
             return date.toLocaleString(undefined, options);
          } catch (e) {
             console.error("Error formatting timestamp:", isoString, e);
              return "Invalid date";
          }
     }

    // Basic HTML escaping (use a library like DOMPurify for production robustness)
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return ''; // Handle non-string inputs gracefully
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "'");
     }

     // Renders message content safely, handling files and linkifying text
     function renderMessageContentHTML(msg) {
         if (msg.is_file && msg.file_path) {
             // Ensure file path is correctly formatted (though escaping is less critical for href attribute values usually)
             const safeFilePath = escapeHtml(msg.file_path);
             const safeOriginalName = escapeHtml(msg.file_original_name || 'Download File');
             // Could add file type icons here based on extension
             return `<a href="${safeFilePath}" target="_blank" download="${safeOriginalName}" class="chat-file-link">📄 ${safeOriginalName}</a>`;
         } else if (msg.message_content) {
              // Escape the content first, *then* linkify basic URLs
             const escapedContent = escapeHtml(msg.message_content);
             const linkified = escapedContent.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');
             return linkified; // Be cautious if allowing more complex HTML later
         } else {
              return ''; // Empty content if neither file nor text
          }
     }

    // --- Message Rendering / Updating ---
    // Creates or updates a message element in the MAIN chat area
    function renderOrUpdateMessage(msg) {
         // Validate essential message data
         if (!msg || !msg.message_id) {
             console.warn("Attempted to render invalid message object:", msg);
             return null; // Don't attempt to render if basic info is missing
         }
        messageCache.set(msg.message_id, msg); // Update cache regardless of render location

        // --- Find or Create Element ---
        let messageElement = messagesArea.querySelector(`.message[data-message-id="${msg.message_id}"]`);
        const isNew = !messageElement;

        if (isNew) {
            messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.dataset.messageId = msg.message_id;
        } else {
            messageElement.innerHTML = ''; // Clear existing content for update
        }

        // --- Styling & Basic Attributes ---
        const isSent = msg.sender_id === currentUserId && msg.sender_type === currentUserType;
        messageElement.classList.toggle('sent', isSent);
        messageElement.classList.toggle('received', !isSent);
        messageElement.classList.toggle('edited', !!msg.is_edited); // Apply edited class

        // --- Sender Name (for received messages) ---
        if (!isSent) {
            const senderNameDiv = document.createElement('div');
            senderNameDiv.classList.add('sender-name');
            // Escape the name to prevent XSS if names contain unexpected characters
            senderNameDiv.textContent = escapeHtml(msg.sender_name || 'Unknown User');
            messageElement.appendChild(senderNameDiv);
        }

        // --- Reply Context Block ---
        if (msg.reply_to_message_id && msg.reply_context) {
            const replyDiv = document.createElement('div');
            replyDiv.classList.add('reply-quote');
             // Make reply clickable? Add data-reply-id for jump-to-message feature later.
             replyDiv.dataset.replyToId = msg.reply_to_message_id;
             // Use innerHTML carefully after escaping components
            replyDiv.innerHTML = `
                <span class="reply-quote-user">${escapeHtml(msg.reply_context.sender_name || 'Original User')}:</span>
                <span class="reply-quote-text">${escapeHtml(msg.reply_context.original_content || '[Original Content]')}</span>
            `;
            // Optional: Add click listener to jump
            // replyDiv.onclick = () => scrollToMessage(msg.reply_to_message_id);
            messageElement.appendChild(replyDiv);
        }

        // --- Main Message Content ---
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = renderMessageContentHTML(msg); // Generate safe HTML
        messageElement.appendChild(contentDiv);

        // --- Meta Info (Timestamp, Edited Status, Actions) ---
        const metaWrapper = document.createElement('div');
        metaWrapper.classList.add('message-meta');

        const timeDiv = document.createElement('span');
        timeDiv.classList.add('timestamp');
        let timeText = formatTimestamp(msg.timestamp);
         // More subtle edited marker combined with timestamp
         if (msg.is_edited) {
            timeText += ' (edited)'; // Just append suffix
            // Optionally add title attribute with exact edit time:
            // timeDiv.title = `Edited: ${formatTimestamp(msg.edited_timestamp)}`;
        }
        timeDiv.textContent = timeText;
        metaWrapper.appendChild(timeDiv);

        // --- Action Buttons Container ---
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');

        // Reply Button (always available except for file messages maybe?)
        if (!msg.is_file) { // Don't allow reply to file messages? Or allow? User choice.
             const replyBtn = createActionButton('↩️', 'Reply', ['reply-btn'], () => startReply(msg.message_id));
             actionsDiv.appendChild(replyBtn);
         }

        // Edit Button (if text message, owned, and within time window)
         if (!msg.is_file && msg.is_owner) {
            const messageTime = new Date(msg.timestamp).getTime();
             // Check client-side time window
             if (Date.now() - messageTime < EDIT_WINDOW_MINS * 60 * 1000) {
                const editBtn = createActionButton('✏️', 'Edit', ['edit-btn'], () => startEdit(msg.message_id));
                 actionsDiv.appendChild(editBtn);
             }
         }

        // Pin Button (Faculty only)
        if (currentUserType === 'faculty') {
            const pinBtnContent = msg.is_pinned ? '📌<span class="unpin-icon">✖</span>' : '📌';
            const pinBtnTitle = msg.is_pinned ? "Unpin Message" : "Pin Message";
            const pinBtnClasses = ['pin-btn'];
            if (msg.is_pinned) pinBtnClasses.push('pinned');
             // Pass the button itself to the handler for disabling
             const pinBtn = createActionButton(pinBtnContent, pinBtnTitle, pinBtnClasses, (event) => togglePinMessage(msg.message_id, event.currentTarget));
             actionsDiv.appendChild(pinBtn);
        }

        // Append actions if any exist
        if (actionsDiv.hasChildNodes()) {
             metaWrapper.appendChild(actionsDiv);
        }

        messageElement.appendChild(metaWrapper);

        // --- Append to DOM ---
        if (isNew) {
            messagesArea.appendChild(messageElement);
        }

        // --- Manage Pinned State in UI (Separate step) ---
        managePinnedMessageUI(msg);

        return messageElement; // Return the created/updated element
    }

    // --- Helper to Create Action Buttons ---
    function createActionButton(html, title, classes = [], onClick) {
         const button = document.createElement('button');
         button.innerHTML = html;
         button.title = title;
         button.type = 'button'; // Important for forms
         button.classList.add('action-btn', ...classes);
         if (onClick && typeof onClick === 'function') {
            button.onclick = onClick;
        }
         return button;
     }

    // --- Manage Pinned List UI ---
    // Ensures the pinned message list accurately reflects the `is_pinned` status
    function managePinnedMessageUI(msg) {
        if (!msg || !msg.message_id) return;

         const messageId = msg.message_id;
         const pinnedMessageElement = pinnedMessagesList.querySelector(`.message[data-message-id="${messageId}"]`);
         const mainMessageElement = messagesArea.querySelector(`.message[data-message-id="${messageId}"]`);

         if (msg.is_pinned) {
            // Ensure it IS in the pinned list
            if (!pinnedMessageElement && mainMessageElement) {
                 // Clone the main message element AFTER it's fully rendered with actions
                 const clone = mainMessageElement.cloneNode(true);
                 // Re-attach necessary listeners to the clone
                 attachActionListenersToClone(clone, msg);
                 pinnedMessagesList.appendChild(clone);
             } else if (pinnedMessageElement && mainMessageElement) {
                 // Already in pinned list, update its content to match the main message (if edited etc.)
                  // Saftest is remove and re-clone the updated main message
                  pinnedMessageElement.remove();
                  const clone = mainMessageElement.cloneNode(true);
                  attachActionListenersToClone(clone, msg);
                  pinnedMessagesList.appendChild(clone);
              }
        } else {
            // Ensure it is NOT in the pinned list
            if (pinnedMessageElement) {
                pinnedMessageElement.remove();
            }
        }

         // Show/hide the pinned container based on whether it has messages
         pinnedMessagesContainer.style.display = pinnedMessagesList.hasChildNodes() ? 'block' : 'none';

         // Also ensure the pin button icon in the MAIN message area is correct
         if (mainMessageElement) {
             const pinBtn = mainMessageElement.querySelector('.pin-btn');
             if (pinBtn) {
                pinBtn.innerHTML = msg.is_pinned ? '📌<span class="unpin-icon">✖</span>' : '📌';
                pinBtn.title = msg.is_pinned ? "Unpin Message" : "Pin Message";
                pinBtn.classList.toggle('pinned', !!msg.is_pinned);
             }
         }
    }

     // Helper to re-attach essential listeners to a CLONED message element
    function attachActionListenersToClone(clonedElement, msgData) {
         if (!clonedElement || !msgData) return;

         // Find buttons within the clone and re-attach onclick
         const pinBtnClone = clonedElement.querySelector('.pin-btn');
          if (pinBtnClone && currentUserType === 'faculty') {
              pinBtnClone.onclick = (event) => togglePinMessage(msgData.message_id, event.currentTarget);
          }

          // Reply (only if not a file)
         const replyBtnClone = clonedElement.querySelector('.reply-btn');
          if (replyBtnClone && !msgData.is_file) {
             replyBtnClone.onclick = () => startReply(msgData.message_id);
          }

          // Edit (only if conditions met)
         const editBtnClone = clonedElement.querySelector('.edit-btn');
         if (editBtnClone && !msgData.is_file && msgData.is_owner) {
            const messageTime = new Date(msgData.timestamp).getTime();
             if (Date.now() - messageTime < EDIT_WINDOW_MINS * 60 * 1000) {
                 editBtnClone.onclick = () => startEdit(msgData.message_id);
             } else {
                 editBtnClone.remove(); // Remove stale edit button from clone
             }
         }
     }


    // --- Initial Load ---
    function loadInitialData() {
         if (!messagesArea || !pinnedMessagesList) {
             console.error("Cannot load initial data: Message areas not found.");
             return;
          }
        messagesArea.innerHTML = '<p class="system-message">Loading messages...</p>';
        pinnedMessagesList.innerHTML = ''; // Clear pinned list
        pinnedMessagesContainer.style.display = 'none';
        messageCache.clear(); // Clear message cache

        fetch(`/chat/${groupId}/messages`) // Fetch main history (includes pinned status)
            .then(response => {
                if (!response.ok) {
                    // Try to parse error JSON if possible
                     return response.json().then(errData => Promise.reject(errData.error || `HTTP error ${response.status}`))
                                          .catch(() => Promise.reject(`HTTP error ${response.status}`)); // Fallback if JSON parsing fails
                 }
                return response.json();
            })
            .then(messages => {
                messagesArea.innerHTML = ''; // Clear loading message

                if (!Array.isArray(messages)) {
                    throw new Error("Invalid data received from server (expected array).");
                }

                if (messages.length === 0) {
                    messagesArea.innerHTML = '<p class="system-message">No messages yet. Start the conversation!</p>';
                } else {
                    // Render all messages. renderOrUpdateMessage handles both main area and calls managePinnedMessageUI
                    messages.forEach(msg => renderOrUpdateMessage(msg));
                    scrollToBottom(); // Scroll main area after rendering
                }
                // Visibility of pinned area is handled within managePinnedMessageUI calls
            })
            .catch(error => {
                console.error('Error fetching initial chat data:', error);
                messagesArea.innerHTML = `<p class="system-message error">Could not load chat history. ${escapeHtml(error.message || error)}</p>`;
            });
    }

    // --- Socket Event Handlers ---
    socket.on('connect', () => {
        console.log(`Socket ${socket.id} connected successfully.`);
        // Send event to server to join the specific group chat room
        socket.emit('joinRoom', groupId);
        // Load initial message history after successful connection and joining
        loadInitialData();
    });

    socket.on('newMessage', (message) => {
         // Basic validation of incoming message data
         if (!message || !message.message_id || !message.sender_type || message.sender_id == null) {
             console.warn("Received invalid 'newMessage' structure:", message);
             return;
          }

         // Remove "No messages" placeholder if it exists
         const noMessages = messagesArea.querySelector('.system-message');
        if (noMessages) noMessages.remove();

        console.log('Received new message via socket:', message);
        // Render the message (adds to main area and updates pinned area if needed)
        const newMessageElement = renderOrUpdateMessage(message);
        // Scroll only if the user is near the bottom or the message is theirs
        // This prevents auto-scrolling if the user is reading old messages
        const isScrolledToBottom = messagesArea.scrollHeight - messagesArea.clientHeight <= messagesArea.scrollTop + 100; // 100px tolerance
         if (newMessageElement && (isScrolledToBottom || message.sender_id === currentUserId)) {
            scrollToBottom();
        }
    });

    socket.on('messageEdited', (data) => {
         // Validate incoming edit data
         if (!data || !data.messageId || typeof data.newMessageContent !== 'string' ) {
             console.warn("Received invalid 'messageEdited' structure:", data);
             return;
          }
        console.log(`Received edit for message ${data.messageId}:`, data);
        const cachedMsg = messageCache.get(data.messageId);
        if (cachedMsg) {
            // Update message data in our local cache
            cachedMsg.message_content = data.newMessageContent;
            cachedMsg.is_edited = data.isEdited; // Should always be true here
            cachedMsg.edited_timestamp = data.editedTimestamp;
            messageCache.set(data.messageId, cachedMsg); // Put updated message back in cache

            // Re-render the message completely using the updated cache data
            renderOrUpdateMessage(cachedMsg);
            // Note: Re-rendering handles updating the content AND the "(edited)" marker
        } else {
            console.warn(`Received edit for message ${data.messageId} which is not in local cache.`);
            // Future enhancement: Could fetch the single updated message if needed, but usually unnecessary
        }
    });

    socket.on('messagePinStatusChanged', (data) => {
         // Validate incoming pin status data
         if (!data || data.messageId == null || typeof data.isPinned !== 'boolean') {
             console.warn("Received invalid 'messagePinStatusChanged' structure:", data);
             return;
          }
        console.log(`Received pin status change for message ${data.messageId}: pinned=${data.isPinned}`);
        const msg = messageCache.get(data.messageId);
        if (msg) {
            // Update cache
            msg.is_pinned = data.isPinned;
            messageCache.set(data.messageId, msg);

            // Re-render/manage UI. renderOrUpdateMessage will handle the button icon in main area
            // and call managePinnedMessageUI to handle its presence in the pinned list.
            renderOrUpdateMessage(msg);

        } else {
             console.warn(`Received pin status for message ${data.messageId} which is not in local cache.`);
             // If not in cache, it likely won't affect current view unless pinned msg was off-screen?
             // Maybe trigger a selective refresh of pinned list?
             // For now, rely on next full refresh.
         }
    });

    // Standard Socket.IO error/status handlers
    socket.on('connect_error', (err) => {
        console.error('Socket Connection Error:', err);
         if(messagesArea) messagesArea.innerHTML = `<p class="system-message error">Chat connection failed: ${err.message}. Please refresh.</p>`;
         // Implement reconnect logic or notify user more prominently
     });
    socket.on('disconnect', (reason) => {
         console.log(`Socket Disconnected: ${reason}`);
         if(messagesArea) messagesArea.innerHTML = `<p class="system-message error">Chat disconnected: ${reason}. Attempting to reconnect...</p>`;
          // Socket.IO client usually handles reconnection attempts automatically
     });
    socket.on('joinError', (err) => {
        console.error('Socket Join Room Error:', err);
         alert(`Chat Error: ${err}`); // Show prominent error
         if(messagesArea) messagesArea.innerHTML = `<p class="system-message error">Could not join chat room: ${escapeHtml(err)}</p>`;
     });
    socket.on('messageError', (err) => {
        console.error('Message Send/Receive Error:', err);
         uploadStatus.textContent = `Error: ${escapeHtml(err)}`;
         uploadStatus.style.color = 'red';
          // Auto-clear error after some time?
          // setTimeout(() => { uploadStatus.textContent = ''; }, 5000);
     });
    socket.on('editError', (data) => {
        console.error(`Message Edit Error for ${data?.messageId}:`, data?.error);
         alert(`Edit Error: ${data?.error || 'Unknown editing error.'}`);
         resetInputState(); // Cancel any pending edit on error
     });


    // --- User Actions Implementation ---

    // --- Sending Messages/Replies/Edits ---
    function sendMessage() {
        const content = messageInput.value.trim();
        const editingId = currentEditingId; // Grab state BEFORE reset
        const replyingId = currentReplyToId;

        // Don't process if not editing and content is empty
        if (!editingId && !content) {
            console.log("Send cancelled: No content.");
            return;
        }
        // Handle case where edit results in empty message - treat as cancel
         if (editingId && !content) {
             console.log("Edit cancelled: Content is empty.");
             cancelEdit(); // Use cancel function to reset UI properly
            return;
         }

        uploadStatus.textContent = ''; // Clear any previous status

        if (editingId) {
            // --- Send Edit Event ---
            console.log(`Sending edit for message ${editingId} via socket`);
            socket.emit('editMessage', {
                 groupId: groupId,
                 messageId: editingId,
                 newMessageContent: content // Send the trimmed content
             });
        } else {
            // --- Send New Message/Reply Event ---
             console.log(`Sending new message via socket (replying to ${replyingId || 'null'})`);
            socket.emit('sendMessage', {
                 groupId: groupId,
                 messageContent: content,
                 replyToMessageId: replyingId // Will be null if not replying
             });
         }

        // Reset the input state AFTER successfully emitting the event
        resetInputState();
    }

    // --- Reply Logic ---
    function startReply(messageId) {
        const msg = messageCache.get(messageId);
        if (!msg) {
             console.warn(`Cannot start reply: Message ${messageId} not found in cache.`);
            return;
         }
         if (currentEditingId) cancelEdit(); // Cancel any active edit

        console.log(`Starting reply to message ${messageId}`);
        currentReplyToId = messageId;
        replyUserName.textContent = escapeHtml(msg.sender_name || 'User'); // Safely display name
        // Generate preview text, prioritize message content, fallback to file name
        const previewText = msg.message_content
            ? (msg.message_content.length > 35 ? msg.message_content.substring(0, 32) + '...' : msg.message_content) // Shorter preview
            : (escapeHtml(msg.file_original_name || '[Attachment]')); // Use file name if no text content
        replyMessagePreview.textContent = previewText; // No need to escape preview text for textContent

        replyContextIndicator.style.display = 'flex'; // Show the indicator
        sendMessageBtn.textContent = "Reply";
        messageInput.focus(); // Focus input for user
    }

    function cancelReply() {
         console.log("Cancelling reply action.");
         currentReplyToId = null;
         replyContextIndicator.style.display = 'none'; // Hide indicator
         resetInputState(); // Reset button text and other states
    }
    // Attach listener if button exists
    if (cancelReplyBtn) cancelReplyBtn.addEventListener('click', cancelReply);


    // --- Edit Logic ---
    function startEdit(messageId) {
        const msg = messageCache.get(messageId);
         // Only allow editing text messages, not files
        if (!msg || msg.is_file) {
             console.warn(`Cannot start edit: Message ${messageId} not found or is a file.`);
            return;
         }
        if (currentReplyToId) cancelReply(); // Cancel any active reply

        console.log(`Starting edit for message ${messageId}`);
        currentEditingId = messageId;
        messageInput.value = msg.message_content || ''; // Load original text content ONLY
        editingIndicator.style.display = 'inline'; // Show "Editing..." indicator
        sendMessageBtn.textContent = "Save Edit";
        messageInput.focus(); // Focus input
        // Move cursor to the end of the text for convenience
         messageInput.selectionStart = messageInput.selectionEnd = messageInput.value.length;
         autoResizeTextarea(messageInput); // Resize textarea based on loaded content
    }

    function cancelEdit() {
         console.log("Cancelling edit action.");
         currentEditingId = null;
         resetInputState(); // Resets input value, button text, and indicators
    }
    // Attach listener if button exists
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);

    // --- Comprehensive Input State Reset ---
    function resetInputState() {
        messageInput.value = '';
        messageInput.disabled = false;
        sendMessageBtn.textContent = "Send";
        sendMessageBtn.disabled = false;
        // Clear state variables
        currentEditingId = null;
        currentReplyToId = null;
        // Hide indicators
        replyContextIndicator.style.display = 'none';
        editingIndicator.style.display = 'none';
        // Reset textarea size
        autoResizeTextarea(messageInput);
        // Re-enable other buttons if they exist
        if (sendFileBtn) sendFileBtn.disabled = false;
        if (emojiBtn) emojiBtn.disabled = false;
    }


    // --- Pin/Unpin Logic (via Fetch API) ---
    async function togglePinMessage(messageId, buttonElement) {
         if (!messageId) return;
        console.log(`Requesting pin toggle for message ${messageId}`);
        if (buttonElement) buttonElement.disabled = true; // Disable button immediately

        try {
            // Make POST request to the backend pinning endpoint
            const response = await fetch(`/chat/${groupId}/messages/${messageId}/pin`, {
                 method: 'POST',
                 headers: {
                    // Include CSRF token header if necessary for your application
                    // 'X-CSRF-Token': 'YOUR_CSRF_TOKEN', // Example
                     'Accept': 'application/json' // Indicate we expect JSON back
                  }
            });
            // Check if response is ok and parse JSON
            const data = await response.json();

            if (!response.ok || !data.success) {
                // Throw an error using the message from the backend if available
                throw new Error(data.error || `Failed to toggle pin (Status: ${response.status})`);
            }

             // Success! Backend confirms the action.
             // The 'messagePinStatusChanged' socket event (emitted by backend upon success)
             // will trigger the actual UI update (icon change, moving msg to/from pinned list).
             console.log(`Pin toggle API call successful for ${messageId}. New state from response: ${data.isPinned}`);
             // No need to manually update UI here, rely on socket event for consistency

        } catch (error) {
             console.error(`Error toggling pin for message ${messageId}:`, error);
             alert(`Failed to toggle pin: ${error.message}`); // Show error to user
             if (buttonElement) buttonElement.disabled = false; // Re-enable button on error
        }
        // Note: The button might appear re-enabled momentarily before the socket update arrives if there's latency.
    }


    // --- Textarea Auto-Resize ---
    function autoResizeTextarea(textarea) {
         if (!textarea) return;
        textarea.style.height = 'auto'; // Temporarily shrink to get accurate scrollHeight
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 38), 120); // Clamp height (38px min ~1 row, 120px max ~5 rows)
        textarea.style.height = newHeight + 'px';
    }

    // --- Emoji Picker Setup & Handling ---
     let emojiPickerInstance = null; // Hold the picker element
     if(emojiBtn){ // Only setup if button exists
        emojiBtn.addEventListener('click', (event) => {
             event.stopPropagation();
             if (!emojiPickerInstance) {
                 // Lazy load the picker element
                 emojiPickerInstance = document.createElement('emoji-picker');
                 emojiPickerInstance.style.position = 'absolute'; // Position absolutely
                 emojiPickerInstance.style.zIndex = '1001'; // Ensure it's above most elements
                  emojiPickerInstance.style.display = 'none'; // Start hidden
                 document.body.appendChild(emojiPickerInstance); // Append to body to avoid overflow clipping

                 // Add event listener ONCE
                 emojiPickerInstance.addEventListener('emoji-click', e => {
                     insertTextAtCursor(messageInput, e.detail.unicode);
                     autoResizeTextarea(messageInput);
                      if (emojiPickerInstance) emojiPickerInstance.style.display = 'none'; // Hide after click
                  });

                  // Global click listener to hide picker (attached ONCE)
                 document.addEventListener('click', (e) => {
                     if (emojiPickerInstance && emojiPickerInstance.style.display !== 'none' &&
                         !emojiPickerInstance.contains(e.target) && e.target !== emojiBtn) {
                        emojiPickerInstance.style.display = 'none';
                     }
                 }, true); // Use capture phase maybe? Standard bubbling usually okay.
              }

             // Position the picker relative to the button just before showing
              const btnRect = emojiBtn.getBoundingClientRect();
              // Position above and slightly left aligned (adjust offsets as needed)
              emojiPickerInstance.style.bottom = `${window.innerHeight - btnRect.top}px`;
              emojiPickerInstance.style.left = `${btnRect.left - 50}px`; // Adjust horizontal position
              // Toggle visibility
              emojiPickerInstance.style.display = emojiPickerInstance.style.display === 'none' ? 'block' : 'none';
               if (emojiPickerInstance.style.display === 'block') {
                   // Maybe focus picker search? (if library supports it)
               }
          });
      }

    // --- Helper: Insert text at cursor in a textarea ---
    function insertTextAtCursor(textarea, textToInsert) {
         if (!textarea) return;
         const start = textarea.selectionStart;
         const end = textarea.selectionEnd;
         const currentText = textarea.value;
         textarea.value = currentText.substring(0, start) + textToInsert + currentText.substring(end);
         // Move cursor to position after the inserted text
         textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
         textarea.focus(); // Re-focus the textarea
    }


    // --- File Upload Handling ---
    function handleFileUpload() {
         if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
         const file = fileInput.files[0];

        // Client-side validation (example: size)
        const maxSizeMB = 10; // Should match server limit
        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`File is too large. Maximum size allowed is ${maxSizeMB}MB.`);
            fileInput.value = ''; // Clear the selected file
            return;
        }

         // Update UI to show upload progress
        uploadStatus.textContent = `Uploading ${escapeHtml(file.name)}...`; // Show filename safely
        uploadStatus.style.color = 'grey';
         // Disable input elements during upload
         sendMessageBtn.disabled = true;
         if(sendFileBtn) sendFileBtn.disabled = true;
         if(emojiBtn) emojiBtn.disabled = true;
         messageInput.disabled = true;

        // Prepare form data for AJAX request
        const formData = new FormData();
        formData.append('chatFile', file); // Key must match server's Multer config

        // Use Fetch API to upload the file
        fetch(`/chat/${groupId}/upload`, {
                method: 'POST',
                body: formData,
                // No 'Content-Type' header needed; browser sets it for FormData
                headers: { // Add CSRF token here if needed
                    // 'X-CSRF-Token': 'FETCH_CSRF_TOKEN_SOMEHOW'
                 }
            })
            .then(response => {
                 // Check if response is ok, then parse JSON
                return response.json().then(data => {
                    if (!response.ok) {
                         // Throw an error object containing the parsed error message
                         throw new Error(data.error || `Upload failed with status: ${response.status}`);
                    }
                    return data; // Contains success: true and potentially fileInfo
                 });
            })
            .then(data => {
                 if (data.success) {
                     console.log('File Upload Successful:', data);
                     uploadStatus.textContent = 'Upload Complete!';
                     uploadStatus.style.color = 'green';
                     // The backend emits 'newMessage' via socket upon success,
                     // so no need to manually add the message to UI here.
                } else {
                     // This case should be caught by the error check above, but as a fallback
                     throw new Error(data.error || 'Upload failed for an unknown reason.');
                 }
            })
            .catch(error => {
                 console.error('File Upload Fetch Error:', error);
                 uploadStatus.textContent = `Upload Error: ${escapeHtml(error.message)}`; // Show error safely
                 uploadStatus.style.color = 'red';
             })
             .finally(() => {
                 // Re-enable controls and clear status after a delay, regardless of success/failure
                 setTimeout(() => {
                     resetUploadState(); // Use a separate function for clarity
                     fileInput.value = ''; // IMPORTANT: Clear the file input field
                 }, 2500); // Give user time to see status message
            });
    }

     // Helper to reset UI after upload attempt
    function resetUploadState(){
         uploadStatus.textContent = '';
         sendMessageBtn.disabled = false;
         if(sendFileBtn) sendFileBtn.disabled = false;
         if(emojiBtn) emojiBtn.disabled = false;
         messageInput.disabled = false;
         // fileInput.value = ''; // Moved this to finally block of fetch
    }


    // --- Attach Core Event Listeners ---
    if (sendMessageBtn) sendMessageBtn.addEventListener('click', sendMessage);

    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
             if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault(); // Prevent newline in textarea on plain Enter
                sendMessage();
            }
             autoResizeTextarea(e.target); // Resize on keypress
        });
        messageInput.addEventListener('input', (e) => {
            autoResizeTextarea(e.target); // Resize on input/paste
        });
        // Initial resize check in case field has default content (unlikely here)
         autoResizeTextarea(messageInput);
     }

    if (sendFileBtn) sendFileBtn.addEventListener('click', () => fileInput?.click()); // Safely trigger click
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);

    console.log("Chat script initialized for user:", currentUserType, currentUserId, "in group:", groupId);

}); // End DOMContentLoaded