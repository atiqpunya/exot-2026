// FIREBASE SERVICE (Compat Mode)
// Depends on window.db provided by firebase-config.js

const COLLECTION_NAME = "exot_data";

function updateStatus(status) {
    if (window.updateSyncStatus) {
        window.updateSyncStatus(status);
    }
}

const firebaseService = {
    /**
     * Save data to Firestore (Fire & Forget)
     */
    async save(key, data, timestamp = null) {
        updateStatus('syncing');

        // Create a timeout promise (20s)
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out (20s). Check internet connection.")), 20000)
        );

        try {
            if (!window.db) throw new Error("Database not initialized");

            const cleanKey = key.replace('exot_', ''); // remove prefix
            const docRef = window.db.collection(COLLECTION_NAME).doc(cleanKey);

            // Race between save and timeout
            await Promise.race([
                docRef.set({
                    data: data,
                    updatedAt: timestamp || Date.now()
                }),
                timeout
            ]);

            updateStatus('online');
            return { success: true };
        } catch (error) {
            console.error("Firebase Save Error:", error);
            updateStatus('error');
            return { success: false, error: error.message };
        }
    },

    /**
     * Listen for real-time updates from Firestore
     */
    initSync() {
        if (!window.db) {
            console.error("DB not ready for initSync");
            return;
        }

        updateStatus('syncing');

        const keys = ['students', 'users', 'classes', 'settings', 'examinerRewards'];

        keys.forEach(key => {
            const docRef = window.db.collection(COLLECTION_NAME).doc(key);

            docRef.onSnapshot((doc) => {
                // In compat mode, doc is an object. usage: doc.exists, doc.data()
                if (doc.exists) {
                    const docData = doc.data();
                    const remoteData = docData.data || []; // Handle case where 'data' field might be missing
                    const remoteTs = docData.updatedAt || 0;

                    const storageKey = `exot_${key}`;
                    const localTs = parseInt(localStorage.getItem(storageKey + '_timestamp') || '0');

                    // Conflict Resolution:
                    // If local is significantly newer, push local to cloud.
                    // But be careful of loops. The 2000ms buffer helps.
                    if (localTs > remoteTs + 5000) {
                        console.log(`⚠️ Local ${key} is newer (${localTs} > ${remoteTs}). Pushing to cloud...`);
                        this.save(storageKey, JSON.parse(localStorage.getItem(storageKey)), localTs);
                        return;
                    }

                    const localStr = localStorage.getItem(storageKey);
                    // Compare content, not just timestamp, to avoid unnecessary writes/events
                    // Note: JSON.stringify order might vary, but for simple arrays it's usually stable enough for this check
                    const remoteStr = JSON.stringify(remoteData);

                    if (localStr !== remoteStr) {
                        // If remote is newer or equal (and content different), accept remote
                        if (remoteTs >= localTs) {
                            console.log(`🔄 Syncing ${key} from Cloud (Remote: ${remoteTs}, Local: ${localTs})`);
                            localStorage.setItem(storageKey, remoteStr);
                            localStorage.setItem(storageKey + '_timestamp', remoteTs);

                            // Important: Dispatch event so UI updates
                            window.dispatchEvent(new Event('storage-update'));

                            // Specific event for students to refresh list
                            if (key === 'students') window.dispatchEvent(new Event('students-updated'));
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
     * Upload all local data to Firebase
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
     * Manual pull from cloud
     */
    async syncFromCloud() {
        if (!window.db) return false;
        updateStatus('syncing');
        const keys = ['students', 'users', 'classes', 'settings', 'examinerRewards'];

        try {
            for (const key of keys) {
                const docRef = window.db.collection(COLLECTION_NAME).doc(key);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const remoteData = docSnap.data().data || [];
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
    },

    /**
     * Upload file to Firebase Storage
     * Returns the upload task for progress monitoring
     */
    uploadFile(path, file) {
        if (!window.storage) throw new Error("Storage not initialized");
        const ref = window.storage.ref(path);
        return ref.put(file);
    },

    /**
     * Delete file from Firebase Storage
     */
    async deleteFile(path) {
        if (!window.storage) throw new Error("Storage not initialized");
        const ref = window.storage.ref(path);
        return ref.delete();
    }
};

window.firebaseService = firebaseService;
