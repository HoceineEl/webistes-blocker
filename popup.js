// DOM Elements
const timer = document.getElementById('timer');
const sessionStatus = document.getElementById('sessionStatus');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const durationBtns = document.querySelectorAll('.duration-btn');
const customDurationInput = document.getElementById('customDuration');
const hardModeCheckbox = document.getElementById('hardMode');
const sessionControls = document.getElementById('sessionControls');
const verificationInput = document.getElementById('verificationInput');
const verificationPhrase = document.getElementById('verificationPhrase');
const verificationText = document.getElementById('verificationText');
const verificationError = document.getElementById('verificationError');
const focusTimeElement = document.getElementById('focusTime');
const blockedCountElement = document.getElementById('blockedCount');
const streakElement = document.getElementById('streak');
const settingsBtn = document.getElementById('settingsBtn');
const groupsBtn = document.getElementById('groupsBtn');

// State
let selectedDuration = 25;
let timerInterval = null;
let sessionActive = false;

// Initialize
async function initialize() {
    try {
        const { session, stats } = await chrome.storage.local.get(['session', 'stats']);

        if (session?.active) {
            sessionActive = true;
            updateUIForActiveSession(session);
        } else {
            resetUI();
        }

        updateStats(stats);
        setupEventListeners();

        // Set initial duration button
        const defaultDurationBtn = document.querySelector('.duration-btn[data-duration="25"]');
        if (defaultDurationBtn) {
            defaultDurationBtn.classList.add('active');
        }

        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.session) {
                    const newSession = changes.session.newValue;
                    if (newSession.active !== sessionActive) {
                        if (newSession.active) {
                            updateUIForActiveSession(newSession);
                        } else {
                            resetUI();
                        }
                    }
                }
                if (changes.stats) {
                    updateStats(changes.stats.newValue);
                }
            }
        });
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Failed to initialize');
    }
}

// Update UI for active session
function updateUIForActiveSession(session) {
    sessionActive = true;
    sessionControls.style.display = 'none';
    verificationInput.style.display = session.isHardMode ? 'block' : 'none';
    if (session.isHardMode) {
        verificationPhrase.textContent = session.verificationPhrase;
    }
    sessionStatus.textContent = 'Active';
    sessionStatus.classList.remove('inactive');

    // Calculate remaining time
    const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
    const remainingSeconds = Math.max(0, session.remainingTime - elapsedSeconds);
    startTimer(remainingSeconds);
}

// Setup event listeners
function setupEventListeners() {
    // Duration buttons
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedDuration = parseInt(btn.dataset.duration);
            durationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            customDurationInput.value = '';
        });
    });

    // Custom duration input
    customDurationInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value > 0) {
            selectedDuration = value;
            durationBtns.forEach(btn => btn.classList.remove('active'));
        }
    });

    // Start button
    startBtn.addEventListener('click', startSession);

    // Stop button
    stopBtn.addEventListener('click', stopSession);

    // Verification text input
    verificationText.addEventListener('input', () => {
        verificationError.textContent = '';
    });

    // Navigation buttons
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    groupsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'groups.html' });
    });
}

// Start session
async function startSession() {
    if (selectedDuration < 1) {
        showError('Please select a valid duration');
        return;
    }

    const isHardMode = hardModeCheckbox.checked;

    try {
        // Get current blocklist and groups
        const { blocklist = [], blockGroups = [] } = await chrome.storage.local.get([
            'blocklist',
            'blockGroups'
        ]);

        // Check if there are any websites to block
        const hasBlocklist = blocklist && blocklist.length > 0;
        const hasActiveGroups = blockGroups && blockGroups.some(
            group => group.active && group.websites && group.websites.length > 0
        );

        if (!hasBlocklist && !hasActiveGroups) {
            showError('No websites configured to block. Please add websites in the settings or activate a group.');
            return;
        }

        // Start session
        const response = await chrome.runtime.sendMessage({
            type: 'START_SESSION',
            duration: selectedDuration,
            isHardMode
        });

        if (response.success) {
            sessionActive = true;
            sessionControls.style.display = 'none';
            if (isHardMode) {
                verificationInput.style.display = 'block';
                verificationPhrase.textContent = response.session.verificationPhrase;
            }
            sessionStatus.textContent = 'Active';
            sessionStatus.classList.remove('inactive');
            startTimer(selectedDuration * 60);
        } else {
            showError(response.error || 'Failed to start session');
        }
    } catch (error) {
        console.error('Session start error:', error);
        showError('Failed to start session. Please try again.');
    }
}

// Stop session
async function stopSession() {
    try {
        const { session } = await chrome.storage.local.get('session');

        if (session.isHardMode) {
            const enteredPhrase = verificationText.value.trim();
            if (enteredPhrase !== session.verificationPhrase) {
                verificationError.textContent = 'Incorrect phrase. Please try again.';
                return;
            }
        }

        const response = await chrome.runtime.sendMessage({
            type: 'STOP_SESSION',
            verificationPhrase: verificationText.value.trim()
        });

        if (response.success) {
            resetUI();
        } else {
            verificationError.textContent = response.error || 'Failed to stop session';
        }
    } catch (error) {
        showError('Failed to stop session');
        console.error(error);
    }
}

// Reset UI
function resetUI() {
    sessionActive = false;
    sessionControls.style.display = 'block';
    verificationInput.style.display = 'none';
    verificationText.value = '';
    verificationError.textContent = '';
    sessionStatus.textContent = 'Inactive';
    sessionStatus.classList.add('inactive');
    clearInterval(timerInterval);
    timer.textContent = '00:00:00';
    hardModeCheckbox.checked = false;
}

// Timer functions
function startTimer(seconds) {
    clearInterval(timerInterval);
    let timeLeft = seconds;
    updateTimerDisplay(timeLeft);

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    timer.textContent = `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(secs)}`;
}

function padNumber(num) {
    return num.toString().padStart(2, '0');
}

// Update stats display
function updateStats(stats) {
    if (!stats) return;

    const hours = Math.floor(stats.focusTimeToday / 60);
    const minutes = stats.focusTimeToday % 60;
    focusTimeElement.textContent = `${hours}h ${minutes}m`;
    blockedCountElement.textContent = stats.blockedCount;
    streakElement.textContent = stats.streak;
}

// Show error message
function showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    document.body.appendChild(error);
    setTimeout(() => error.remove(), 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize); 