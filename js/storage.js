const STORAGE_KEYS = {
  STUDENTS: 'exot_students',
  USERS: 'exot_users',
  CLASSES: 'exot_classes',
  SESSION: 'exot_session',
  EXAMINER_REWARDS: 'exot_examiner_rewards',
  ACTIVITY_LOG: 'exot_activity_log',
  SETTINGS: 'exot_settings',
  QUESTIONS: 'exot_questions',
  LAST_ACTIVITY: 'exot_last_activity'
};

// Default admin and panitia
const DEFAULT_USERS = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'exot2026',
    name: 'Administrator',
    role: 'panitia_utama', // Super Admin
    subject: null
  },
  {
    id: 'panitia-001',
    username: 'panitia',
    password: 'panitia123',
    name: 'Panitia Pelaksana',
    role: 'panitia', // Restricted Admin
    subject: null
  }
];

// Default classes
const DEFAULT_CLASSES = ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'];

// Default settings
const DEFAULT_SETTINGS = {
  darkMode: false,
  soundEnabled: true,
  sessionTimeout: 15 // minutes
};

// Initialize storage
// Initialize storage
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXAMINER_REWARDS)) {
    localStorage.setItem(STORAGE_KEYS.EXAMINER_REWARDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify([]));
  }

  // FIREBASE SYNC LISTENERS
  const setupFirebaseSync = () => {
    // Wait for firebaseService to be available (it's a module, might load later)
    const checkService = setInterval(() => {
      if (window.firebaseService) {
        clearInterval(checkService);
        console.log('🔥 Firebase Service initialized');
        updateSyncStatus('online'); // Assume online if loaded

        // Listen for real-time updates
        window.firebaseService.initSync();
      }
    }, 500);
  };

  setupFirebaseSync();
  // Auto-heal: Ensure all students have a qrCode
  let modified = false;
  const students = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || [];

  students.forEach(s => {
    if (!s.qrCode) {
      s.qrCode = generateUniqueShortCode(students);
      modified = true;
    }
  });

  if (modified) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    saveToFirebase('students', students);
  }

  // Data Cleanup: Remove corrupted entries (missing ID or Name)
  let cleanStudents = students.filter(s => s.id && s.name);
  if (cleanStudents.length !== students.length) {
    console.warn(`Cleaning up ${students.length - cleanStudents.length} corrupted student entries.`);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cleanStudents));
    saveToFirebase('students', cleanStudents);
  }

  // Auto-heal: Ensure all USERS have a qrCode
  let modifiedUsers = false;
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];

  users.forEach(u => {
    if (!u.qrCode) {
      u.qrCode = generateUniqueShortCode(users);
      modifiedUsers = true;
    }
  });

  if (modifiedUsers) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    saveToFirebase('users', users);
  }
}

// Generate unique ID
function generateId() {
  return 'EXOT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// Generate 5-char short code (A-Z, 0-9)
function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 1, 0 to avoid confusion
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper for unique short code
function generateUniqueShortCode(collection) {
  let shortCode;
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 1000) {
    shortCode = generateShortCode();
    if (!collection.find(item => item.qrCode === shortCode)) {
      isUnique = true;
    }
    attempts++;
  }
  return shortCode || generateId().substr(0, 5); // Fallback
}

// ========================================
// Toast Notification System
// ========================================

function showToast(message, type = 'info', duration = 3000) {
  // Create container if doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto remove
  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return toast;
}

// ========================================
// Sync Status Tracking
// ========================================

