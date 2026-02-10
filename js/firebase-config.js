// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
// (Restored from previous setup)
const firebaseConfig = {
    apiKey: "AIzaSyD89OYtoor7v6FjNENDNbbQXV8Nxe7gFAI",
    authDomain: "gen-lang-client-0663259310.firebaseapp.com",
    databaseURL: "https://gen-lang-client-0663259310-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "gen-lang-client-0663259310",
    storageBucket: "gen-lang-client-0663259310.firebasestorage.app",
    messagingSenderId: "171862260005",
    appId: "1:171862260005:web:96e4c2b04013356c43c2cc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export db for use in other files
export { db };
