// DOM Elements
const blocklistContainer = document.getElementById('blocklist');
const addBtn = document.getElementById('addBtn');
const quickAddBtn = document.getElementById('quickAddBtn');
const saveBtn = document.getElementById('saveBtn');
const newPatternInput = document.getElementById('newPattern');
const newTimeLimitInput = document.getElementById('newTimeLimit');
const popularWebsitesSelect = document.getElementById('popularWebsites');
const statusMessage = document.getElementById('statusMessage');
const urlFormatRadios = document.getElementsByName('urlFormat');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const contentTypeButtons = document.querySelectorAll('.content-type-btn');
const contentInputs = {
    message: document.getElementById('message-input'),
    image: document.getElementById('image-input'),
    video: document.getElementById('video-input')
};
const contentPreview = document.getElementById('contentPreview');

// State
let blocklist = [];
let customContent = {
    type: 'message',
    content: ''
};

// Initialize options page
async function initializeOptions() {
    const data = await chrome.storage.local.get(['blocklist', 'customContent']);
    blocklist = data.blocklist || [];
    customContent = data.customContent || { type: 'message', content: '' };

    // Add default websites if blocklist is empty
    if (blocklist.length === 0) {
        blocklist = [
            { urlPattern: '*://*.facebook.com/*', timeLimit: 60 },
            { urlPattern: '*://*.youtube.com/*', timeLimit: 60 },
            { urlPattern: '*://*.twitter.com/*', timeLimit: 60 },
            { urlPattern: '*://*.instagram.com/*', timeLimit: 60 }
        ];
        // Save the default blocklist
        await chrome.storage.local.set({ blocklist });
    }

    renderBlocklist();
    initializeCustomContent();
}

// Initialize custom content
function initializeCustomContent() {
    // Set active content type button
    contentTypeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === customContent.type);
    });

    // Show appropriate input
    Object.keys(contentInputs).forEach(type => {
        contentInputs[type].style.display = type === customContent.type ? 'block' : 'none';
    });

    // Set content value
    switch (customContent.type) {
        case 'message':
            document.getElementById('customMessage').value = customContent.content;
            contentPreview.innerHTML = `<div class="quote">${customContent.content}</div>`;
            break;
        case 'image':
            document.getElementById('imageUrl').value = customContent.content;
            contentPreview.innerHTML = `<img src="${customContent.content}" alt="Preview">`;
            break;
        case 'video':
            document.getElementById('videoUrl').value = customContent.content;
            contentPreview.innerHTML = `<video controls><source src="${customContent.content}" type="video/mp4"></video>`;
            break;
    }
}

// Convert domain to pattern format
function domainToPattern(domain) {
    return `*://*.${domain}/*`;
}

// Validate URL format
function isValidUrl(url, isPattern = false) {
    if (isPattern) {
        // Validate pattern format (*://*.domain.com/*)
        const patternRegex = /^\*:\/\/(\*\.)?\w+(\.\w+)+\/\*$/;
        return patternRegex.test(url);
    } else {
        // Validate domain format (domain.com)
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;
        return domainRegex.test(url);
    }
}

// Get selected URL format
function getSelectedUrlFormat() {
    return Array.from(urlFormatRadios).find(radio => radio.checked).value;
}

// Format URL based on selected format
function formatUrl(url) {
    const format = getSelectedUrlFormat();
    return format === 'pattern' ? domainToPattern(url) : url;
}

// Render blocklist items
function renderBlocklist() {
    blocklistContainer.innerHTML = '';

    blocklist.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'blocklist-item';
        itemElement.innerHTML = `
            <input type="text" value="${item.urlPattern}" 
                   data-index="${index}" class="pattern-input" />
            <input type="number" value="${item.timeLimit}" min="1"
                   data-index="${index}" class="time-limit-input" />
            <button class="remove-btn" data-index="${index}">Remove</button>
        `;

        // Add event listeners for input changes
        const inputs = itemElement.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (input.type === 'text') {
                    blocklist[index].urlPattern = input.value;
                } else {
                    blocklist[index].timeLimit = parseInt(input.value);
                }
            });
        });

        // Add event listener for remove button
        const removeBtn = itemElement.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            blocklist.splice(index, 1);
            renderBlocklist();
        });

        blocklistContainer.appendChild(itemElement);
    });
}

// Show status message
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;

    setTimeout(() => {
        statusMessage.className = 'status-message';
    }, 3000);
}

