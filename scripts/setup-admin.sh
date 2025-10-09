#!/bin/bash

# Setup script for admin application
# This script sets up the admin React application with all necessary dependencies

echo "🚀 Setting up Mixmi Admin Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Navigate to admin directory
cd "$(dirname "$0")/../admin"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp ../firebase/firebase-config.template.ts src/firebase-config.ts
    echo "⚠️  Please configure your Firebase settings in src/firebase-config.ts"
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "⚠️  Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

echo "🎉 Admin application setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure Firebase settings in src/firebase-config.ts"
echo "2. Run 'npm start' to start the development server"
echo "3. Run 'firebase deploy' to deploy to production"