// Enhanced Sync Status with Auto-UI
function updateSyncStatus(status) {
  let indicator = document.getElementById('syncStatus');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'syncStatus';
    indicator.style.cssText = 'position:fixed;bottom:20px;right:20px;background:white;padding:10px 20px;border-radius:30px;box-shadow:0 4px 20px rgba(0,0,0,0.1);display:flex;align-items:center;gap:10px;font-family:inherit;font-size:14px;z-index:9999;border:1px solid #e2e8f0;transition:all 0.3s ease;';
    indicator.innerHTML = `<div class="sync-dot" style="width:10px;height:10px;border-radius:50%;background:#cbd5e1;transition:background-color 0.3s;"></div><span class="sync-text" style="font-weight:600;color:#475569;">Connecting...</span>`;
    document.body.appendChild(indicator);
  }

  const colors = { online: '#22c55e', offline: '#ef4444', syncing: '#f59e0b', error: '#ef4444' };
  const texts = { online: 'Terhubung', offline: 'Offline', syncing: 'Menyinkronkan...', error: 'Gagal Sync' };

  const dot = indicator.querySelector('.sync-dot');
  const text = indicator.querySelector('.sync-text');

  if (dot) dot.style.backgroundColor = colors[status] || '#cbd5e1';
  if (text) text.textContent = texts[status] || status;

  // Visual feedback
  if (status === 'syncing') {
    if (dot) dot.style.boxShadow = `0 0 0 4px ${colors.syncing}30`;
    indicator.style.borderColor = colors.syncing;
  } else {
    if (dot) dot.style.boxShadow = 'none';
    indicator.style.borderColor = status === 'online' ? '#bbf7d0' : '#e2e8f0';
  }
}

// Helper to save to Firebase (Throttled)
let syncTimeout;
function saveToFirebase(path, data) {
  // path example: 'students' -> mapped to 'exot_students' internally or by service
  // But wait, storage.js calls it with 'students', 'users', etc.
  // firebaseService.save expects 'exot_students' or 'students'?
  // Let's check firebase-service.js... it expects the full key like 'exot_students'?
  // No, I implemented it to take 'exot_students' and strip 'exot_'.
  // Actually, let's look at storage.js calls:
  // saveToFirebase('students', students)
  // saveToFirebase('users', users)

  // My firebase-service.js: 
  // async save(key, data) { ... const cleanKey = key.replace('exot_', ''); ... }
  // So if I pass 'students', cleanKey is 'students'. content saved to doc 'students'.
  // If I pass 'exot_students', cleanKey is 'students'. content saved to doc 'students'.
  // Consistent.

  clearTimeout(syncTimeout);
  updateSyncStatus('syncing');

  syncTimeout = setTimeout(() => {
    if (window.firebaseService) {
      // We use the full storage key format for consistency with initSync
      const fullKey = path.startsWith('exot_') ? path : `exot_${path}`;

      // Get local timestamp
      const ts = parseInt(localStorage.getItem(fullKey + '_timestamp') || Date.now());

      window.firebaseService.save(fullKey, data, ts)
        .then(res => {
          if (res && res.success) updateSyncStatus('online');
          else updateSyncStatus('error');
        })
        .catch(err => {
          console.error(err);
          updateSyncStatus('offline');
        });
    } else {
      console.warn('Firebase service not ready');
      updateSyncStatus('offline');
    }
  }, 1000); // 1 second debounce
}

// ========================================
// Settings Management
// ========================================

function getSettings() {
  // We simply read from storage. initStorage handles the initial sync setup.
  // Removing initStorage call here to prevent recursion/overhead on every get.
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  // Track local update time
  const ts = Date.now();
  localStorage.setItem(STORAGE_KEYS.SETTINGS + '_timestamp', ts);
  saveToFirebase('settings', settings);
}

function toggleDarkMode() {
  const settings = getSettings();
  settings.darkMode = !settings.darkMode;
  saveSettings(settings);
  applyDarkMode(settings.darkMode);
  return settings.darkMode;
}

function applyDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function toggleSound() {
  const settings = getSettings();
  settings.soundEnabled = !settings.soundEnabled;
  saveSettings(settings);
  return settings.soundEnabled;
}

// ========================================
// Activity Log
// ========================================

function getActivityLog() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG)) || [];
}

function saveActivityLog(log) {
  localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(log));
  // We opt NOT to sync activity log globally to save bandwidth/noise, 
  // or we can sync it if needed. Let's sync it.
  saveToFirebase('activity_log', log);
}

function logActivity(action, details = '') {
  const session = getSession();
  const log = getActivityLog();

  log.unshift({
    id: generateId(),
    action: action, // login, logout, score_update, attendance, data_import, password_change
    userId: session?.userId || 'system',
    userName: session?.name || 'System',
    details: details,
    timestamp: new Date().toISOString()
  });

  // Keep only last 500 entries
  if (log.length > 500) log.length = 500;

  saveActivityLog(log);
}

function clearActivityLog() {
  saveActivityLog([]);
}

// ========================================
// Session Timeout
// ========================================

