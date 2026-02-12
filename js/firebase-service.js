/**
 * GOOGLE APPS SCRIPT SERVICE (Replaces Firebase)
 * Mimics the Firebase interface so we don't have to rewrite the whole app.
 */

// PASTE YOUR WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFSO_O0gb8uRA35qMI6TfZBCvMyTBVo3HTF0T6AV2Qdrj-KQLtNZ3aL8CH76r_1XgWRA/exec";

const firebaseService = {
    async save(key, data, timestamp = null) {
        if (!SCRIPT_URL) {
            console.error("GAS URL not set!");
            return { success: false, error: "Script URL validation failed" };
        }

        try {
            const payload = {
                action: 'save',
                key: key,
                data: data,
                timestamp: timestamp || Date.now()
            };

            // Use no-cors mode? No, GAS requires CORS redirect handling. 
            // Standard fetch handles it if GAS script is set to "Anyone".
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error("GAS Save Error:", error);
            return { success: false, error: error.message };
        }
    },

    initSync() {
        if (!SCRIPT_URL) return;
        console.log("🔄 GAS Sync Service Started (Polling Mode)");

        // Poll every 4 seconds (Balance between responsiveness and quota)
        setInterval(async () => {
            try {
                // We use a GET request to fetch all data
                const response = await fetch(`${SCRIPT_URL}?action=getAll`);
                const allData = await response.json();

                let syncCount = 0;

                // Sync logic similar to original
                Object.keys(allData).forEach(key => {
                    // Check if key already has prefix 'exot_'
                    // Our backend usually stores exactly what we send.
                    // If we sent 'exot_students', key is 'exot_students'.

                    let localKey = key;
                    if (!localKey.startsWith('exot_')) {
                        localKey = `exot_${key}`;
                    }

                    const remoteData = allData[key];
                    const localStr = localStorage.getItem(localKey);

                    // If remote has data (it should be an object with .data and .timestamp)
                    // If it's raw data (older version), handle that too?
                    let remoteContent = remoteData;
                    if (remoteData && remoteData.data) {
                        remoteContent = remoteData.data;
                    }

                    // Compare content strings
                    const remoteStr = JSON.stringify(remoteContent);

                    if (remoteStr !== localStr) {
                        // Update Local
                        localStorage.setItem(localKey, remoteStr);
                        syncCount++;
                    }
                });

                if (syncCount > 0) {
                    console.log(`🔄 Synced ${syncCount} items from cloud.`);
                    // Dispatch event for UI to update
                    window.dispatchEvent(new Event('storage-update'));
                    // Also trigger specific student update event if needed
                    window.dispatchEvent(new Event('students-updated'));
                }

            } catch (e) {
                console.warn("Sync Poll Failed:", e);
            }
        }, 4000);
    },

    uploadFile(path, file) {
        // Return a mock "Task" object that mimics Firebase Task
        const task = new MockUploadTask(path, file);
        task.start();
        return task;
    },

    deleteFile(path) {
        // Not implemented in v1 Free
        return Promise.resolve();
    }
};

class MockUploadTask {
    constructor(path, file) {
        this.path = path;
        this.file = file;
        this.listeners = {
            'state_changed': [],
        };
        this.snapshot = {
            bytesTransferred: 0,
            totalBytes: file.size,
            ref: {
                getDownloadURL: async () => this.downloadURL
            }
        };
        this.downloadURL = "";
    }

    on(event, next, error, complete) {
        if (event === 'state_changed') {
            this.listeners[event].push({ next, error, complete });
        }
    }

    start() {
        if (!SCRIPT_URL) {
            this.emitError(new Error("Script URL not configured!"));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = e.target.result.split(',')[1];

                // Emulate progress (fake, since fetch doesn't stream upload progress easily)
                this.updateProgress(20);

                const payload = {
                    action: 'upload',
                    filename: this.file.name,
                    mimeType: this.file.type,
                    bytes: base64
                };

                this.updateProgress(50);

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.success) {
                    this.downloadURL = result.viewUrl; // Google Drive View URL
                    this.updateProgress(100);
                    this.emitComplete();
                } else {
                    throw new Error(result.error || "Upload failed");
                }

            } catch (err) {
                this.emitError(err);
            }
        };
        reader.readAsDataURL(this.file);
    }

    updateProgress(percent) {
        this.snapshot.bytesTransferred = Math.floor(this.snapshot.totalBytes * (percent / 100));
        this.listeners['state_changed'].forEach(l => {
            if (l.next) l.next(this.snapshot);
        });
    }

    emitError(err) {
        this.listeners['state_changed'].forEach(l => {
            if (l.error) l.error(err);
        });
    }

    emitComplete() {
        this.listeners['state_changed'].forEach(l => {
            if (l.complete) l.complete();
        });
    }
}

// Global export
window.firebaseService = firebaseService;
console.log("🚀 GAS Service initialized (Free Mode)");
