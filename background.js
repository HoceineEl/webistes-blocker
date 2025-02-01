// Constants
const STORAGE_KEYS = {
    BLOCKLIST: 'blocklist',
    SESSION: 'session',
    CUSTOM_CONTENT: 'customContent',
    BLOCK_GROUPS: 'blockGroups',
    STATS: 'stats'
};

// Hard mode phrases for session stop verification
const VERIFICATION_PHRASES = [
    "I am staying focused and productive",
    "My goals are more important than distractions",
    "Success requires dedication and discipline",
    "I choose productivity over procrastination",
    "Every minute counts towards my success"
];

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
    try {
        // Initialize storage with default values
        const defaultSettings = {
            [STORAGE_KEYS.BLOCKLIST]: [],
            [STORAGE_KEYS.SESSION]: {
                active: false,
                startTime: null,
                remainingTime: 0,
                duration: 0,
                isHardMode: false,
                verificationPhrase: ""
            },
            [STORAGE_KEYS.CUSTOM_CONTENT]: {
                type: 'message',
                content: 'Stay focused on your goals!'
            },
            [STORAGE_KEYS.BLOCK_GROUPS]: [],
            [STORAGE_KEYS.STATS]: {
                focusTimeToday: 0,
                blockedCount: 0,
                streak: 0,
                lastActiveDate: null
            }
        };

        await chrome.storage.local.set(defaultSettings);
        console.log('Extension initialized with default settings');

        // Create initial blocking rules
        await updateBlockingRules(false);
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Convert domain to pattern format if needed
function ensureUrlPattern(url) {
    if (url.startsWith('*://')) {
        return url;
    }
    return `*://*.${url.replace(/^[*./]+/, '')}/*`;
}

// Helper function to convert blocklist entries to declarativeNetRequest rules
function createBlockingRules(blocklist) {
    if (!Array.isArray(blocklist)) {
        console.warn('Blocklist is not an array:', blocklist);
        return [];
    }

    return blocklist.map((entry, index) => {
        try {
            let pattern;
            if (typeof entry === 'string') {
                pattern = ensureUrlPattern(entry);
            } else if (entry && entry.urlPattern) {
                pattern = ensureUrlPattern(entry.urlPattern);
            } else {
                console.warn('Invalid blocklist entry:', entry);
                return null;
            }

            if (!pattern) return null;

            return {
                id: index + 1,
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: {
                        extensionPath: "/blocked.html"
                    }
                },
                condition: {
                    urlFilter: pattern,
                    resourceTypes: ["main_frame"],
                    excludedInitiatorDomains: ["chrome-extension"]
                }
            };
        } catch (error) {
            console.error('Error creating rule for entry:', entry, error);
            return null;
        }
    }).filter(rule => rule !== null);
}

// Helper function to get combined blocklist
async function getCombinedBlocklist() {
    try {
        const { blocklist, blockGroups } = await chrome.storage.local.get([
            STORAGE_KEYS.BLOCKLIST,
            STORAGE_KEYS.BLOCK_GROUPS
        ]);

        // Extract URLs from blocklist objects
        const blocklistUrls = (blocklist || []).map(item =>
            typeof item === 'string' ? item : item.urlPattern
        );

        // Get active group websites
        const activeGroupWebsites = (blockGroups || [])
            .filter(group => group.active)
            .flatMap(group => group.websites)
            .map(url => ensureUrlPattern(url));

        return [...new Set([...blocklistUrls, ...activeGroupWebsites])];
    } catch (error) {
        console.error('Error getting combined blocklist:', error);
        return [];
    }
}

