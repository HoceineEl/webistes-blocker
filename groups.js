// Add at the top of groups.js, before the DOM Elements
const STORAGE_KEYS = {
    BLOCKLIST: 'blocklist',
    SESSION: 'session',
    CUSTOM_CONTENT: 'customContent',
    BLOCK_GROUPS: 'blockGroups',
    STATS: 'stats'
};

// DOM Elements
const createGroupBtn = document.getElementById('createGroupBtn');
const addGroupForm = document.getElementById('addGroupForm');
const groupsContainer = document.getElementById('groupsContainer');
const emptyState = document.getElementById('emptyState');
const groupNameInput = document.getElementById('groupName');
const websiteInput = document.getElementById('websiteInput');
const websiteList = document.getElementById('websiteList');
const timeLimitInput = document.getElementById('timeLimit');
const saveGroupBtn = document.getElementById('saveGroupBtn');

// State
let groups = [];
let currentWebsites = [];

// Add predefined groups at the top of groups.js
const PREDEFINED_GROUPS = [
    {
        name: "Social Media",
        websites: [
            "facebook.com",
            "twitter.com",
            "instagram.com",
            "tiktok.com",
            "snapchat.com",
            "linkedin.com",
            "pinterest.com",
            "reddit.com",
            "tumblr.com",
            "whatsapp.com"
        ]
    },
    {
        name: "Video Streaming",
        websites: [
            "youtube.com",
            "netflix.com",
            "twitch.tv",
            "hulu.com",
            "disney.com",
            "vimeo.com",
            "dailymotion.com",
            "hbomax.com",
            "primevideo.com",
            "peacocktv.com"
        ]
    },
    {
        name: "Gaming",
        websites: [
            "steam.com",
            "epicgames.com",
            "roblox.com",
            "minecraft.net",
            "blizzard.com",
            "leagueoflegends.com",
            "ea.com",
            "ubisoft.com",
            "playstation.com",
            "xbox.com"
        ]
    },
    {
        name: "News & Media",
        websites: [
            "cnn.com",
            "bbc.com",
            "nytimes.com",
            "foxnews.com",
            "reuters.com",
            "bloomberg.com",
            "washingtonpost.com",
            "theguardian.com",
            "huffpost.com",
            "buzzfeed.com"
        ]
    },
    {
        name: "Shopping",
        websites: [
            "amazon.com",
            "ebay.com",
            "walmart.com",
            "aliexpress.com",
            "etsy.com",
            "target.com",
            "bestbuy.com",
            "wish.com",
            "shopify.com",
            "wayfair.com"
        ]
    }
];

// Initialize
async function initialize() {
    try {
        await initializePredefinedGroups();

        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.blockGroups) {
                groups = changes.blockGroups.newValue;
                renderGroups();
            }
        });
    } catch (error) {
        console.error('Error initializing groups:', error);
        showError('Failed to load groups');
    }
}

