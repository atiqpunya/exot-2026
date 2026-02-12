// Firebase Config (Compat Mode)
// Expects firebase-app-compat.js and firebase-firestore-compat.js to be loaded

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
if (typeof firebase === 'undefined') {
    console.error("CRITICAL: Firebase SDK not loaded!");
    console.error("CRITICAL: Firebase SDK not loaded!");
    // Silent failure - allow app to work with cached data if possible
    console.warn("Firebase failed to load. functionality may be limited.");
} else {
    try {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        window.storage = firebase.storage();
        if (firebase.auth) {
            window.auth = firebase.auth();
        }

        // Enable offline persistence
        window.db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
                    console.warn('Persistence failed: Multiple tabs open');
                } else if (err.code == 'unimplemented') {
                    // The current browser does not support all of the features required to enable persistence
                    console.warn('Persistence not supported by browser');
                }
            });

        console.log("Firebase initialized successfully (Compat Mode)");
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}