// Update blocking rules
async function updateBlockingRules(isSessionActive) {
    try {
        console.log('Updating blocking rules, session active:', isSessionActive);

        // Remove existing rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(rule => rule.id);

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds
        });

        if (isSessionActive) {
            // Get combined blocklist
            const combinedBlocklist = await getCombinedBlocklist();
            console.log('Combined blocklist:', combinedBlocklist);

            if (combinedBlocklist.length === 0) {
                console.warn('No websites to block');
                return;
            }

            // Create new rules with unique IDs starting from a higher number
            const newRules = combinedBlocklist.map((url, index) => ({
                id: index + 1000, // Start from 1000 to avoid conflicts
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: {
                        extensionPath: "/blocked.html"
                    }
                },
                condition: {
                    urlFilter: ensureUrlPattern(url),
                    resourceTypes: [
                        "main_frame",
                        "sub_frame"
                    ]
                }
            }));

            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingRuleIds,
                addRules: newRules
            });
        }
    } catch (error) {
        console.error('Error updating blocking rules:', error);
        throw error;
    }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);

    const handlers = {
        START_SESSION: () => handleStartSession(message.duration, message.isHardMode),
        STOP_SESSION: () => handleStopSession(message.verificationPhrase),
        UPDATE_BLOCKLIST: () => handleBlocklistUpdate(message.blocklist),
        UPDATE_BLOCK_GROUPS: () => handleBlockGroupsUpdate(message.websites),
        GET_SESSION_STATUS: () => handleGetSessionStatus(),
        GET_VERIFICATION_PHRASE: () => handleGetVerificationPhrase()
    };

    const handler = handlers[message.type];
    if (handler) {
        handler()
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Session management functions
async function handleStartSession(duration, isHardMode) {
    try {
        console.log('Starting session with duration:', duration, 'hard mode:', isHardMode);

        // Get combined blocklist
        const combinedBlocklist = await getCombinedBlocklist();
        console.log('Combined blocklist for session:', combinedBlocklist);

        if (!combinedBlocklist || combinedBlocklist.length === 0) {
            return { success: false, error: 'No websites to block' };
        }

        const verificationPhrase = isHardMode ?
            VERIFICATION_PHRASES[Math.floor(Math.random() * VERIFICATION_PHRASES.length)] :
            "";

        const session = {
            active: true,
            startTime: Date.now(),
            remainingTime: duration * 60,
            duration: duration,
            isHardMode,
            verificationPhrase
        };

        await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: session });
        await updateBlockingRules(true);

        // Create an alarm to end the session
        await chrome.alarms.create('sessionEnd', { delayInMinutes: duration });

        return { success: true, session };
    } catch (error) {
        console.error('Error starting session:', error);
        return { success: false, error: error.message };
    }
}

async function handleStopSession(verificationPhrase) {
    try {
        const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);

        if (session.isHardMode && verificationPhrase !== session.verificationPhrase) {
            return { success: false, error: 'Incorrect verification phrase' };
        }

        const newSession = {
            active: false,
            startTime: null,
            remainingTime: 0,
            duration: 0,
            isHardMode: false,
            verificationPhrase: ""
        };

        await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: newSession });
        await updateBlockingRules(false);
        await chrome.alarms.clear('sessionEnd');

        // Update stats
        await updateStats(false);

        return { success: true };
    } catch (error) {
        console.error('Error stopping session:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetVerificationPhrase() {
    try {
        const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
        return {
            success: true,
            phrase: session.isHardMode ? session.verificationPhrase : null
        };
    } catch (error) {
        console.error('Error getting verification phrase:', error);
        return { success: false, error: error.message };
    }
}

async function handleBlocklistUpdate(newBlocklist) {
    console.log('Updating blocklist:', newBlocklist);
    try {
        const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
        await chrome.storage.local.set({ [STORAGE_KEYS.BLOCKLIST]: newBlocklist });

        if (session.active) {
            await updateBlockingRules(true);
        }
        console.log('Blocklist updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error updating blocklist:', error);
        return { success: false, error: error.message };
    }
}

async function handleBlockGroupsUpdate(websites) {
    console.log('Updating block groups:', websites);
    try {
        const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
        if (session.active) {
            await updateBlockingRules(true);
        }
        console.log('Block groups updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error updating block groups:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetSessionStatus() {
    try {
        const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
        return { success: true, session };
    } catch (error) {
        console.error('Error getting session status:', error);
        return { success: false, error: error.message };
    }
}

// Stats management
async function updateStats(sessionStarted) {
    try {
        const { stats, session } = await chrome.storage.local.get([
            STORAGE_KEYS.STATS,
            STORAGE_KEYS.SESSION
        ]);

        const today = new Date().toDateString();
        const updatedStats = { ...stats };

        if (sessionStarted) {
            updatedStats.lastActiveDate = today;
            if (stats.lastActiveDate !== today) {
                updatedStats.streak++;
                updatedStats.focusTimeToday = 0;
            }
        } else if (session.startTime) {
            const focusTimeInMinutes = Math.floor((Date.now() - session.startTime) / (1000 * 60));
            updatedStats.focusTimeToday += focusTimeInMinutes;
            updatedStats.blockedCount++;
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: updatedStats });
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'sessionEnd') {
        await handleStopSession();
    }
});

// Storage change handler
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
        const relevantChanges = ['session', 'blockGroups', 'blocklist']
            .some(key => changes[key]);

        if (relevantChanges) {
            const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
            await updateBlockingRules(session.active);
        }
    }
}); 