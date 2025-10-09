# Setup Guide

This document provides comprehensive setup instructions for the Mixmi web application.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase CLI
- Git

## Quick Start

1. Clone the repository
2. Install dependencies
3. Configure Firebase
4. Run the development server

## Detailed Setup

### 1. Environment Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### 2. Admin Application Setup

```bash
cd admin
npm install
npm start
```

### 3. Landing Page Setup

```bash
cd landing
# Landing page is static, no build process required
```

### 4. Firebase Configuration

```bash
# Initialize Firebase (if not already done)
firebase init

# Deploy to Firebase
firebase deploy
```

## Troubleshooting

See the FIXES.md document for common issues and solutions.