// Render groups
function renderGroups() {
    if (groups.length === 0) {
        groupsContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    groupsContainer.style.display = 'grid';
    emptyState.style.display = 'none';

    groupsContainer.innerHTML = groups.map((group, index) => `
        <div class="group-card ${group.isPredefined ? 'predefined' : ''}" data-group-index="${index}">
            <div class="group-header">
                <h3 class="group-name">
                    ${group.name}
                    ${group.isPredefined ? '<span class="predefined-badge">Predefined</span>' : ''}
                </h3>
                <div class="group-actions">
                    <button class="btn ${group.active ? 'btn-danger' : 'btn-primary'} toggle-group-btn">
                        ${group.active ? '<i class="ri-pause-line"></i> Pause' : '<i class="ri-play-line"></i> Start'}
                    </button>
                    ${!group.isPredefined ? `
                        <button class="btn btn-danger delete-group-btn">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="website-list">
                ${group.websites.map(website => `
                    <div class="website-item">
                        <div class="website-info">
                            <img class="website-icon" src="https://www.google.com/s2/favicons?domain=${website}" alt="${website}">
                            <span class="website-domain">${website}</span>
                        </div>
                        <span class="website-time">${group.timeLimit}m</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Event delegation for group actions
groupsContainer.addEventListener('click', async (e) => {
    const groupCard = e.target.closest('.group-card');
    if (!groupCard) return;

    const index = parseInt(groupCard.dataset.groupIndex);

    if (e.target.closest('.toggle-group-btn')) {
        await toggleGroup(index);
    } else if (e.target.closest('.delete-group-btn')) {
        await deleteGroup(index);
    }
});

// Additional event listeners
document.getElementById('createFirstGroupBtn')?.addEventListener('click', () => {
    document.getElementById('createGroupBtn').click();
});

// Add website to current list
function addWebsite(website) {
    if (!website) return;

    // Basic URL validation
    try {
        // Add protocol if missing
        if (!website.startsWith('http://') && !website.startsWith('https://')) {
            website = 'https://' + website;
        }
        const url = new URL(website);
        const domain = url.hostname.replace('www.', '');

        if (!currentWebsites.includes(domain)) {
            currentWebsites.push(domain);
            renderWebsites();
        }
    } catch (e) {
        showError('Please enter a valid website');
    }
}

// Render current websites
function renderWebsites() {
    websiteList.innerHTML = currentWebsites.map(website => `
        <div class="tag">
            <img src="https://www.google.com/s2/favicons?domain=${website}" alt="${website}" width="16" height="16">
            ${website}
            <i class="ri-close-line" data-website="${website}"></i>
        </div>
    `).join('');

    // Add event listeners for remove buttons
    websiteList.querySelectorAll('.ri-close-line').forEach(button => {
        button.addEventListener('click', () => {
            const website = button.dataset.website;
            removeWebsite(website);
        });
    });
}

// Remove website from current list
function removeWebsite(website) {
    currentWebsites = currentWebsites.filter(w => w !== website);
    renderWebsites();
}

// Save group
async function saveGroup() {
    const name = groupNameInput.value.trim();
    const timeLimit = parseInt(timeLimitInput.value);

    if (!name) {
        showError('Please enter a group name');
        return;
    }

    if (currentWebsites.length === 0) {
        showError('Please add at least one website');
        return;
    }

    if (!timeLimit || timeLimit < 1) {
        showError('Please enter a valid time limit');
        return;
    }

    try {
        const newGroup = {
            name,
            websites: currentWebsites,
            timeLimit,
            active: false,
            created: Date.now()
        };

        groups.push(newGroup);
        await saveGroups();

        // Reset form
        groupNameInput.value = '';
        websiteInput.value = '';
        timeLimitInput.value = '60';
        currentWebsites = [];
        renderWebsites();

        // Hide form
        addGroupForm.style.display = 'none';

        showSuccess('Group created successfully');
    } catch (error) {
        console.error('Error saving group:', error);
        showError('Failed to save group');
    }
}

// Toggle group active state
async function toggleGroup(index) {
    try {
        console.log('Toggling group at index:', index);
        const group = groups[index];
        group.active = !group.active;

        console.log('Group after toggle:', group);

        // Save to storage first
        await saveGroups();

        // Get current session status
        const { session } = await chrome.storage.local.get(STORAGE_KEYS.SESSION);

        // If session is active, update blocking rules immediately
        if (session && session.active) {
            await chrome.runtime.sendMessage({
                type: 'UPDATE_BLOCKLIST',
                blocklist: groups.filter(g => g.active).flatMap(g => g.websites)
            });
        }

        renderGroups();
        showSuccess(group.active ? 'Group activated' : 'Group deactivated');
    } catch (error) {
        console.error('Error toggling group:', error);
        showError('Failed to toggle group');
        // Revert the toggle
        groups[index].active = !groups[index].active;
        renderGroups();
    }
}

// Delete group
async function deleteGroup(index) {
    if (confirm('Are you sure you want to delete this group?')) {
        try {
            const wasActive = groups[index].active;
            groups.splice(index, 1);
            await saveGroups();

            if (wasActive) {
                // Update blocking rules if the deleted group was active
                await chrome.runtime.sendMessage({
                    type: 'UPDATE_BLOCK_GROUPS',
                    websites: groups.filter(g => g.active).flatMap(g => g.websites)
                });
            }

            showSuccess('Group deleted successfully');
        } catch (error) {
            console.error('Error deleting group:', error);
            showError('Failed to delete group');
        }
    }
}

// Save groups to storage
async function saveGroups() {
    try {
        console.log('Saving groups:', groups);
        await chrome.storage.local.set({ blockGroups: groups });

        // Force update of blocking rules if session is active
        const { session } = await chrome.storage.local.get('session');
        if (session && session.active) {
            await chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKLIST' });
        }
    } catch (error) {
        console.error('Error saving groups:', error);
        throw error;
    }
}

// Show error message
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Show success message
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Event Listeners
createGroupBtn.addEventListener('click', () => {
    addGroupForm.style.display = addGroupForm.style.display === 'none' ? 'block' : 'none';
});

websiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addWebsite(e.target.value.trim());
        e.target.value = '';
    }
});

saveGroupBtn.addEventListener('click', saveGroup);

// Add styles for toast notifications
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 1000;
        animation: slideUp 0.3s ease-out;
    }

    .toast.error {
        background-color: var(--danger);
    }

    .toast.success {
        background-color: var(--success);
    }

    @keyframes slideUp {
        from {
            transform: translate(-50%, 100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Add this function to initialize predefined groups
async function initializePredefinedGroups() {
    try {
        const { blockGroups = [] } = await chrome.storage.local.get('blockGroups');

        // Only add predefined groups if no groups exist
        if (blockGroups.length === 0) {
            const predefinedGroups = PREDEFINED_GROUPS.map(group => ({
                name: group.name,
                websites: group.websites,
                timeLimit: 60, // Default 1 hour
                active: false,
                created: Date.now(),
                isPredefined: true
            }));

            groups = predefinedGroups;
            await saveGroups();
            renderGroups();
            showSuccess('Predefined groups loaded');
        } else {
            groups = blockGroups;
            renderGroups();
        }
    } catch (error) {
        console.error('Error initializing predefined groups:', error);
        showError('Failed to load predefined groups');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize); 