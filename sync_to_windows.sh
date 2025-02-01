#!/bin/bash

# Windows user directory (change 'Lenovo' to your Windows username if different)
WINDOWS_USER="Lenovo"
DEST_DIR="/mnt/c/Users/$WINDOWS_USER/Desktop/FocusBlocker"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy all extension files
cp -r ./* "$DEST_DIR/"

# Remove any temporary or system files that shouldn't be copied
rm -f "$DEST_DIR/sync_to_windows.sh"
rm -rf "$DEST_DIR/.git" 2>/dev/null
rm -rf "$DEST_DIR/.cursor" 2>/dev/null

echo "Extension files have been synced to: $DEST_DIR"
echo "You can now load this directory in Chrome's extension page (chrome://extensions/)" 