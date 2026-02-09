// Authentication Function
function authenticateUser(username, password) {
    // Simulate authentication logic
    if (username === 'testUser' && password === 'testPassword') {
        return true; // Authentication successful
    }
    return false; // Authentication failed
}

// Application Flow Validation Function
function validateAppFlow(step) {
    const validSteps = ['login', 'dashboard', 'settings', 'logout'];
    if (validSteps.includes(step)) {
        return true; // Valid step
    }
    return false; // Invalid step
}

// Export functions for use in other modules
module.exports = { authenticateUser, validateAppFlow };