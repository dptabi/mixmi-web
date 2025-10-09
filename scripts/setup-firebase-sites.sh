#!/bin/bash

# Setup script for Firebase multi-site hosting
# This script sets up the Firebase hosting sites for both admin and landing

echo "🚀 Setting up Firebase Multi-Site Hosting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_warning "Not logged in to Firebase. Please log in first:"
    echo "firebase login"
    exit 1
fi

print_status "Firebase CLI is ready"

# Create Firebase hosting sites
echo ""
print_info "Creating Firebase hosting sites..."

# Create admin site
echo "Creating admin site..."
firebase hosting:sites:create admin-mixmi-web-prod

if [ $? -eq 0 ]; then
    print_status "Admin site created: admin-mixmi-web-prod"
else
    print_warning "Admin site may already exist or creation failed"
fi

# Create landing site
echo "Creating landing site..."
firebase hosting:sites:create landing-mixmi-web-prod

if [ $? -eq 0 ]; then
    print_status "Landing site created: landing-mixmi-web-prod"
else
    print_warning "Landing site may already exist or creation failed"
fi

# Create staging sites
echo "Creating staging admin site..."
firebase hosting:sites:create admin-mixmi-web-staging

if [ $? -eq 0 ]; then
    print_status "Staging admin site created: admin-mixmi-web-staging"
else
    print_warning "Staging admin site may already exist or creation failed"
fi

echo "Creating staging landing site..."
firebase hosting:sites:create landing-mixmi-web-staging

if [ $? -eq 0 ]; then
    print_status "Staging landing site created: landing-mixmi-web-staging"
else
    print_warning "Staging landing site may already exist or creation failed"
fi

echo ""
print_info "Next steps:"
echo "1. Configure custom domains in Firebase Console:"
echo "   - Admin: admin.mixmi.co → admin-mixmi-web-prod"
echo "   - Landing: mixmi.co → landing-mixmi-web-prod"
echo ""
echo "2. Update your DNS records:"
echo "   - admin.mixmi.co CNAME admin-mixmi-web-prod.web.app"
echo "   - mixmi.co CNAME landing-mixmi-web-prod.web.app"
echo ""
echo "3. Run deployment: ./scripts/deploy.sh"

print_status "Firebase multi-site setup complete!"
