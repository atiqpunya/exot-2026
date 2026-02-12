/**
 * API Service for EXOT 2026
 * Handles communication with local PHP Backend
 */

const API_URL = './api/index.php';

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
            return await response.json();
        } catch (error) {
            console.error("API Upload Error:", error);
            throw error;
        }
    },

    initSync() {
        console.log("🔄 API Sync Service Started (Polling Mode)");
        // Poll every 10 seconds for updates (reducing frequent polling)
        setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}?action=getAll`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                const allData = await response.json();
                let updated = false;

                // Sync Students
                if (allData.students && Array.isArray(allData.students)) {
                    const local = localStorage.getItem('exot_students');
                    const remote = JSON.stringify(allData.students);
                    if (local !== remote) {
                        // Only update if there's actual data or we explicitly want to clear
                        // To prevent "data loss" on connection glitched empty responses
                        localStorage.setItem('exot_students', remote);
                        updated = true;
                    }
                }

                // Sync Users
                if (allData.users && Array.isArray(allData.users)) {
                    const local = localStorage.getItem('exot_users');
                    const remote = JSON.stringify(allData.users);
                    if (local !== remote) {
                        localStorage.setItem('exot_users', remote);
                        updated = true;
                    }
                }

                // Sync Questions
                if (allData.questions && Array.isArray(allData.questions)) {
                    const local = localStorage.getItem('exot_questions');
                    const remote = JSON.stringify(allData.questions);
                    if (local !== remote) {
                        localStorage.setItem('exot_questions', remote);
                        updated = true;
                    }
                }

                // Sync Activity Log
                if (allData.activity_log && Array.isArray(allData.activity_log)) {
                    const local = localStorage.getItem('exot_activity_log');
                    const remote = JSON.stringify(allData.activity_log);
                    if (local !== remote) {
                        localStorage.setItem('exot_activity_log', remote);
                        updated = true;
                    }
                }

                // Sync Examiner Rewards
                if (allData.examiner_rewards && Array.isArray(allData.examiner_rewards)) {
                    const local = localStorage.getItem('exot_examiner_rewards');
                    const remote = JSON.stringify(allData.examiner_rewards);
                    if (local !== remote) {
                        localStorage.setItem('exot_examiner_rewards', remote);
                        updated = true;
                    }
                }

                // Sync Settings
                if (allData.settings && typeof allData.settings === 'object') {
                    const local = localStorage.getItem('exot_settings');
                    const remote = JSON.stringify(allData.settings);
                    if (local !== remote) {
                        localStorage.setItem('exot_settings', remote);
                        updated = true;
                    }
                }

                if (updated) {
                    console.log("🔄 Data synced from server.");
                    window.dispatchEvent(new Event('storage-update'));
                    window.dispatchEvent(new Event('students-updated'));
                }

            } catch (e) {
                console.warn("Sync Poll Failed:", e.message);
                // Dispatch event for UI indicator if needed
                window.dispatchEvent(new CustomEvent('sync-error', { detail: e.message }));
            }
        }, 10000);
    }
};

// Expose globally
window.apiService = apiService;
