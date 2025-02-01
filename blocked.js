// Function to update timer
function updateTimer() {
    chrome.storage.local.get(['session'], function (result) {
        if (result.session && result.session.active) {
            const remainingTime = Math.max(0, result.session.remainingTime);
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);
            const seconds = remainingTime % 60;

            document.getElementById('timer').textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            document.getElementById('timer').textContent = 'Session Ended';
        }
    });
}

// Function to update custom content
function updateCustomContent() {
    chrome.storage.local.get(['customContent'], function (result) {
        if (result.customContent && result.customContent.content) {
            document.getElementById('customContent').textContent = result.customContent.content;
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Update timer and content initially and every second
    updateTimer();
    updateCustomContent();
    setInterval(updateTimer, 1000);

    // Listen for storage changes
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (namespace === 'local') {
            if (changes.session) {
                updateTimer();
            }
            if (changes.customContent) {
                updateCustomContent();
            }
        }
    });
}); 