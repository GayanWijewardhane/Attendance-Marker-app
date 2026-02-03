#!/bin/bash
echo ""
echo "============================================"
echo "  Network Engineer Task Tracker"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Install Node.js:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Fedora/RHEL:   sudo dnf install nodejs npm"
    echo "  Or visit: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[OK] Node.js found: $(node -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[SETUP] Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo ""
echo "[STARTING] Server is starting..."
echo ""
node server.js
