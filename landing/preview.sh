#!/bin/bash

# Local Preview Script for Mixmi Landing Page
# This script starts a local web server to preview the landing page before deploying

echo "🚀 Starting local preview server for Mixmi Landing Page..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Please run this script from the landing directory."
    exit 1
fi

# Check if port 8080 is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8080 is already in use."
    read -p "Do you want to use a different port? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter port number: " PORT
        PORT=${PORT:-8081}
    else
        echo "Stopping existing server on port 8080..."
        pkill -f "python3 -m http.server"
        sleep 1
        PORT=8080
    fi
else
    PORT=8080
fi

# Try Python first, then fall back to other methods
if command -v python3 &> /dev/null; then
    echo -e "${BLUE}Using Python 3...${NC}"
    python3 -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_CMD="python3"
elif command -v python &> /dev/null; then
    echo -e "${BLUE}Using Python...${NC}"
    python -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_CMD="python"
elif command -v node &> /dev/null; then
    echo -e "${BLUE}Using Node.js...${NC}"
    npx serve -s . -l $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_CMD="npx"
else
    echo "❌ Error: No suitable web server found."
    echo "Please install Python or Node.js to preview locally."
    exit 1
fi

sleep 2

# Verify server started
if kill -0 $SERVER_PID 2>/dev/null || [ "$SERVER_CMD" = "npx" ]; then
    echo ""
    echo -e "${GREEN}✅ Preview server started successfully!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  👉 Open in your browser:"
    echo "     http://localhost:$PORT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📝 Press Ctrl+C to stop the server"
    echo ""
    echo "💡 Tip: The page will auto-reload if you edit index.html"
    echo ""
    
    # Wait for Ctrl+C
    trap "echo ''; echo 'Stopping server...'; pkill -f 'http.server'; pkill -f 'serve.*$PORT'; echo 'Server stopped.'; exit 0" INT
    wait $SERVER_PID
else
    echo "❌ Error: Failed to start preview server"
    exit 1
fi

