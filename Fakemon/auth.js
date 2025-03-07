import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
    getAuth,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
    getFirestore,
    setDoc,
    doc,
    getDoc,
    collection,
    onSnapshot,
    serverTimestamp,
    addDoc,
    query,
    where,
    deleteDoc,
    getDocs,
    writeBatch,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJrC-xvOsf-4eUFqiH3MSYqVry5ZJ1nT0",
    authDomain: "fakemon-c9ce5.firebaseapp.com",
    projectId: "fakemon-c9ce5",
    storageBucket: "fakemon-c9ce5.appspot.com",
    messagingSenderId: "723844541509",
    appId: "1:723844541509:web:c45f45eca8ff0f2bba072c",
    measurementId: "G-YF4G4DF1EK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Universal Sign Out Functionality
const signoutBtn = document.getElementById('signout-btn');
if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
        await signOutUser();
    });
}

// Function to sign out the user and set isActive to false
async function signOutUser() {
    try {
        const user = auth.currentUser; // Get the current user
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { isActive: false }, { merge: true }); // Set isActive to false
        }
        await signOut(auth);
        window.location.href = 'home.html'; // Redirect to the homepage
    } catch (error) {
        console.error('Error during sign out:', error.message);
    }
}

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('User is authenticated:', user.email);
        const userInfo = await getDoc(doc(db, 'users', user.uid));
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('user-info').textContent = `Hello, ${userInfo.data().Username}!`;

        // Set user as active
        await setDoc(doc(db, 'users', user.uid), { isActive: true }, { merge: true });

        // Listen for notifications specific to this user
        listenForNotifications(user.email);

        // Track user activity with a timeout
        let userActivityTimer;
        function checkUserActivity() {
            clearTimeout(userActivityTimer);
            userActivityTimer = setTimeout(async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await setDoc(doc(db, 'users', currentUser.uid), { isActive: true }, { merge: true });
                    console.log(`User ${currentUser.uid} is still active.`);
                }
            }, 10000); // 10 seconds
        }
        window.addEventListener('mousemove', checkUserActivity);
        window.addEventListener('keydown', checkUserActivity);
        window.addEventListener('beforeunload', async (event) => {
            clearTimeout(userActivityTimer);
            const currentUser = auth.currentUser;
            if (currentUser) {
                await setDoc(doc(db, 'users', currentUser.uid), { isActive: false }, { merge: true });
                console.log(`User ${currentUser.uid} set to inactive due to closing the page.`);
            }
        });
    } else {
        console.log('User is not authenticated');
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('auth-container').style.display = 'block';
    }
});

// Sign Up Functionality
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const username = document.getElementById('signup-username').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                Username: username,
                Email: email,
                CreatedAt: new Date(),
                isActive: true
            });
            console.log('User signed up and data saved to Firestore');
            document.getElementById('main-content').style.display = 'block';
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('user-info').textContent = `Hello, ${username}!`;
        } catch (error) {
            console.error('Error during sign up:', error.message);
        }
    });
}

// Log In Functionality
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), { isActive: true }, { merge: true });
            const userInfo = await getDoc(doc(db, 'users', user.uid));
            document.getElementById('main-content').style.display = 'block';
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('user-info').textContent = `Hello, ${userInfo.data().Username}!`;
        } catch (error) {
            console.error('Error during log in:', error.message);
        }
    });
}

// Function to send a battle notification
function sendBattleNotification(fromEmail, toEmail) {
    console.log(`Sending notification from ${fromEmail} to ${toEmail}`);
    const notificationsRef = collection(db, 'notifications');
    addDoc(notificationsRef, {
        from: fromEmail,
        to: toEmail,
        message: 'This person wants to battle you',
        type: 'battle_request',
        timestamp: serverTimestamp()
    }).then(() => {
        console.log('Notification sent successfully');
    }).catch((error) => {
        console.error('Error sending notification: ', error);
    });
}

