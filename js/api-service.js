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
        // Poll every 5 seconds for updates
        setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}?action=getAll`);
                if (!response.ok) throw new Error("Sync Failed");

                const allData = await response.json();
                /* 
                   Data format from API:
                   {
                     students: [...],
                     users: [...],
                     questions: [...],
                     classes: [...]
                   }
                */

                let updated = false;

                // Sync Logic: Check differences and update LocalStorage
                // Note: This replaces LocalStorage with Server Data.
                // In a true production app, we should be careful about overwruiting unsaved local changes.
                // But for this "Admin" dashboard, Server Truth is usually preferred.

                if (allData.students) {
                    const local = localStorage.getItem('exot_students');
                    const remote = JSON.stringify(allData.students);
                    if (local !== remote) {
                        localStorage.setItem('exot_students', remote);
                        updated = true;
                    }
                }

                if (allData.users) {
                    // Merge? Or replace? 
                    // Legacy users might be mixed. For now, replace 'exot_users'
                    const local = localStorage.getItem('exot_users');
                    const remote = JSON.stringify(allData.users);
                    if (local !== remote) {
                        localStorage.setItem('exot_users', remote);
                        updated = true;
                    }
                }

                if (updated) {
                    console.log("🔄 Data synced from server.");
                    window.dispatchEvent(new Event('storage-update'));
                    window.dispatchEvent(new Event('students-updated'));
                }

            } catch (e) {
                console.warn("Sync Poll Failed:", e);
                // Optional: Show offline indicator
            }
        }, 5000);
    }
};

// Expose globally
window.apiService = apiService;
