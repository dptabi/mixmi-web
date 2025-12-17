#!/bin/bash

# Script to grant superadmin access to a user
# Usage: ./scripts/grant-superadmin.sh <email>
# Example: ./scripts/grant-superadmin.sh hey@mixmi.co

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if email is provided
if [ -z "$1" ]; then
    print_error "Email is required"
    echo ""
    echo "Usage: $0 <email>"
    echo "Example: $0 hey@mixmi.co"
    exit 1
fi

EMAIL="$1"

# Navigate to functions directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FUNCTIONS_DIR="$PROJECT_ROOT/functions"

cd "$FUNCTIONS_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    if [ ! -f "node_modules/.bin/ts-node" ]; then
        print_warning "ts-node not found. Installing..."
        npm install --save-dev ts-node
    fi
    TS_NODE="./node_modules/.bin/ts-node"
else
    TS_NODE="ts-node"
fi

# Check if service account file exists
SERVICE_ACCOUNT_FILE="$PROJECT_ROOT/mixmi-66529-firebase-adminsdk-fbsvc-d20953b0b9.json"
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    print_error "Service account file not found: $SERVICE_ACCOUNT_FILE"
    exit 1
fi

print_info "Granting superadmin access to: $EMAIL"
echo ""

# Run the grant_superadmin script (from functions directory)
cd "$FUNCTIONS_DIR"
# Pass absolute path to service account file
"$TS_NODE" scripts/grant_superadmin.ts "$EMAIL" "$SERVICE_ACCOUNT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    print_success "Superadmin access granted successfully!"
    echo ""
    print_warning "IMPORTANT: The user must sign out and sign back in to the admin panel"
    print_warning "for the changes to take effect. Custom claims are set, but the user's"
    print_warning "current session token needs to be refreshed."
    echo ""
    print_info "After signing back in, the user should have access to all admin features."
else
    print_error "Failed to grant superadmin access"
    exit 1
fi

