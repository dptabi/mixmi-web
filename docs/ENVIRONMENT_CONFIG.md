# Environment Configuration

This document outlines the environment-specific configurations for the Mixmi web application.

## Environment Overview

The application supports three environments:
- **Development**: Local development with hot reloading
- **Staging**: Testing environment with production-like settings
- **Production**: Live environment serving end users

## Environment-Specific Configurations

### Development Environment

**Purpose**: Local development and testing
**URLs**:
- Admin: `http://localhost:3000`
- Landing: `http://localhost:8080`

**Firebase Configuration**:
```javascript
const firebaseConfig = {
  apiKey: "your_development_api_key",
  authDomain: "mixmi-web-dev.firebaseapp.com",
  projectId: "mixmi-web-dev",
  storageBucket: "mixmi-web-dev.appspot.com",
  messagingSenderId: "your_development_sender_id",
  appId: "your_development_app_id"
};
```

**Environment Variables**:
```bash
REACT_APP_ENVIRONMENT=development
REACT_APP_API_URL=http://localhost:5001/mixmi-web-dev/us-central1/api
REACT_APP_DEBUG=true
REACT_APP_LOG_LEVEL=debug
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_HOT_RELOAD=true
REACT_APP_ENABLE_DEV_TOOLS=true
```

**Cache Settings**:
- JavaScript/CSS: 1 hour cache
- Images: 1 hour cache
- HTML: No cache

### Staging Environment

**Purpose**: Pre-production testing and QA
**URLs**:
- Admin: `https://admin-mixmi-web-staging.web.app`
- Landing: `https://landing-mixmi-web-staging.web.app`

**Firebase Configuration**:
```javascript
const firebaseConfig = {
  apiKey: "your_staging_api_key",
  authDomain: "mixmi-web-staging.firebaseapp.com",
  projectId: "mixmi-web-staging",
  storageBucket: "mixmi-web-staging.appspot.com",
  messagingSenderId: "your_staging_sender_id",
  appId: "your_staging_app_id"
};
```

**Environment Variables**:
```bash
REACT_APP_ENVIRONMENT=staging
REACT_APP_API_URL=https://us-central1-mixmi-web-staging.cloudfunctions.net/api
REACT_APP_DEBUG=false
REACT_APP_LOG_LEVEL=info
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_HOT_RELOAD=false
REACT_APP_ENABLE_DEV_TOOLS=false
```

**Cache Settings**:
- JavaScript/CSS: 24 hours cache
- Images: 24 hours cache
- HTML: No cache

### Production Environment

**Purpose**: Live application serving users
**URLs**:
- Admin: `https://admin.mixmi.co`
- Landing: `https://mixmi.co`

**Firebase Configuration**:
```javascript
const firebaseConfig = {
  apiKey: "your_production_api_key",
  authDomain: "mixmi-web-prod.firebaseapp.com",
  projectId: "mixmi-web-prod",
  storageBucket: "mixmi-web-prod.appspot.com",
  messagingSenderId: "your_production_sender_id",
  appId: "your_production_app_id"
};
```

**Environment Variables**:
```bash
REACT_APP_ENVIRONMENT=production
REACT_APP_API_URL=https://us-central1-mixmi-web-prod.cloudfunctions.net/api
REACT_APP_DEBUG=false
REACT_APP_LOG_LEVEL=error
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_HOT_RELOAD=false
REACT_APP_ENABLE_DEV_TOOLS=false
```

**Cache Settings**:
- JavaScript/CSS: 1 year cache
- Images: 1 year cache
- HTML: No cache

## Firebase Project Configuration

### Project Structure

**Development Project** (`mixmi-web-dev`):
- Separate Firestore database
- Development storage bucket
- Test users and data
- Debug logging enabled

**Staging Project** (`mixmi-web-staging`):
- Staging Firestore database
- Staging storage bucket
- Production-like data
- Limited logging

**Production Project** (`mixmi-web-prod`):
- Production Firestore database
- Production storage bucket
- Live user data
- Error logging only

### Security Rules

**Development**:
- Relaxed rules for testing
- Debug mode enabled
- Full access for development

**Staging**:
- Production-like security rules
- Limited access for testing
- Audit logging enabled

**Production**:
- Strict security rules
- Role-based access control
- Comprehensive audit logging

## Environment Setup

### 1. Development Setup

```bash
# Clone repository
git clone <repository-url>
cd mixmi-web

# Install dependencies
cd admin
npm install

# Create environment file
cp .env.template .env.local
# Edit .env.local with development values

# Start development server
npm start
```

### 2. Staging Setup

```bash
# Deploy to staging
./scripts/deploy.sh --env staging

# Verify deployment
curl -I https://admin-mixmi-web-staging.web.app
curl -I https://landing-mixmi-web-staging.web.app
```

### 3. Production Setup

```bash
# Deploy to production
./scripts/deploy.sh --env prod

# Verify deployment
curl -I https://admin.mixmi.co
curl -I https://mixmi.co
```

## Configuration Management

### Environment Variables

**Local Development**:
- Create `.env.local` in admin directory
- Use development Firebase project credentials
- Enable debug features

**Staging Deployment**:
- Set environment variables in Firebase Console
- Use staging Firebase project credentials
- Enable analytics for testing

**Production Deployment**:
- Set environment variables in Firebase Console
- Use production Firebase project credentials
- Enable full monitoring and analytics

### Firebase Configuration Files

**Development**: `firebase/config.dev.json`
**Staging**: `firebase/config.staging.json`
**Production**: `firebase/config.prod.json`

### Deployment Commands

```bash
# Deploy with specific configuration
firebase deploy --config firebase/config.staging.json --project mixmi-web-staging

# Deploy to production
firebase deploy --config firebase/config.prod.json --project mixmi-web-prod
```

## Monitoring and Logging

### Development Monitoring
- Console logging enabled
- Debug information visible
- Hot reload notifications
- Development tools accessible

### Staging Monitoring
- Limited logging to console
- Error tracking enabled
- Performance monitoring active
- Analytics data collection

### Production Monitoring
- Error logging only
- Comprehensive error tracking
- Performance monitoring
- User analytics collection
- Uptime monitoring

## Security Considerations

### Development Security
- Relaxed authentication rules
- Debug endpoints enabled
- Local storage for testing
- Development-only features

### Staging Security
- Production-like authentication
- Limited debug access
- Secure storage configuration
- Testing-only features

### Production Security
- Strict authentication rules
- No debug endpoints
- Encrypted storage
- Security headers enabled
- HTTPS enforcement

## Best Practices

### Environment Isolation
- Separate Firebase projects for each environment
- Isolated databases and storage
- Environment-specific configurations
- No cross-environment data sharing

### Configuration Management
- Use environment variables for configuration
- Keep secrets out of version control
- Use Firebase Console for production secrets
- Document all configuration changes

### Deployment Strategy
- Deploy to staging first
- Test thoroughly in staging
- Use blue-green deployment for production
- Maintain rollback procedures

### Monitoring and Alerting
- Set up environment-specific monitoring
- Configure appropriate alerting thresholds
- Monitor error rates and performance
- Track user experience metrics
