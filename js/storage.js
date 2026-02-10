const STORAGE_KEYS = {
  STUDENTS: 'exot_students',
  USERS: 'exot_users',
  CLASSES: 'exot_classes',
  SESSION: 'exot_session',
  EXAMINER_REWARDS: 'exot_examiner_rewards',
  ACTIVITY_LOG: 'exot_activity_log',
  SETTINGS: 'exot_settings',
  LAST_ACTIVITY: 'exot_last_activity'
};

// Default admin
const DEFAULT_USERS = [
  {
    id: 'admin-001',
    username: 'admin',
    password: 'exot2026',
    name: 'Administrator',
    role: 'panitia_utama',
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

  // GOOGLE SHEETS SYNC LISTENERS
  const setupGoogleSync = () => {
    if (window.googleSheetsAPI) {
      console.log('📊 Google Sheets API initialized');
      // Update sync status to online
      updateSyncStatus('online');

      // Perform initial sync from cloud (optional, or manual)
      // window.googleSheetsAPI.syncFromCloud();
    }
  };

  setupGoogleSync();
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

// Helper to save to Google Sheets (Throttled)
let syncTimeout;
function saveToFirebase(path, data) { // Keeping name for compatibility, but acts as saveToGoogleSheets
  // We ignore 'path' and 'data' args because Google Sheets syncs EVERYTHING at once in this MVP

  clearTimeout(syncTimeout);
  updateSyncStatus('syncing');

  syncTimeout = setTimeout(() => {
    if (window.googleSheetsAPI) {
      window.googleSheetsAPI.syncToCloud()
        .then(res => {
          if (res && !res.error) updateSyncStatus('online');
          else updateSyncStatus('error');
        })
        .catch(err => {
          console.error(err);
          updateSyncStatus('offline');
        });
    }
  }, 2000); // 2 second debounce
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
  saveToFirebase('users', users);
}

function addUser(username, password, name, role, subject = null, assignedClasses = []) {
  const users = getUsers();

  // Check duplicate username
  if (users.find(u => u.username === username)) {
    return { error: 'Username sudah ada!' };
  }

  const newUser = {
    id: generateId(),
    username: username.trim(),
    password: password,
    name: name.trim(),
    role: role, // panitia_utama, penguji
    subject: subject, // english, arabic, alquran (for penguji)
    assignedClasses: assignedClasses,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  logActivity('user_add', `Added user: ${name} (${role})`);
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
  if (id === 'admin-001') return false; // Can't delete main admin
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
  return true;
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

// ========================================
// Student CRUD Operations
// ========================================

function getStudents() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || [];
}

function saveStudents(students) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  saveToFirebase('students', students);
}

function addStudent(name, studentClass, type = 'siswa') {
  const students = getStudents();
  const newStudent = {
    id: generateId(),
    name: name.trim(),
    class: studentClass.trim(),
    type: type, // siswa, guru
    qrCode: null,
    attended: false,
    attendedAt: null,
    scores: {
      english: null,
      arabic: null,
      alquran: null
    },
    scoredBy: {
      english: null,
      arabic: null,
      alquran: null
    },
    createdAt: new Date().toISOString()
  };

  // Generate unique short code for QR
  let shortCode;
  let isUnique = false;
  while (!isUnique) {
    shortCode = generateShortCode();
    if (!students.find(s => s.qrCode === shortCode)) {
      isUnique = true;
    }
  }

  newStudent.qrCode = shortCode;
  students.push(newStudent);
  saveStudents(students);

  // Auto-add class if new
  addClass(studentClass);

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

  logActivity('score_update', `Scored ${student.name}: ${subject}=${score}`);

  return updateStudent(studentId, { scores, scoredBy });
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
  const user = users.find(u => u.username === username && u.password === password);

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

