
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUUexN0c4yfrQWNCWjP9IS1F_PpTaDn5OLZ-eJ4pJUIA8QNwbnhknlUhNsrri0GzhT/exec';

/**
 * Generic fetch function for Google Apps Script
 */
async function callSheetAPI(action, payload = null) {
    // Show sync status
    updateSyncStatus('syncing');

    try {
        let response;

        if (payload) {
            // POST request
            response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight
                },
                body: JSON.stringify({ action, payload })
            });
        } else {
            // GET request
            const url = new URL(GOOGLE_SCRIPT_URL);
            url.searchParams.append('action', action);
            response = await fetch(url, { method: 'GET', mode: 'cors' });
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        updateSyncStatus('online');
        return data;

    } catch (error) {
        console.error('Sheet API Error:', error);
        updateSyncStatus('offline');
        return { error: error.message };
    }
}

/**
 * Sync all data from Sheets to LocalStorage
 */
async function syncFromCloud() {
    const data = await callSheetAPI('getData');
    if (data.error) return false;

    if (data.users) localStorage.setItem('exot_users', JSON.stringify(data.users));
    if (data.students) localStorage.setItem('exot_students', JSON.stringify(data.students));
    if (data.classes) localStorage.setItem('exot_classes', JSON.stringify(data.classes));
    if (data.settings) localStorage.setItem('exot_settings', JSON.stringify(data.settings));

    // Trigger update
    window.dispatchEvent(new Event('storage-update'));
    return true;
}

/**
 * Push all local data to Sheets (Full Sync)
 */
async function syncToCloud() {
    const payload = {
        users: JSON.parse(localStorage.getItem('exot_users') || '[]'),
        students: JSON.parse(localStorage.getItem('exot_students') || '[]'),
        classes: JSON.parse(localStorage.getItem('exot_classes') || '[]'),
        settings: JSON.parse(localStorage.getItem('exot_settings') || '{}')
    };

    return await callSheetAPI('sync', payload);
}

// Make globally available
window.googleSheetsAPI = {
    call: callSheetAPI,
    syncFromCloud,
    syncToCloud
};
