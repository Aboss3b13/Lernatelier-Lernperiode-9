import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, serverTimestamp, query, where, orderBy, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

                // Create buttons for Battle, Chat, and Add Friend
                const battleBtn = document.createElement('button');
                battleBtn.textContent = 'Battle';
                battleBtn.className = 'action-btn battle-btn';

                const chatBtn = document.createElement('button');
                chatBtn.textContent = 'Chat';
                chatBtn.className = 'action-btn chat-btn';

                const addFriendBtn = document.createElement('button');
                addFriendBtn.textContent = 'Add Friend';
                addFriendBtn.className = 'action-btn add-friend-btn';

                // Append buttons to the list item
                li.appendChild(battleBtn);
                li.appendChild(chatBtn);
                li.appendChild(addFriendBtn);
                userList.appendChild(li);

                // Add event listener to the Battle button
                battleBtn.addEventListener('click', () => {
                    sendBattleNotification(currentUser.email, userData.Email);
                });

                // Add event listener to the Chat button
                chatBtn.addEventListener('click', () => {
                    openChatBox(currentUser.email, userData.Email);
                });

                // Add event listener to the Add Friend button
                addFriendBtn.addEventListener('click', () => {
                    sendFriendRequest(currentUser.email, userData.Email);
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
        message: 'This person wants to battle you!',
        type: 'battle_request',
        timestamp: serverTimestamp()
    }).then(() => {
        console.log('Battle notification sent successfully');
    }).catch((error) => {
        console.error('Error sending battle notification:', error);
    });
}

// Function to send a friend request
function sendFriendRequest(fromEmail, toEmail) {
    const notificationsRef = collection(db, 'notifications');

    addDoc(notificationsRef, {
        from: fromEmail,
        to: toEmail,
        message: `You have a new friend request!`,
        type: 'friend_request',
        status: 'pending', // Ensure this is 'pending'
        timestamp: serverTimestamp()
    }).then(() => {
        console.log('Friend request sent successfully');
    }).catch((error) => {
        console.error('Error sending friend request: ', error);
    });
}

// Function to load notifications
// Function to load notifications
function loadNotifications() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const currentUserEmail = user.email; // Get the signed-in user's email
            const notificationsRef = collection(db, 'notifications');
            const q = query(notificationsRef, where('to', '==', currentUserEmail), orderBy('timestamp'));

            onSnapshot(q, (snapshot) => {
                const notificationsList = document.getElementById('notification-list');
                if (!notificationsList) {
                    console.error('Element with ID "notification-list" not found');
                    return;
                }

                notificationsList.innerHTML = ''; // Clear existing notifications

                if (snapshot.empty) {
                    notificationsList.innerHTML = '<li>No new notifications.</li>';
                } else {
                    snapshot.forEach(doc => {
                        const notificationData = doc.data();
                        const li = document.createElement('li');
                        li.textContent = notificationData.message;

                        // Add styles to make notifications stand out
                        li.style.padding = '10px';
                        li.style.borderBottom = '1px solid #ddd';

                        // Check if it's a friend request notification
                        if (notificationData.type === 'friend_request') {
                            const acceptBtn = document.createElement('button');
                            acceptBtn.textContent = 'Accept';
                            acceptBtn.className = 'notification-btn accept-btn';
                            acceptBtn.addEventListener('click', () => acceptFriendRequest(notificationData.from, currentUserEmail, doc.id));

                            const rejectBtn = document.createElement('button');
                            rejectBtn.textContent = 'Reject';
                            rejectBtn.className = 'notification-btn reject-btn';
                            rejectBtn.addEventListener('click', () => rejectFriendRequest(doc.id));

                            // Only show buttons if the request is pending
                            if (notificationData.status === 'pending') {
                                li.appendChild(acceptBtn);
                                li.appendChild(rejectBtn);
                            }
                        }

                        notificationsList.appendChild(li);
                    });
                }
            });
        } else {
            console.warn('No user signed in. Notifications will not load.');
        }
    });
}

