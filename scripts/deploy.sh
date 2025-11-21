#!/bin/bash

# Deployment script for Mixmi web application
# This script builds and deploys both admin and landing page to Firebase multi-site hosting

echo "🚀 Starting Mixmi Multi-Site Deployment..."

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

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    print_error "firebase.json not found. Please run this script from the project root."
    exit 1
fi

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

# Parse command line arguments
ENVIRONMENT="prod"
DEPLOY_TARGET="both"

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --target)
            DEPLOY_TARGET="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--env prod|staging] [--target admin|landing|both]"
            echo ""
            echo "Options:"
            echo "  --env     Deployment environment (prod or staging). Default: prod"
            echo "  --target  Deployment target (admin, landing, or both). Default: both"
            echo "  --help    Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_info "Deployment configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  Target: $DEPLOY_TARGET"

# Set project based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT="mixmi-web-staging"
    print_info "Using staging project: $PROJECT"
else
    PROJECT="mixmi-66529"
    print_info "Using production project: $PROJECT"
fi

# Build admin application if needed
if [ "$DEPLOY_TARGET" = "admin" ] || [ "$DEPLOY_TARGET" = "both" ]; then
    echo ""
    print_info "Building admin application..."
    cd admin

    if [ ! -f "package.json" ]; then
        print_error "Admin package.json not found"
        exit 1
    fi

    npm run build

    if [ $? -ne 0 ]; then
        print_error "Admin build failed"
        exit 1
    fi

    print_status "Admin application built successfully"
    cd ..
fi

# Deploy to Firebase
echo ""
print_info "Deploying to Firebase..."
echo "Project: $PROJECT"
echo "Target: $DEPLOY_TARGET"

# Deploy based on target
if [ "$DEPLOY_TARGET" = "admin" ]; then
    firebase deploy --project $PROJECT --only hosting:mixmi-admin
elif [ "$DEPLOY_TARGET" = "landing" ]; then
    firebase deploy --project $PROJECT --only hosting:mixmi-landing
else
    firebase deploy --project $PROJECT --only hosting
fi

if [ $? -ne 0 ]; then
    print_error "Firebase deployment failed"
    exit 1
fi

print_status "Deployment completed successfully!"

echo ""
echo "🎉 Mixmi web application has been deployed!"
echo ""
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "Staging URLs:"
    echo "  Admin: https://admin-mixmi-web-staging.web.app"
    echo "  Landing: https://landing-mixmi-web-staging.web.app"
else
    echo "Production URLs:"
    echo "  Admin: https://admin.mixmi.co (admin-mixmi-web-prod.web.app)"
    echo "  Landing: https://mixmi.co (landing-mixmi-web-prod.web.app)"
fi
echo ""
echo "You can also check the Firebase console for deployment details."
