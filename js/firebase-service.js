// FIREBASE SERVICE
// Menggantikan google-sheets-api.js

import { db } from "./firebase-config.js";
import { collection, doc, setDoc, onSnapshot, getDoc } from "https://cdn.jsdelivr.net/npm/firebase@10.8.0/firestore/+esm";

// Mapping localStorage keys to Firestore paths
// Collection: "schools" -> Doc: "alwildan4" -> Subcollection: "data" -> Doc: [key]
const COLLECTION_NAME = "exot_data";

// Helper to update sync status UI
function updateStatus(status) {
    if (window.updateSyncStatus) {
        window.updateSyncStatus(status);
    }
}

const firebaseService = {
    /**
     * Save data to Firestore (Fire & Forget)
     * @param {string} key - e.g., 'students', 'users'
     * @param {any} data - Data to save
     * @param {number} timestamp - Optional timestamp
     */
    async save(key, data, timestamp = null) {
        updateStatus('syncing');

        // Create a timeout promise (20s)
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out (20s). Check internet connection.")), 20000)
        );

        try {
            const cleanKey = key.replace('exot_', ''); // remove prefix
            const docRef = doc(db, COLLECTION_NAME, cleanKey);

            // Race between save and timeout
            await Promise.race([
                setDoc(docRef, {
                    data: data,
                    updatedAt: timestamp || Date.now()
                }),
                timeout
            ]);

            updateStatus('online');
            return { success: true };
        } catch (error) {
            console.error("Firebase Save Error:", error);
            // Don't show error to user immediately to avoid spam, just status
            updateStatus('error');
            return { success: false, error: error.message };
        }
    },

    /**
     * Listen for real-time updates from Firestore
     * @param {Function} callback - Function to call when data changes
     */
    initSync(callback) {
        updateStatus('syncing');

        const keys = ['students', 'users', 'classes', 'settings', 'examinerRewards'];

        keys.forEach(key => {
            const docRef = doc(db, COLLECTION_NAME, key);

            onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    const docData = doc.data();
                    const remoteData = docData.data;
                    const remoteTs = docData.updatedAt || 0;

                    const storageKey = `exot_${key}`;
                    const localTs = parseInt(localStorage.getItem(storageKey + '_timestamp') || '0');

                    // Conflict Resolution:
                    // If local is NEWER than remote (by > 1000ms), assume offline changes need push
                    // If remote is NEWER, pull

                    if (localTs > remoteTs + 2000) { // 2s buffer for clock skew
                        console.log(`⚠️ Local ${key} is newer (${localTs} > ${remoteTs}). Pushing to cloud...`);
                        this.save(storageKey, JSON.parse(localStorage.getItem(storageKey)), localTs);
                        return;
                    }

                    // Compare content strings to avoid unnecessary writes
                    const localStr = localStorage.getItem(storageKey);
                    const remoteStr = JSON.stringify(remoteData);

                    if (localStr !== remoteStr) {
                        if (remoteTs >= localTs) {
                            console.log(`🔄 Syncing ${key} from Cloud (Remote ${remoteTs} >= Local ${localTs})`);
                            localStorage.setItem(storageKey, remoteStr);
                            localStorage.setItem(storageKey + '_timestamp', remoteTs);

                            // Notify app
                            window.dispatchEvent(new Event('storage-update'));
                        } else {
                            console.log(`⚠️ Ignored old cloud data for ${key}`);
                        }
                    }
                    updateStatus('online');
                }
            }, (error) => {
                console.error(`Sync Error (${key}):`, error);
                updateStatus('offline');
            });
        });
    },

    /**
     * Upload all local data to Firebase (Migration Tool)
     */
    async uploadLocalData() {
        const keys = ['students', 'users', 'classes', 'settings', 'examinerRewards'];
        let errors = [];

        for (const key of keys) {
            const storageKey = `exot_${key}`;
            const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const result = await this.save(storageKey, data);

            if (!result.success) {
                errors.push(`${key}: ${result.error}`);
            }
        }

        return { success: errors.length === 0, errors: errors };
    },

    /**
     * Manual pull from cloud (One-time fetch)
     */
    async syncFromCloud() {
        updateStatus('syncing');
        const keys = ['students', 'users', 'classes', 'settings', 'examinerRewards'];
        let success = true;

        try {
            for (const key of keys) {
                const docRef = doc(db, COLLECTION_NAME, key);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const remoteData = docSnap.data().data;
                    localStorage.setItem(`exot_${key}`, JSON.stringify(remoteData));
                }
            }
            window.dispatchEvent(new Event('storage-update'));
            updateStatus('online');
            return true;
        } catch (error) {
            console.error("Manual Sync Error:", error);
            updateStatus('error');
            return false;
        }
    }
};

// Make globally available
window.firebaseService = firebaseService;

// Auto-start sync if configured
// Check if firebase config is valid (not placeholder)
// We assume if db is initialized, it's good to go, but user might have placeholder keys.
// The app will error if keys are bad, which is fine for now.