// Add website to blocklist
function addWebsite(url, timeLimit) {
    if (!url || !timeLimit) {
        showStatus('Please fill in both fields', true);
        return false;
    }

    // Convert to domain format if needed
    let cleanUrl = url;
    try {
        if (!url.startsWith('http')) {
            cleanUrl = `https://${url}`;
        }
        const parsed = new URL(cleanUrl);
        cleanUrl = parsed.hostname.replace('www.', '');
    } catch {
        showStatus('Invalid URL format', true);
        return false;
    }

    const urlPattern = getSelectedUrlFormat() === 'pattern'
        ? `*://*.${cleanUrl}/*`
        : cleanUrl;

    blocklist.push({
        urlPattern: urlPattern,
        timeLimit: timeLimit
    });

    return true;
}

// Handle custom content changes
function handleCustomContentChange(type, content) {
    customContent = { type, content };

    // Update preview
    switch (type) {
        case 'message':
            contentPreview.innerHTML = `<div class="quote">${content}</div>`;
            break;
        case 'image':
            contentPreview.innerHTML = `<img src="${content}" alt="Preview">`;
            break;
        case 'video':
            contentPreview.innerHTML = `<video controls><source src="${content}" type="video/mp4"></video>`;
            break;
    }
}

// Event Listeners
quickAddBtn.addEventListener('click', () => {
    const selectedWebsite = popularWebsitesSelect.value;
    if (!selectedWebsite) {
        showStatus('Please select a website', true);
        return;
    }

    const timeLimit = 60; // Default 1 hour for quick add
    if (addWebsite(selectedWebsite, timeLimit)) {
        popularWebsitesSelect.value = ''; // Reset selection
        renderBlocklist();
        showStatus('Website added successfully');
    }
});

addBtn.addEventListener('click', () => {
    const pattern = newPatternInput.value.trim();
    const timeLimit = parseInt(newTimeLimitInput.value);

    if (addWebsite(pattern, timeLimit)) {
        newPatternInput.value = '';
        newTimeLimitInput.value = '';
        renderBlocklist();
        showStatus('Website added successfully');
    }
});

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(content => {
            content.style.display = content.id === `${tab.dataset.tab}-tab` ? 'block' : 'none';
        });
    });
});

// Content type switching
contentTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        contentTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.type;
        Object.keys(contentInputs).forEach(key => {
            contentInputs[key].style.display = key === type ? 'block' : 'none';
        });

        customContent.type = type;
    });
});

// Handle file upload
const imageFileInput = document.getElementById('imageFile');
if (imageFileInput) {
    imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                handleCustomContentChange('image', dataUrl);
                document.getElementById('imageUrl').value = '';
            };
            reader.readAsDataURL(file);
        }
    });
}

// Handle content input changes
const customMessageInput = document.getElementById('customMessage');
const imageUrlInput = document.getElementById('imageUrl');
const videoUrlInput = document.getElementById('videoUrl');

if (customMessageInput) {
    customMessageInput.addEventListener('input', (e) => {
        handleCustomContentChange('message', e.target.value);
    });
}

if (imageUrlInput) {
    imageUrlInput.addEventListener('input', (e) => {
        handleCustomContentChange('image', e.target.value);
    });
}

if (videoUrlInput) {
    videoUrlInput.addEventListener('input', (e) => {
        handleCustomContentChange('video', e.target.value);
    });
}

saveBtn.addEventListener('click', async () => {
    try {
        console.log('Saving blocklist:', blocklist);

        // Ensure blocklist is an array
        if (!Array.isArray(blocklist)) {
            blocklist = [];
        }

        // Validate each entry in the blocklist
        blocklist = blocklist.filter(item => {
            if (!item || !item.urlPattern) {
                console.warn('Invalid blocklist item:', item);
                return false;
            }
            return true;
        });

        console.log('Filtered blocklist:', blocklist);

        await chrome.storage.local.set({
            blocklist,
            customContent
        });

        // Notify background script to update rules
        const response = await chrome.runtime.sendMessage({
            type: 'UPDATE_BLOCKLIST',
            blocklist: blocklist
        });

        console.log('Background script response:', response);

        if (response && response.success) {
            showStatus('Settings saved successfully');
        } else {
            throw new Error('Failed to update blocking rules');
        }
    } catch (error) {
        showStatus('Error saving settings', true);
        console.error('Error saving settings:', error);
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', initializeOptions); 