/**
 * GOOGLE APPS SCRIPT SERVICE (Replaces Firebase)
 * Mimics the Firebase interface so we don't have to rewrite the whole app.
 */

// PASTE YOUR WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzGtIVdhLxAYaH8aFWN7dr08Kssxfb13M-8UPpIPDdtK2GBAenzLyuTrgjgChiaBKHcg/exec";

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

        // Poll every 15 seconds
        setInterval(async () => {
            try {
                // We use a GET request to fetch all data
                const response = await fetch(`${SCRIPT_URL}?action=getAll`);
                const allData = await response.json();

                // Sync logic similar to original
                Object.keys(allData).forEach(key => {
                    const remoteData = allData[key]; // This is the actual data object
                    // We need to implement conflict resolution? 
                    // For simplicity in this "Free" mode, Remote Wins or Merge?

                    const localKey = `exot_${key}`; // e.g. exot_students
                    const localStr = localStorage.getItem(localKey);

                    if (JSON.stringify(remoteData.data) !== localStr) {
                        // Check timestamps if available, else just overwrite (simpler)
                        // Let's assume Remote is authority for now to enable sync
                        localStorage.setItem(localKey, JSON.stringify(remoteData.data));
                        window.dispatchEvent(new Event('storage-update'));
                    }
                });

            } catch (e) {
                console.warn("Sync Poll Failed:", e);
            }
        }, 15000);
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
