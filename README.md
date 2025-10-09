# Mixmi Web Application

A comprehensive web application consisting of an admin dashboard and a public landing page, built with React, TypeScript, and Firebase.

## Project Overview

Mixmi Web is a full-stack application that provides:

- **Admin Dashboard**: A React-based administrative interface for managing orders, users, and analytics
- **Landing Page**: A static, SEO-optimized landing page for public access
- **Multi-environment Support**: Development, staging, and production environments
- **Firebase Integration**: Authentication, Firestore database, and hosting

## Quick Start Guide

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mixmi-web
   ```

2. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. **Set up the admin application**
   ```bash
   cd admin
   npm install
   npm start
   ```
   The admin dashboard will be available at `http://localhost:3000`

4. **Set up Firebase hosting sites**
   ```bash
   ./scripts/setup-firebase-sites.sh
   ```

5. **Deploy to staging**
   ```bash
   ./scripts/deploy.sh --env staging
   ```

## Repository Structure

```
mixmi-web/
├── admin/                    # React admin dashboard
│   ├── src/                 # Source code
│   │   ├── pages/          # Page components (Dashboard, Orders, Login)
│   │   ├── hooks/          # Custom React hooks
│   │   └── firebase.ts     # Firebase configuration
│   ├── public/             # Static assets
│   ├── build/              # Production build output
│   └── package.json        # Dependencies and scripts
├── landing/                 # Static landing page
│   ├── index.html          # Main landing page
│   └── firebase.json       # Firebase hosting config
├── firebase/                # Firebase configuration
│   ├── firestore.rules     # Firestore security rules
│   └── storage.rules       # Firebase Storage rules
├── docs/                    # Documentation
│   ├── FEATURES.md         # Feature documentation
│   ├── SETUP.md            # Detailed setup guide
│   ├── DOMAIN_SETUP.md     # Domain configuration
│   ├── SECURITY.md         # Security documentation
│   ├── ANALYTICS.md        # Analytics setup
│   └── FIXES.md            # Troubleshooting guide
├── scripts/                 # Deployment and setup scripts
│   ├── deploy.sh           # Deployment script
│   ├── setup-admin.sh      # Admin setup script
│   └── setup-firebase-sites.sh # Firebase sites setup
└── firebase.json           # Root Firebase configuration
```

## Key Features

### Admin Dashboard
- **Authentication**: Google OAuth integration with role-based access
- **Order Management**: View, update, and manage orders with real-time updates
- **User Management**: User profiles and permission management
- **Analytics**: Dashboard metrics and performance monitoring
- **Responsive Design**: Mobile-friendly interface using Ant Design

### Landing Page
- **Static Content**: Fast-loading static HTML with SEO optimization
- **Contact Features**: Contact forms and call-to-action buttons
- **Performance**: Optimized for speed and search engine visibility

### Technical Features
- **Real-time Updates**: Live order status and notifications
- **Data Management**: Firestore integration with secure rules
- **Security**: Authentication, authorization, and data encryption
- **Performance**: Code splitting, lazy loading, and caching strategies

## Documentation

For detailed information, see the following documentation files:

- **[Setup Guide](docs/SETUP.md)** - Comprehensive setup instructions
- **[Features](docs/FEATURES.md)** - Complete feature documentation
- **[Domain Setup](docs/DOMAIN_SETUP.md)** - Custom domain configuration
- **[Security](docs/SECURITY.md)** - Security implementation details
- **[Analytics](docs/ANALYTICS.md)** - Analytics and monitoring setup
- **[Troubleshooting](docs/FIXES.md)** - Common issues and solutions

## Environment URLs

### Development
- Admin Dashboard: `http://localhost:3000`
- Landing Page: `http://localhost:8080`

### Staging
- Admin Dashboard: `https://admin-mixmi-web-staging.web.app`
- Landing Page: `https://landing-mixmi-web-staging.web.app`

### Production
- Admin Dashboard: `https://admin.mixmi.co`
- Landing Page: `https://mixmi.co`

## Subdomain Configuration

The application uses a multi-site Firebase hosting setup with custom domains:

### Domain Structure
- **Main Domain**: `mixmi.co` (landing page)
- **Admin Subdomain**: `admin.mixmi.co` (admin dashboard)

### DNS Configuration
```
# For main domain (mixmi.co)
Type: CNAME
Name: @
Value: landing-mixmi-web-prod.web.app

Type: CNAME  
Name: www
Value: landing-mixmi-web-prod.web.app

# For admin subdomain (admin.mixmi.co)
Type: CNAME
Name: admin
Value: admin-mixmi-web-prod.web.app
```

### Firebase Sites
- **Admin Production**: `admin-mixmi-web-prod`
- **Landing Production**: `landing-mixmi-web-prod`
- **Admin Staging**: `admin-mixmi-web-staging`
- **Landing Staging**: `landing-mixmi-web-staging`

For detailed subdomain setup instructions, see [docs/DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md).

## Deployment

Deploy to different environments using the deployment script:

```bash
# Deploy to staging
./scripts/deploy.sh --env staging

# Deploy to production
./scripts/deploy.sh --env prod

# Deploy only admin to production
./scripts/deploy.sh --env prod --target admin

# Deploy only landing to production
./scripts/deploy.sh --env prod --target landing
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For questions or support, please refer to the documentation in the `docs/` directory or contact the development team.

## License

This project is proprietary software. All rights reserved.
