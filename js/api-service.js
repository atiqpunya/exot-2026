/**
 * API Service for EXOT 2026
 * Handles communication with local PHP Backend
 * & Firebase Realtime Database for instant signaling
 */

const API_URL = './api/index.php';
const SYNC_CHANNEL = new BroadcastChannel('exot_sync_channel');

const apiService = {
    firebaseDb: null,
    isFirebaseInitialized: false,

    async save(key, data) {
        try {
            let type = key;
            if (key.startsWith('exot_')) type = key.replace('exot_', '');

            // Map legacy keys
            if (key === 'exot_students' || key === 'students') type = 'students';
            if (key === 'exot_users' || key === 'users') type = 'users';
            if (key === 'exot_questions' || key === 'questions') type = 'questions';

            const payload = {
                action: 'save',
                type: type,
                data: data
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "No error body");
                throw new Error(`Cloud Error: ${response.status} ${response.statusText} pada POST ${API_URL}`);
            }
            const result = await response.json();

            // 1. Notify other tabs (Local)
            SYNC_CHANNEL.postMessage({ type: 'data-updated', key: key });

            // 2. Notify other browsers (Online Signal)
            this._sendSyncSignal();

            return result;
        } catch (error) {
            console.error("API Save Error:", error);
            return { error: error.message || "Unknown Cloud Error" };
        }
    },

    async uploadFile(file, subject = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);
        formData.append('action', 'uploadFile');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
            const result = await response.json();

            SYNC_CHANNEL.postMessage({ type: 'files-updated' });
            this._sendSyncSignal();

            return result;
        } catch (error) {
            console.error("API Upload Error:", error);
            throw error;
        }
    },

    initSync() {
        console.log("🔄 API Sync Service Started (Hybrid Real-Time Mode)");

        this._initFirebase();

        SYNC_CHANNEL.onmessage = (event) => {
            if (event.data.type === 'data-updated' || event.data.type === 'files-updated') {
                console.log("🚀 Instant local sync received");
                this.pollNow();
            }
        };

        // Fallback Polling (Reduced frequency to save requests, signal is fast)
        setInterval(() => this.pollNow(), 15000);

        this.pollNow();
    },

    _initFirebase() {
        if (this.isFirebaseInitialized || typeof firebase === 'undefined') {
            if (typeof firebase === 'undefined') console.warn("Firebase SDK not loaded yet.");
            return;
        }

        try {
            // Check if config is actually filled
            if (!firebaseConfig || firebaseConfig.apiKey === "YOUR_API_KEY") {
                console.warn("⚠️ Firebase configuration is empty. Real-time signaling disabled.");
                return;
            }

            firebase.initializeApp(firebaseConfig);
            this.firebaseDb = firebase.database();
            this.isFirebaseInitialized = true;

            const syncRef = this.firebaseDb.ref('sync_signal');
            syncRef.on('value', (snapshot) => {
                const signal = snapshot.val();
                if (signal && signal.timestamp) {
                    const lastSignal = localStorage.getItem('exot_last_signal');
                    if (signal.timestamp.toString() !== lastSignal) {
                        console.log("🔥 Firebase Signal: Data change detected elsewhere.");
                        localStorage.setItem('exot_last_signal', signal.timestamp);
                        this.pollNow();
                    }
                }
            });
            console.log("📡 Firebase Signaling Online");
        } catch (e) {
            console.error("Firebase Init Error:", e.message);
        }
    },

    _sendSyncSignal() {
        if (!this.isFirebaseInitialized || !this.firebaseDb) return;
        const timestamp = Date.now();
        localStorage.setItem('exot_last_signal', timestamp);
        this.firebaseDb.ref('sync_signal').set({ timestamp: timestamp }).catch(() => { });
    },

    async pollNow() {
        try {
            const timestamp = Date.now();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getAll', _t: timestamp })
            });

            if (!response.ok) {
                console.warn(`Sync Polling failed: HTTP ${response.status} pada ${API_URL}`);
                return;
            }

            const allData = await response.json();
            if (!allData || !allData.success) {
                console.warn("Sync Poll Error: Invalid status from server", allData);
                return;
            }
            let updated = false;

            const syncKeys = [
                { remote: 'students', local: 'exot_students' },
                { remote: 'users', local: 'exot_users' },
                { remote: 'questions', local: 'exot_questions' },
                { remote: 'activity_log', local: 'exot_activity_log' },
                { remote: 'examiner_rewards', local: 'exot_examiner_rewards' },
                { remote: 'settings', local: 'exot_settings' }
            ];

            syncKeys.forEach(mapping => {
                const remoteData = allData[mapping.remote];
                if (remoteData !== undefined && remoteData !== null) {
                    const localDataRaw = localStorage.getItem(mapping.local);
                    const localData = localDataRaw ? JSON.parse(localDataRaw) : null;
                    if (this._isDifferent(localData, remoteData)) {
                        localStorage.setItem(mapping.local, JSON.stringify(remoteData));
                        updated = true;
                    }
                }
            });

            if (updated) {
                console.log("✅ Data updated from Cloud.");
                window.dispatchEvent(new Event('storage-update'));
                window.dispatchEvent(new Event('students-updated'));
            }
        } catch (e) {
            console.error("Sync Poll Error:", e.message);
        }
    },

    _isDifferent(local, remote) {
        if (!local && !remote) return false;
        if (!local || !remote) return true;
        return JSON.stringify(local, Object.keys(local).sort()) !== JSON.stringify(remote, Object.keys(remote).sort());
    }
};

window.apiService = apiService;