// Function to listen for notifications (no delete button)
function listenForNotifications(currentUserEmail) {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where("to", "==", currentUserEmail));
    onSnapshot(q, (snapshot) => {
        const notificationsList = document.getElementById('notification-list');
        notificationsList.innerHTML = ''; // Clear existing notifications
        const notificationsArray = [];

        snapshot.forEach(doc => {
            const notificationData = doc.data();
            if (notificationData.to === currentUserEmail) {
                notificationsArray.push({ id: doc.id, ...notificationData });
            }
        });

        // Sort notifications by timestamp
        notificationsArray.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());

        notificationsArray.forEach(notificationData => {
            const li = document.createElement('li');

            // Create the notification message
            const messageSpan = document.createElement('span');
            messageSpan.textContent = `${notificationData.from}: ${notificationData.message} (Received at ${notificationData.timestamp?.toDate().toLocaleString()})`;
            li.appendChild(messageSpan);

            // Handle friend request notification buttons inside the list
            if (notificationData.type === 'friend_request' && notificationData.message === 'You have a new friend request!') {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';

                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = 'Accept';
                acceptBtn.className = 'notification-btn accept-btn';
                acceptBtn.addEventListener('click', () => acceptFriendRequest(notificationData.from, currentUserEmail, notificationData.id));

                const rejectBtn = document.createElement('button');
                rejectBtn.textContent = 'Reject';
                rejectBtn.className = 'notification-btn reject-btn';
                rejectBtn.addEventListener('click', () => rejectFriendRequest(notificationData.id));

                if (notificationData.status === 'pending') {
                    buttonContainer.appendChild(acceptBtn);
                    buttonContainer.appendChild(rejectBtn);
                }

                // Append the button container next to the message
                li.appendChild(buttonContainer);
            }

            // Battle request notification does not show battle buttons anymore
            else if (notificationData.type === 'battle_request') {
                // No buttons for battle requests
            }

            // Append the notification item to the list
            notificationsList.appendChild(li);
        });

        // If no notifications, show a placeholder
        if (notificationsList.children.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No new notifications.';
            notificationsList.appendChild(li);
        }

        // Show new notification message
        if (notificationsArray.length > 0) {
            const newNotificationMessage = document.getElementById('new-notification-message');
            newNotificationMessage.style.display = 'block';
            setTimeout(() => {
                newNotificationMessage.style.display = 'none';
            }, 3000);
        }
    });
}


// Function to accept a friend request
async function acceptFriendRequest(friendEmail, currentUserEmail, notificationId) {
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(currentUserRef, {
        friends: arrayUnion(friendEmail)
    });
    const friendQuery = query(collection(db, 'users'), where('Email', '==', friendEmail));
    const friendSnapshot = await getDocs(friendQuery);
    friendSnapshot.forEach(async (friendDoc) => {
        await updateDoc(doc(db, 'users', friendDoc.id), {
            friends: arrayUnion(currentUserEmail)
        });
    });
    // Remove the notification after acceptance and update its status
    await deleteDoc(doc(db, 'notifications', notificationId));
    await updateDoc(doc(db, 'notifications', notificationId), {
        status: 'accepted'
    });
    console.log('Friend request accepted successfully!');
}

// Function to reject a friend request
async function rejectFriendRequest(notificationId) {
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

// Notification functionality
const notificationBtn = document.getElementById('notification-btn');
const notificationBox = document.getElementById('notification-box');
const closeNotificationBtn = document.getElementById('close-notification-btn');
const newNotificationMessage = document.getElementById('new-notification-message');

if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
        notificationBox.style.display = 'block';
    });
}
if (closeNotificationBtn) {
    closeNotificationBtn.addEventListener('click', () => {
        notificationBox.style.display = 'none';
    });
}

let userActivityTimer;
async function setUserInactive() {
    const currentUser = auth.currentUser;
    if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), { isActive: false }, { merge: true });
        console.log(`User ${currentUser.uid} is now inactive.`);
    }
}
