#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p icons

# Download icons from icons8.com (free focus icon)
# 16x16
curl -o icons/icon16.png "https://img.icons8.com/material-outlined/16/000000/do-not-disturb-2.png"

# 48x48
curl -o icons/icon48.png "https://img.icons8.com/material-outlined/48/000000/do-not-disturb-2.png"

# 128x128
curl -o icons/icon128.png "https://img.icons8.com/material-outlined/128/000000/do-not-disturb-2.png"

echo "Icons downloaded successfully!" 