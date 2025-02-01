# FocusBlocker Chrome Extension

A Chrome extension that helps you stay focused by blocking distracting websites and enforcing customizable time limits.

## Features

- Block distracting websites with custom URL patterns
- Set time limits for each blocked website
- Start/stop blocking sessions with customizable durations
- Clean and intuitive user interface
- Persistent settings storage
- Real-time countdown timer

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

### Adding Blocked Websites

1. Click the extension icon and select "Configure blocked sites"
2. Enter a URL pattern (e.g., `*://*.facebook.com/*`)
3. Set a time limit in minutes
4. Click "Add Website"
5. Click "Save Changes"

### URL Pattern Examples

- `*://*.facebook.com/*` - Blocks all Facebook domains
- `*://*.youtube.com/*` - Blocks all YouTube domains
- `*://reddit.com/*` - Blocks Reddit main site

### Starting a Blocking Session

1. Click the extension icon
2. Select a session duration
3. Click "Start Session"
4. The timer will count down, and blocked sites will be inaccessible

### Stopping a Session

- Click the extension icon
- Click "Stop Session"

## Development

The extension is built using:
- Chrome Extension Manifest V3
- HTML/CSS for the user interface
- JavaScript for functionality
- Chrome Storage API for persistence
- Chrome DeclarativeNetRequest API for blocking

## Files Structure

```
├── manifest.json           # Extension configuration
├── background.js          # Background service worker
├── popup.html            # Quick controls UI
├── popup.js             # Popup functionality
├── options.html         # Settings page UI
├── options.js          # Settings functionality
├── icons/              # Extension icons
│   ├── icon16.png    # 16x16 icon
│   ├── icon48.png    # 48x48 icon
│   └── icon128.png   # 128x128 icon
└── README.md          # Documentation
```

## Permissions

The extension requires the following permissions:
- `declarativeNetRequest`: For blocking websites
- `storage`: For saving settings
- `alarms`: For managing session timers
- `scripting`: For content script injection
- `activeTab`: For accessing the current tab

## Contributing

Feel free to submit issues and enhancement requests! 