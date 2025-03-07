import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Initialize Firebase
const auth = getAuth();
const db = getFirestore();

// Function to display active users
const userList = document.getElementById('user-list');
if (userList) {
    const usersRef = collection(db, 'users');
    onSnapshot(usersRef, (snapshot) => {
        userList.innerHTML = ''; // Clear existing list
        snapshot.forEach(doc => {
            const userData = doc.data();
            const currentUser = auth.currentUser;

            if (userData.isActive && userData.Email !== currentUser?.email) {
                const li = document.createElement('li');
                li.textContent = userData.Username;

                // Create buttons for Battle and Chat
                const battleBtn = document.createElement('button');
                battleBtn.textContent = 'Trade';
                battleBtn.className = 'action-btn battle-btn';

                const chatBtn = document.createElement('button');
                chatBtn.textContent = 'Chat';
                chatBtn.className = 'action-btn chat-btn';

                // Append buttons to the list item
                li.appendChild(battleBtn);
                li.appendChild(chatBtn);
                userList.appendChild(li);

                // Add event listener to the Battle button
                battleBtn.addEventListener('click', () => {
                    sendBattleNotification(currentUser.email, userData.Email);
                });

                // Add event listener to the Chat button
                chatBtn.addEventListener('click', () => {
                    openChatBox(currentUser.email, userData.Email);
                });
            }
        });
    });
}

// Function to send a battle notification
function sendBattleNotification(fromEmail, toEmail) {
    const notificationsRef = collection(db, 'notifications');

    addDoc(notificationsRef, {
        from: fromEmail,
        to: toEmail,
        message: 'This person wants to trade you',
        timestamp: serverTimestamp()
    }).then(() => {
        console.log('Notification sent successfully');
    }).catch((error) => {
        console.error('Error sending notification: ', error);
    });
}
/// Function to load previous chat messages
function loadChatMessages(user1, user2) {
    const chatRef = collection(db, 'chat');

    // Create a query to filter messages between both users and order by timestamp
    const q = query(
        chatRef,
        where('from', 'in', [user1, user2]),
        where('to', 'in', [user1, user2]),
        orderBy('timestamp') // Order messages by timestamp 
    );

    onSnapshot(q, (snapshot) => {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = ''; // Clear existing messages

        snapshot.forEach(doc => {
            const messageData = doc.data();
            const li = document.createElement('li');

            // Add class for sender and set alignment
            li.className = messageData.from === user1 ? 'my-message' : 'other-message'; // Class for message styling
            li.textContent = messageData.message; // Display only the message content
            chatList.appendChild(li);
        });

        // Scroll to the bottom of the chat list
        scrollToBottom(chatList);
    });
}

// Function to scroll to the bottom of the chat list
function scrollToBottom(chatList) {
    chatList.scrollTop = chatList.scrollHeight; // Scroll to the bottom
}

// Function to open chat box
function openChatBox(fromEmail, toEmail) {
    let chatBox = document.getElementById('chat-box');

    // Create a unique identifier for the chat box
    const chatBoxId = `${fromEmail}-${toEmail}`;
    
    let messageInput; // Declare messageInput here

    if (!chatBox) {
        // If the chat box doesn't exist, create it
        chatBox = document.createElement('div');
        chatBox.id = 'chat-box';
        chatBox.style.border = '1px solid #ccc';
        chatBox.style.padding = '10px';
        chatBox.style.width = '300px';
        chatBox.style.position = 'fixed'; // Fixed positioning for side app look
        chatBox.style.bottom = '20px'; // Position from the bottom
        chatBox.style.right = '20px'; // Position from the right
        chatBox.style.backgroundColor = '#fff';
        chatBox.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        chatBox.style.zIndex = '1000';
        chatBox.style.display = 'flex';
        chatBox.style.flexDirection = 'column';
        chatBox.style.maxHeight = '400px'; // Limit height
        chatBox.style.overflowY = 'auto'; // Allow scrolling
        chatBox.style.borderRadius = '8px'; // Rounded corners

        // Create a chat list
        const chatList = document.createElement('ul');
        chatList.id = 'chat-list';
        chatList.style.listStyleType = 'none'; // Remove bullet points
        chatList.style.padding = '0'; // Remove default padding
        chatList.style.margin = '0'; // Remove default margin
        chatList.style.flexGrow = '1'; // Allow chat list to take remaining space
        chatList.style.overflowY = 'auto'; // Allow scrolling
        chatBox.appendChild(chatList);
        
        // Create a message input field
        messageInput = document.createElement('input'); // Initialize messageInput here
        messageInput.type = 'text';
        messageInput.placeholder = 'Type your message...';
        messageInput.style.flexGrow = '1'; // Take remaining space
        messageInput.style.marginRight = '5px'; // Space between input and button
        chatBox.appendChild(messageInput);

        // Create a send button
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        chatBox.appendChild(sendButton);

        // Append chat box to the body
        document.body.appendChild(chatBox);
    } else {
        // If chat box exists, check if it's the same chat
        if (chatBox.dataset.chatId === chatBoxId) {
            // If it's the same chat, toggle visibility
            chatBox.style.display = chatBox.style.display === 'none' ? 'block' : 'none';
            return; // Exit the function
        } else {
            // If it's a different chat, clear previous messages
            const chatList = document.getElementById('chat-list');
            chatList.innerHTML = ''; // Clear existing messages
        }
    }

    // Set the chat ID for the current chat box
    chatBox.dataset.chatId = chatBoxId;

    // Load previous messages
    loadChatMessages(fromEmail, toEmail);
    
    // Reinitialize messageInput for the current chat box
    messageInput = chatBox.querySelector('input[type="text"]'); // Ensure we get the current input field

    // Add event listener for sending messages
    const sendButton = chatBox.querySelector('button'); // Get the send button in the chat box
    sendButton.onclick = () => {
        const messageText = messageInput.value; // Now we reference the current messageInput
        console.log('Sending message:', messageText); // Debugging output
        if (messageText.trim()) { // Check for non-empty message
            sendMessage(fromEmail, toEmail, messageText);
            messageInput.value = ''; // Clear input after sending
        } else {
            console.error('Message is empty, not sending.'); // Debugging output for empty messages
        }
    };
}

// Function to send a message
function sendMessage(fromEmail, toEmail, messageText) {
    const chatRef = collection(db, 'chat');

    // Create a message object
    const message = {
        from: fromEmail,
        to: toEmail,
        message: messageText,
        timestamp: new Date() // Use current date and time
    };

    // Add message to Firestore
    addDoc(chatRef, message)
        .then(() => {
            console.log('Message sent successfully!'); // Debugging output
        })
        .catch((error) => {
            console.error('Error sending message:', error); // Handle any errors
        });
}