// Function to accept a friend request
async function acceptFriendRequest(friendEmail, currentUserEmail, notificationId) {
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);

    // Add friend to the current user's friends list
    await updateDoc(currentUserRef, {
        friends: arrayUnion(friendEmail)
    });

    // Add current user to the friend's friends list
    const friendQuery = query(collection(db, 'users'), where('Email', '==', friendEmail));
    const friendSnapshot = await getDocs(friendQuery);
    friendSnapshot.forEach(async (friendDoc) => {
        await updateDoc(doc(db, 'users', friendDoc.id), {
            friends: arrayUnion(currentUserEmail)
        });
    });

    // Remove the notification after acceptance
    await deleteDoc(doc(db, 'notifications', notificationId));

    // Update status to 'accepted'
    await updateDoc(doc(db, 'notifications', notificationId), {
        status: 'accepted' // Update the status to reflect the change
    });

    console.log('Friend request accepted successfully!');
}

// Function to reject a friend request
async function rejectFriendRequest(notificationId) {
    // Remove the notification after rejection
    await deleteDoc(doc(db, 'notifications', notificationId));
    console.log('Friend request rejected successfully!');
}

// Function to load previous chat messages
function loadChatMessages(user1, user2) {
    const chatRef = collection(db, 'chat');

    const q = query(
        chatRef,
        where('from', 'in', [user1, user2]),
        where('to', 'in', [user1, user2]),
        orderBy('timestamp')
    );

    onSnapshot(q, (snapshot) => {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';

        snapshot.forEach(doc => {
            const messageData = doc.data();
            const li = document.createElement('li');
            li.className = messageData.from === user1 ? 'my-message' : 'other-message';
            li.textContent = messageData.message;
            chatList.appendChild(li);
        });

        scrollToBottom(chatList);
    });
}

function scrollToBottom(chatList) {
    chatList.scrollTop = chatList.scrollHeight;
}

function openChatBox(fromEmail, toEmail) {
    let chatBox = document.getElementById('chat-box');
    const chatBoxId = `${fromEmail}-${toEmail}`;
    let messageInput;

    if (!chatBox) {
        chatBox = document.createElement('div');
        chatBox.id = 'chat-box';
        chatBox.style = `
            border: 1px solid #ccc; padding: 10px; width: 300px;
            position: fixed; bottom: 20px; right: 20px; background-color: #fff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); z-index: 1000;
            display: flex; flex-direction: column; max-height: 400px;
            overflow-y: auto; border-radius: 8px;
        `;

        const chatList = document.createElement('ul');
        chatList.id = 'chat-list';
        chatList.style = 'list-style-type: none; padding: 0; margin: 0; flex-grow: 1; overflow-y: auto;';
        chatBox.appendChild(chatList);

        messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = 'Type your message...';
        messageInput.style = 'flex-grow: 1; margin-right: 5px;';
        chatBox.appendChild(messageInput);

        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        chatBox.appendChild(sendButton);

        document.body.appendChild(chatBox);
    } else {
        if (chatBox.dataset.chatId === chatBoxId) {
            chatBox.style.display = chatBox.style.display === 'none' ? 'block' : 'none';
            return;
        } else {
            const chatList = document.getElementById('chat-list');
            chatList.innerHTML = '';
        }
    }

    chatBox.dataset.chatId = chatBoxId;
    loadChatMessages(fromEmail, toEmail);

    messageInput = chatBox.querySelector('input[type="text"]');
    const sendButton = chatBox.querySelector('button');
    sendButton.onclick = () => {
        const messageText = messageInput.value;
        if (messageText.trim()) {
            sendMessage(fromEmail, toEmail, messageText);
            messageInput.value = '';
        }
    };
}

// Function to send a chat message
function sendMessage(fromEmail, toEmail, messageText) {
    const chatRef = collection(db, 'chat');
    addDoc(chatRef, {
        from: fromEmail,
        to: toEmail,
        message: messageText,
        timestamp: serverTimestamp()
    }).then(() => {
        console.log('Message sent successfully');
    }).catch((error) => {
        console.error('Error sending message:', error);
    });
}

// Load notifications when the page is ready
loadNotifications();
