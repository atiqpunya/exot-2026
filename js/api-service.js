/**
 * API Service for EXOT 2026
 * Handles communication with local PHP Backend
 */

const API_URL = './api/index.php';
const SYNC_CHANNEL = new BroadcastChannel('exot_sync_channel');

const apiService = {
    async save(key, data) {
        try {
            // Determine type based on key prefix or content
            let type = key;
            if (key.startsWith('exot_')) {
                type = key.replace('exot_', '');
            }

            // Map legacy keys to API types
            if (key === 'exot_students' || key === 'students') type = 'students';
            if (key === 'exot_users' || key === 'users') type = 'users';
            if (key === 'exot_questions' || key === 'questions') type = 'questions';

            const payload = {
                action: 'save', // For GET based router if needed, but we POST
                type: type,
                data: data
            };

            const response = await fetch(`${API_URL}?action=save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            // Notify other tabs immediately
            SYNC_CHANNEL.postMessage({ type: 'data-updated', key: key });

            return result;
        } catch (error) {
            console.error("API Save Error:", error);
            return { error: error.message };
        }
    },

    async uploadFile(file, subject = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);
        formData.append('action', 'uploadFile');

        try {
            const response = await fetch(`${API_URL}?action=uploadFile`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
            const result = await response.json();

            // Notify other tabs about file upload if needed
            SYNC_CHANNEL.postMessage({ type: 'files-updated' });

            return result;
        } catch (error) {
            console.error("API Upload Error:", error);
            throw error;
        }
    },

    initSync() {
        console.log("🔄 API Sync Service Started (Hybrid Mode)");

        // 1. Listen for instant updates from other tabs
        SYNC_CHANNEL.onmessage = (event) => {
            if (event.data.type === 'data-updated' || event.data.type === 'files-updated') {
                console.log("🚀 Instant sync received from another tab");
                this.pollNow();
            }
        };

        // 2. Poll every 5 seconds for updates from other browsers/devices
        setInterval(() => this.pollNow(), 5000);

        // Initial poll
        this.pollNow();
    },

    async pollNow() {
        try {
            const response = await fetch(`${API_URL}?action=getAll`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const allData = await response.json();
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
                if (remoteData) {
                    const localStr = localStorage.getItem(mapping.local);
                    const remoteStr = JSON.stringify(remoteData);
                    if (localStr !== remoteStr) {
                        localStorage.setItem(mapping.local, remoteStr);
                        updated = true;
                    }
                }
            });

            if (updated) {
                console.log("🔄 Data synced from server/tab.");
                window.dispatchEvent(new Event('storage-update'));
                window.dispatchEvent(new Event('students-updated'));
            }

        } catch (e) {
            console.error("Sync Poll Error Detail:", e);
            window.dispatchEvent(new CustomEvent('sync-error', {
                detail: {
                    message: "Server unreachable or API error: " + e.message,
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }
};


// Expose globally
window.apiService = apiService;
