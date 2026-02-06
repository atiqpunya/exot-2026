// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDTdKCF-rYzUGdWnDnPfEXxALSuP53nPw8",
    authDomain: "gen-lang-client-0987176592.firebaseapp.com",
    databaseURL: "https://gen-lang-client-0987176592-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "gen-lang-client-0987176592",
    storageBucket: "gen-lang-client-0987176592.firebasestorage.app",
    messagingSenderId: "369163094436",
    appId: "1:369163094436:web:31befbb46af74bd0299931"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Export db for use in other files
export { db, ref, set, onValue, update, get };

// Global availability for non-module scripts
window.firebaseDB = db;
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseOnValue = onValue;
window.firebaseUpdate = update;
window.firebaseGet = get;
