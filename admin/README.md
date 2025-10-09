# Mixmi Admin Dashboard

A React-based administrative dashboard for managing orders, users, and analytics in the Mixmi web application.

## Overview

The admin dashboard is built with:
- **React 19** with TypeScript
- **Ant Design** for UI components
- **Firebase** for authentication and data management
- **React Router** for navigation
- **Date-fns** for date handling

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project setup

### Installation

1. **Install dependencies**
   ```bash
   cd admin
   npm install
   ```

2. **Configure Firebase**
   - Copy `../firebase/firebase-config.template.ts` to `src/firebase-config.ts`
   - Update with your Firebase project configuration

3. **Start development server**
   ```bash
   npm start
   ```
   The application will open at `http://localhost:3000`

### Setup Script

Use the automated setup script for quick configuration:

```bash
./scripts/setup-admin.sh
```

This script will:
- Install dependencies
- Set up Firebase configuration
- Configure environment variables
- Initialize the admin dashboard

## Available Scripts

### `npm start`
Runs the app in development mode at `http://localhost:3000`

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder with optimizations

### `npm run eject`
**Note: This is a one-way operation and not recommended**

## Features

### Authentication
- Google OAuth integration
- Role-based access control
- Session management
- Secure authentication flow

### Dashboard
- Overview metrics and KPIs
- Real-time data updates
- Interactive charts and graphs
- Performance monitoring

### Order Management
- View all orders with filtering
- Order status updates
- Order details and history
- Bulk operations
- Search functionality

### User Management
- User profiles and permissions
- Activity tracking
- Role management
- User analytics

## Project Structure

```
admin/
├── src/
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Orders.tsx      # Order management
│   │   └── Login.tsx       # Authentication
│   ├── hooks/              # Custom React hooks
│   │   └── useAuth.ts      # Authentication hook
│   ├── firebase.ts         # Firebase configuration
│   └── App.tsx             # Main application component
├── public/                 # Static assets
├── build/                  # Production build
└── package.json           # Dependencies
```

## Configuration

### Environment Variables

Create a `.env` file in the admin directory:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup

1. Create a Firebase project
2. Enable Authentication with Google provider
3. Create Firestore database
4. Configure security rules
5. Set up Firebase Storage

## Deployment

### Development
```bash
npm start
```

### Production
```bash
npm run build
# Deploy using Firebase CLI
firebase deploy --only hosting:admin-mixmi-web-prod
```

### Using Deployment Script
```bash
# From project root
./scripts/deploy.sh --env prod --target admin
```

## Authentication Setup

1. **Enable Google Authentication**
   - Go to Firebase Console
   - Navigate to Authentication > Sign-in method
   - Enable Google provider
   - Add authorized domains

2. **Configure OAuth**
   - Add `http://localhost:3000` for development
   - Add production domains for deployment

## Troubleshooting

### Common Issues

1. **Firebase configuration errors**
   - Verify environment variables
   - Check Firebase project settings
   - Ensure correct API keys

2. **Authentication issues**
   - Verify OAuth configuration
   - Check authorized domains
   - Review Firebase Auth rules

3. **Build failures**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify all dependencies

### Getting Help

- Check the main [README.md](../README.md) for general setup
- Review [docs/FIXES.md](../docs/FIXES.md) for troubleshooting
- See [docs/SETUP.md](../docs/SETUP.md) for detailed configuration

## Learn More

- [React Documentation](https://reactjs.org/)
- [Ant Design Components](https://ant.design/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
