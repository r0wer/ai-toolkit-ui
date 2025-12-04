#!/bin/bash

set -euo pipefail

# Define paths
WORKSPACE="/workspace"
REPO_URL="https://github.com/r0wer/ai-toolkit-ui.git"
REPO_DIR="$WORKSPACE/ai-toolkit-ui"

# Ensure workspace exists
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

# Clone or update the repository
if [ ! -d "$REPO_DIR" ]; then
    echo "Cloning repository from $REPO_URL..."
    git clone "$REPO_URL"
else
    echo "Updating repository..."
    cd "$REPO_DIR"
    git pull
    cd "$WORKSPACE"
fi

# Execute the repository's internal startup script
if [ -f "$REPO_DIR/vast_startup.sh" ]; then
    echo "Running vast_startup.sh..."
    chmod +x "$REPO_DIR/vast_startup.sh"
    "$REPO_DIR/vast_startup.sh"
else
    echo "Error: vast_startup.sh not found in $REPO_DIR"
    exit 1
fi