function updateLastActivity() {
  sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

function checkSessionTimeout() {
  const session = getSession();
  if (!session) return false;

  const lastActivity = sessionStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  if (!lastActivity) {
    updateLastActivity();
    return false;
  }

  const settings = getSettings();
  const timeout = settings.sessionTimeout * 60 * 1000; // Convert to ms
  const elapsed = Date.now() - parseInt(lastActivity);

  if (elapsed > timeout) {
    logout();
    return true; // Session expired
  }

  return false;
}

// ========================================
// Backup & Restore
// ========================================

function createBackup() {
  const backup = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    data: {
      students: getStudents(),
      users: getUsers(),
      classes: getClasses(),
      examinerRewards: getExaminerRewards(),
      activityLog: getActivityLog(),
      settings: getSettings()
    }
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `EXOT_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logActivity('backup', 'Created full backup');
  return true;
}

function restoreBackup(jsonString) {
  try {
    const backup = JSON.parse(jsonString);

    if (!backup.data) {
      return { error: 'Format backup tidak valid!' };
    }

    // Restore each data type
    if (backup.data.students) saveStudents(backup.data.students);
    if (backup.data.users) saveUsers(backup.data.users);
    if (backup.data.classes) saveClasses(backup.data.classes);
    if (backup.data.examinerRewards) saveExaminerRewards(backup.data.examinerRewards);
    if (backup.data.settings) saveSettings(backup.data.settings);

    logActivity('restore', `Restored backup from ${backup.createdAt}`);

    return { success: true, date: backup.createdAt };
  } catch (e) {
    return { error: 'Gagal membaca file backup: ' + e.message };
  }
}

// ========================================
// Password Change
// ========================================

function changePassword(userId, oldPassword, newPassword) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);

  if (idx === -1) return { error: 'User tidak ditemukan!' };
  if (users[idx].password !== oldPassword) return { error: 'Password lama salah!' };
  if (newPassword.length < 4) return { error: 'Password baru minimal 4 karakter!' };

  users[idx].password = newPassword;
  saveUsers(users);

  logActivity('password_change', `Password changed for ${users[idx].name}`);

  return { success: true };
}

// ========================================
// Ranking & Statistics
// ========================================

function getRanking(filterClass = null) {
  let students = getStudents().filter(s =>
    s.scores.english !== null &&
    s.scores.arabic !== null &&
    s.scores.alquran !== null
  );

  if (filterClass) {
    students = students.filter(s => s.class === filterClass);
  }

  // Calculate average and sort
  const ranked = students.map(s => ({
    ...s,
    average: (s.scores.english + s.scores.arabic + s.scores.alquran) / 3
  })).sort((a, b) => b.average - a.average);

  // Add rank
  ranked.forEach((s, i) => s.rank = i + 1);

  return ranked;
}

function getSubjectStats() {
  const students = getAttendedStudents();

  const calcStats = (subject) => {
    const scores = students.filter(s => s.scores[subject] !== null).map(s => s.scores[subject]);
    if (!scores.length) return { count: 0, avg: 0, min: 0, max: 0 };
    return {
      count: scores.length,
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      min: Math.min(...scores),
      max: Math.max(...scores)
    };
  };

  return {
    english: calcStats('english'),
    arabic: calcStats('arabic'),
    alquran: calcStats('alquran')
  };
}

function getRoomStats() {
  const classes = getClasses();
  const students = getStudents();

  return classes.map(cls => {
    const classStudents = students.filter(s => s.class === cls);
    const attended = classStudents.filter(s => s.attended).length;
    const completed = classStudents.filter(s =>
      s.scores.english !== null && s.scores.arabic !== null && s.scores.alquran !== null
    );

    let avgScore = 0;
    if (completed.length) {
      avgScore = completed.reduce((sum, s) =>
        sum + (s.scores.english + s.scores.arabic + s.scores.alquran) / 3, 0
      ) / completed.length;
    }

    return {
      room: cls,
      total: classStudents.length,
      attended: attended,
      completed: completed.length,
      avgScore: avgScore.toFixed(1)
    };
  });
}

// ========================================
// Sound Effects
// ========================================

function playSuccessSound() {
  const settings = getSettings();
  if (!settings.soundEnabled) return;

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) { }
}

function playErrorSound() {
  const settings = getSettings();
  if (!settings.soundEnabled) return;

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 220;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch (e) { }
}

// ========================================
// Classes Management
// ========================================

function getClasses() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES)) || [];
}

function saveClasses(classes) {
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  // Track local update time
  const ts = Date.now();
  localStorage.setItem(STORAGE_KEYS.CLASSES + '_timestamp', ts);
  saveToFirebase('classes', classes);
}

function addClass(className) {
  const classes = getClasses();
  if (!classes.includes(className.trim())) {
    classes.push(className.trim());
    classes.sort();
    saveClasses(classes);
  }
  return classes;
}

function removeClass(className) {
  const classes = getClasses().filter(c => c !== className);
  saveClasses(classes);
  return classes;
}

function updateClass(oldName, newName) {
  const classes = getClasses();
  const idx = classes.indexOf(oldName);
  if (idx !== -1) {
    classes[idx] = newName.trim();
    saveClasses(classes);

    // Update all students with this class
    const students = getStudents();
    students.forEach(s => {
      if (s.class === oldName) {
        s.class = newName.trim();
      }
    });
    saveStudents(students);
  }
  return classes;
}

// ========================================
// Users Management (Multi-Role)
// ========================================

function getUsers() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  // Track local update time
  const ts = Date.now();
  localStorage.setItem(STORAGE_KEYS.USERS + '_timestamp', ts);
  saveToFirebase('users', users);
}

function addUser(username, password, name, role, subject = null, assignedClasses = []) {
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return { error: 'Username sudah ada!' };
  }

  const newUser = createUserObject(username, password, name, role, subject, assignedClasses, users);
  users.push(newUser);
  saveUsers(users);
  logActivity('user_add', `Added user: ${name} (${role})`);
  return newUser;
}

function addUsersBulk(userList) {
  const users = getUsers();
  const added = [];
  const errors = [];

  userList.forEach(u => {
    if (users.find(x => x.username === u.username)) {
      errors.push(`${u.username}: Username sudah ada`);
      return;
    }
    const newUser = createUserObject(u.username, u.password, u.name, u.role, u.subject, u.assignedClasses, users);
    users.push(newUser);
    added.push(newUser);
    // Sync QR to handle uniqueness for next iteration? 
    // createUserObject should handle it if we pass 'users' which is being mutated. YES.
  });

  if (added.length > 0) {
    saveUsers(users);
    logActivity('user_bulk_add', `Added ${added.length} users`);
  }

  return { added, errors };
}

function createUserObject(username, password, name, role, subject, assignedClasses, existingUsers) {
  const newUser = {
    id: generateId(),
    username: username.trim(),
    password: password,
    name: name.trim(),
    role: role,
    subject: subject,
    assignedClasses: assignedClasses || [],
    qrCode: null,
    createdAt: new Date().toISOString()
  };

  newUser.qrCode = generateUniqueShortCode(existingUsers);
  // We need to push a placeholder or rely on the caller pushing to existingUsers
  // In bulk, we are pushing to 'users' reference effectively.

  return newUser;
}

function updateUser(id, updates) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
    return users[idx];
  }
  return null;
}

function deleteUser(id) {
  return deleteUsersBulk([id]);
}

function deleteUsersBulk(ids) {
  const users = getUsers();
  const initialLength = users.length;

  // Filter out users to be deleted, but PROTECT admin-001
  const newUsers = users.filter(u => !ids.includes(u.id) || u.id === 'admin-001');

  if (newUsers.length !== initialLength) {
    saveUsers(newUsers);
    return true; // Changes made
  }
  return false; // No changes
}

function getUserById(id) {
  return getUsers().find(u => u.id === id);
}

function getExaminers() {
  return getUsers().filter(u => u.role === 'penguji');
}

function getExaminersBySubject(subject) {
  return getUsers().filter(u => u.role === 'penguji' && u.subject === subject);
}

function getPanitia() {
  return getUsers().filter(u => u.role === 'panitia');
}

// ========================================
// Student CRUD Operations
// ========================================

function getStudents() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || [];
}

function saveStudents(students) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  // Track local update time
  const ts = Date.now();
  localStorage.setItem(STORAGE_KEYS.STUDENTS + '_timestamp', ts);
  saveToFirebase('students', students);
}

function addStudent(name, studentClass, type = 'siswa') {
  const students = getStudents();
  // ... (existing logic)
  const newStudent = createStudentObject(name, studentClass, type, students);
  // Refactored helper to avoid code duplication

  students.push(newStudent);
  saveStudents(students);
  addClass(studentClass);
  return newStudent;
}

function addStudentsBulk(studentList) {
  const students = getStudents();
  const newStudents = [];

  studentList.forEach(item => {
    // Check duplicates? Optionally. For now assume we want to add all.
    const s = createStudentObject(item.name, item.class, item.type || 'siswa', students);
    students.push(s);
    newStudents.push(s);

    // Track classes
    addClass(item.class); // addClass checks existence internally, but it saves every time.
    // optimize addClass?
  });

  saveStudents(students); // Save ONCE
  return newStudents;
}

// Helper to create object and generate QR
function createStudentObject(name, studentClass, type, existingStudents) {
  const newStudent = {
    id: generateId(),
    name: name.trim(),
    class: studentClass.trim(),
    type: type,
    qrCode: null,
    attended: false,
    attendedAt: null,
    scores: { english: null, arabic: null, alquran: null },
    scoredBy: { english: null, arabic: null, alquran: null },
    createdAt: new Date().toISOString()
  };

  newStudent.qrCode = generateUniqueShortCode(existingStudents);
  // We don't push here because the caller will push the full object.
  // The uniqueness check relies on the list passed in.
  // Ideally, addStudentsBulk should handle this, or we should check against pending codes.
  // But given standard usage, it's safer to just let it be or checking against a temporary set if needed.
  // For now, removing the push fixes the corruption. The risk of collision in one millisecond batch is low with 32 chars length 5 (33M combos). 
  // Better: generateUniqueShortCode takes a collection.
  // We can pass the updated list?

  return newStudent;
}

function getStudentById(id) {
  return getStudents().find(s => s.id === id || s.qrCode === id);
}

function updateStudent(id, updates) {
  const students = getStudents();
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    students[index] = { ...students[index], ...updates };
    saveStudents(students);
    return students[index];
  }
  return null;
}

function deleteStudent(id) {
  const students = getStudents().filter(s => s.id !== id);
  saveStudents(students);
}

function markAttendance(studentId) {
  const student = getStudentById(studentId);
  if (student) {
    logActivity('attendance', `Marked attendance: ${student.name}`);
    playSuccessSound();
  }
  return updateStudent(studentId, {
    attended: true,
    attendedAt: new Date().toISOString()
  });
}

function updateScore(studentId, subject, score, examinerId) {
  const student = getStudentById(studentId);
  if (!student) return null;

  const scores = { ...student.scores };
  const scoredBy = { ...student.scoredBy };

  scores[subject] = score;
  scoredBy[subject] = examinerId;

  // Call updateStudent to save changes
  logActivity('score_update', `Scored ${student.name}: ${subject}=${score}`);

  // Call updateStudent to save changes
  return updateStudent(studentId, { scores, scoredBy });
}

// ========================================
// Questions Management
// ========================================

function getQuestions() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS)) || [];
}

function saveQuestions(questions) {
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  const ts = Date.now();
  localStorage.setItem(STORAGE_KEYS.QUESTIONS + '_timestamp', ts);
  saveToFirebase('questions', questions);
}

function addQuestion(room, subject, content, type = 'text', targetStudent = null, storagePath = null) {
  const questions = getQuestions();
  const newQuestion = {
    id: generateId(),
    room: room,
    subject: subject, // english, arabic, alquran
    content: content,
    type: type, // text, link, image
    targetStudent: targetStudent, // null or student name
    storagePath: storagePath, // Path in Firebase Storage
    createdAt: new Date().toISOString()
  };
  questions.push(newQuestion);
  saveQuestions(questions);
  return newQuestion;
}

function deleteQuestion(id) {
  const questions = getQuestions().filter(q => q.id !== id);
  saveQuestions(questions);
}

function getQuestionsByRoomAndSubject(room, subject, studentName = null) {
  const questions = getQuestions().filter(q => q.room === room && q.subject === subject);

  if (studentName) {
    // Prioritize student specific questions
    const studentSpecific = questions.filter(q => q.targetStudent && q.targetStudent.toLowerCase() === studentName.toLowerCase());
    if (studentSpecific.length > 0) return studentSpecific;

    // If no student specific, return general questions (where targetStudent is null)
    return questions.filter(q => !q.targetStudent);
  }

  // If no studentName provided (e.g. admin view), return all? or just general?
  // For safety, return all so admin sees everything.
  return questions;
}



// ========================================
// Examiner & Filtering
// ========================================

function getAttendedStudents() {
  return getStudents().filter(s => s.attended);
}

function getStudentsByClass(className) {
  return getStudents().filter(s => s.class === className);
}

function getStudentsForExaminer(examinerId, subject) {
  const examiner = getUserById(examinerId);
  if (!examiner) return [];

  const attended = getAttendedStudents();

  // If examiner has assigned classes, filter by them
  if (examiner.assignedClasses && examiner.assignedClasses.length > 0) {
    return attended.filter(s => examiner.assignedClasses.includes(s.class));
  }

  return attended;
}

function getExaminerProgress(examinerId, subject) {
  const students = getStudentsForExaminer(examinerId, subject);
  const scored = students.filter(s => s.scores[subject] !== null).length;
  return {
    total: students.length,
    scored: scored,
    remaining: students.length - scored,
    complete: students.length > 0 && scored === students.length
  };
}

// ========================================
// Examiner Rewards
// ========================================

function getExaminerRewards() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAMINER_REWARDS)) || [];
}

function saveExaminerRewards(rewards) {
  localStorage.setItem(STORAGE_KEYS.EXAMINER_REWARDS, JSON.stringify(rewards));
  // Track local update time
  const ts = Date.now();
  localStorage.setItem(STORAGE_KEYS.EXAMINER_REWARDS + '_timestamp', ts);
  saveToFirebase('rewards', rewards);
}

function generateExaminerReward(examinerId) {
  const examiner = getUserById(examinerId);
  if (!examiner) return null;

  const rewards = getExaminerRewards();

  // Check if already has reward
  if (rewards.find(r => r.examinerId === examinerId)) {
    return { error: 'Reward sudah di-generate sebelumnya!' };
  }

  // Generate unique short code
  let shortCode;
  let isUnique = false;
  while (!isUnique) {
    shortCode = generateShortCode();
    if (!rewards.find(r => r.qrCode === shortCode)) {
      isUnique = true;
    }
  }

  const reward = {
    id: 'REWARD-' + Date.now().toString(36),
    examinerId: examinerId,
    examinerName: examiner.name,
    subject: examiner.subject,
    qrCode: shortCode, // Use short code for QR and manual input
    generatedAt: new Date().toISOString(),
    claimed: false,
    claimedAt: null
  };

  rewards.push(reward);
  saveExaminerRewards(rewards);
  logActivity('reward_generate', `Generated reward for ${examiner.name} (Code: ${shortCode})`);
  return reward;
}

function claimExaminerReward(qrCode) {
  const rewards = getExaminerRewards();
  const idx = rewards.findIndex(r => r.qrCode === qrCode || r.id === qrCode);

  if (idx === -1) return { error: 'QR Code tidak valid!' };
  if (rewards[idx].claimed) return { error: 'Reward sudah diklaim!' };

  rewards[idx].claimed = true;
  rewards[idx].claimedAt = new Date().toISOString();
  saveExaminerRewards(rewards);

  logActivity('reward_claim', `Claimed reward for ${rewards[idx].examinerName}`);
  playSuccessSound();

  return rewards[idx];
}

function getRewardByQR(qrCode) {
  return getExaminerRewards().find(r => r.qrCode === qrCode || r.id === qrCode);
}

// ========================================
// Authentication
// ========================================

function login(username, password) {
  const users = getUsers();
  // Case-insensitive username, exact password
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

  if (user) {
    const session = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      subject: user.subject,
      assignedClasses: user.assignedClasses || [],
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    updateLastActivity();
    logActivity('login', `${user.name} logged in as ${user.role}`);
    return session;
  }
  return null;
}

function logout() {
  const session = getSession();
  if (session) {
    logActivity('logout', `${session.name} logged out`);
  }
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
}

function getSession() {
  const session = sessionStorage.getItem(STORAGE_KEYS.SESSION);
  return session ? JSON.parse(session) : null;
}

function isLoggedIn() {
  return getSession() !== null;
}

function isPanitiaUtama() {
  const session = getSession();
  return session && session.role === 'panitia_utama';
}

function isPenguji() {
  const session = getSession();
  return session && session.role === 'penguji';
}

function getCurrentSubject() {
  const session = getSession();
  return session ? session.subject : null;
}

function requireAuth(allowedRoles = null) {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    alert('Akses ditolak! Anda tidak memiliki izin untuk halaman ini.');
    window.location.href = 'index.html';
    return false;
  }

  return session;
}

// ========================================
// Statistics
// ========================================

function getStatistics() {
  const students = getStudents();
  const attended = students.filter(s => s.attended).length;
  const completed = students.filter(s =>
    s.scores.english !== null &&
    s.scores.arabic !== null &&
    s.scores.alquran !== null
  ).length;

  return {
    total: students.length,
    siswa: students.filter(s => s.type !== 'guru').length,
    guru: students.filter(s => s.type === 'guru').length,
    attended: attended,
    pending: students.length - attended,
    completed: completed,
    inProgress: attended - completed
  };
}

// ========================================
// Export
// ========================================

function exportToCSV() {
  const students = getStudents();
  const headers = ['No', 'Nama', 'Ruangan', 'Jenis', 'Hadir', 'English', 'Arabic', 'Al-Quran', 'Rata-rata', 'Rank'];

  // Get ranking for rank info
  const ranking = getRanking();
  const rankMap = {};
  ranking.forEach(r => rankMap[r.id] = r.rank);

  const rows = students.map((s, idx) => {
    const avg = (s.scores.english !== null && s.scores.arabic !== null && s.scores.alquran !== null)
      ? ((s.scores.english + s.scores.arabic + s.scores.alquran) / 3).toFixed(1)
      : '-';

    return [
      idx + 1,
      s.name,
      s.class,
      s.type || 'siswa',
      s.attended ? 'Ya' : 'Tidak',
      s.scores.english ?? '-',
      s.scores.arabic ?? '-',
      s.scores.alquran ?? '-',
      avg,
      rankMap[s.id] || '-'
    ];
  });

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `EXOT_Results_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logActivity('export', 'Exported results to CSV');
}

function exportCanvaCSV() {
  const students = getStudents();
  const panitia = getUsers().filter(u => u.role === 'panitia');
  const penguji = getUsers().filter(u => u.role === 'penguji');

  // Check checkboxes
  const incStudent = document.getElementById('checkStudent')?.checked ?? true;
  const incExaminer = document.getElementById('checkExaminer')?.checked ?? true;
  const incCommittee = document.getElementById('checkCommittee')?.checked ?? true;

  if (!incStudent && !incExaminer && !incCommittee) {
    alert('Please select at least one category!');
    return;
  }

  // Canva Bulk Create Header
  // Request: Name, Role, Code (Role uses English: Student, Examiner, Committee)
  const headers = ['Name', 'Role', 'Code'];

  const rows = [];

  // Add Students
  if (incStudent) {
    students.forEach(s => {
      rows.push([
        s.name,
        'Student',
        s.qrCode || s.id
      ]);
    });
  }

  // Add Panitia
  if (incCommittee) {
    panitia.forEach(p => {
      rows.push([
        p.name,
        'Committee',
        p.qrCode || p.id
      ]);
    });
  }

  // Add Penguji
  if (incExaminer) {
    penguji.forEach(e => {
      rows.push([
        e.name,
        'Examiner',
        e.qrCode || e.id
      ]);
    });
  }

  // CSV content
  const csvContent = [headers, ...rows]
    .map(e => e.map(i => `"${i}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `EXOT_Canva_Bulk_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logActivity('export', 'Exported Canva Bulk CSV (Filtered)');
}

// ========================================
// Initialize & Session Check
// ========================================

// Initialize on load
initStorage();

// Apply saved dark mode
document.addEventListener('DOMContentLoaded', function () {
  const settings = getSettings();
  applyDarkMode(settings.darkMode);

  // Update activity on user interaction
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(evt => {
    document.addEventListener(evt, updateLastActivity, { passive: true, once: false });
  });

  // Check session timeout every minute
  setInterval(() => {
    if (checkSessionTimeout()) {
      alert('Sesi Anda telah berakhir. Silakan login kembali.');
      window.location.href = 'index.html';
    }
  }, 60000);
});

