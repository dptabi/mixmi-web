#!/bin/bash

# Debug helper script for Mixmi Admin web application
# This script helps troubleshoot common issues

echo "🔍 Mixmi Admin Debug Helper"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check Node.js
echo "1. Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_status "Node.js installed: $NODE_VERSION"
    
    # Check version
    NODE_MAJOR_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
        print_warning "Node.js version should be 16 or higher (current: $NODE_VERSION)"
    fi
else
    print_error "Node.js is not installed"
    exit 1
fi

echo ""

# Check npm
echo "2. Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_status "npm installed: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

echo ""

# Check Firebase CLI
echo "3. Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    print_status "Firebase CLI installed: $FIREBASE_VERSION"
else
    print_warning "Firebase CLI is not installed. Run: npm install -g firebase-tools"
fi

echo ""

# Check admin directory
echo "4. Checking admin directory..."
cd "$(dirname "$0")/../admin"
if [ ! -f "package.json" ]; then
    print_error "admin/package.json not found"
    exit 1
fi
print_status "Found admin directory"

echo ""

# Check dependencies
echo "5. Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Dependencies not installed."
    read -p "Install dependencies now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install
    fi
else
    print_status "Dependencies installed"
fi

echo ""

# Check Firebase configuration
echo "6. Checking Firebase configuration..."
if [ ! -f "src/firebase-config.ts" ]; then
    print_error "Firebase config file not found: src/firebase-config.ts"
    if [ -f "../firebase/firebase-config.template.ts" ]; then
        print_info "Template found. Copy it? (y/n) "
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp ../firebase/firebase-config.template.ts src/firebase-config.ts
            print_warning "Please configure Firebase settings in src/firebase-config.ts"
        fi
    fi
else
    print_status "Firebase config file found"
    
    # Check if config has placeholder values
    if grep -q "your_api_key" src/firebase-config.ts 2>/dev/null; then
        print_warning "Firebase config may contain placeholder values"
    fi
fi

echo ""

# Check for build errors
echo "7. Checking for TypeScript errors..."
if command -v npx &> /dev/null; then
    npx tsc --noEmit 2>&1 | head -20
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_status "No TypeScript errors found"
    else
        print_error "TypeScript compilation errors detected"
    fi
else
    print_warning "Cannot run TypeScript check (npx not available)"
fi

echo ""

# Check port 3000
echo "8. Checking if port 3000 is available..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 3000 is already in use"
    echo "Current process:"
    lsof -Pi :3000 -sTCP:LISTEN
    echo ""
    read -p "Kill process on port 3000? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $(lsof -t -i:3000) 2>/dev/null
        print_status "Process killed"
    fi
else
    print_status "Port 3000 is available"
fi

echo ""

# Summary
echo "============================"
echo "Debug Summary"
echo "============================"
echo ""
echo "For detailed debugging help, see:"
echo "  - docs/DEBUGGING_GUIDE.md"
echo "  - docs/DEBUG_QUICK_REFERENCE.md"
echo ""
echo "Quick start:"
echo "  cd admin && npm start"
echo ""
echo "Next steps:"
echo "  1. Configure Firebase in src/firebase-config.ts"
echo "  2. Run: npm start"
echo "  3. Open: http://localhost:3000"
echo "  4. Open DevTools (F12) to check console"
echo ""
