// home.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJrC-xvOsf-4eUFqiH3MSYqVry5ZJ1nT0",
    authDomain: "fakemon-c9ce5.firebaseapp.com",
    databaseURL: "https://fakemon-c9ce5-default-rtdb.europe-west1.firebasedatabase.app",
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

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        const userInfo = await getDoc(doc(db, 'users', user.uid));
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('user-info').textContent = `Hello, ${userInfo.data().Username}!`;
        await setDoc(doc(db, 'users', user.uid), { isActive: true }, { merge: true }); // Set user as active
    } else {
        // User is signed out
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

            // Save user info to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                Username: username,
                Email: email,
                CreatedAt: new Date(),
                isActive: true // Set user as active upon sign up
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

            // Set user as active upon login
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
