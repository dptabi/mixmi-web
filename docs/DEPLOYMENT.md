# Deployment Guide

This document provides comprehensive deployment workflows and configurations for the Mixmi web application.

## Overview

The Mixmi web application uses Firebase Hosting with multi-site configuration to deploy:
- **Admin Dashboard**: React application with Firebase backend
- **Landing Page**: Static HTML page with optimized assets

## Deployment Workflow

### 1. Pre-Deployment Checklist

**Environment Verification**
- [ ] Firebase CLI is installed and authenticated
- [ ] Project environment variables are configured
- [ ] All tests pass locally
- [ ] Code is committed to version control
- [ ] Database migrations are completed (if any)

**Build Verification**
- [ ] Admin application builds without errors
- [ ] Landing page assets are optimized
- [ ] No TypeScript errors in admin build
- [ ] All dependencies are installed

### 2. Deployment Process

#### Manual Deployment

**Deploy to Staging:**
```bash
# Deploy both admin and landing to staging
./scripts/deploy.sh --env staging

# Deploy only admin to staging
./scripts/deploy.sh --env staging --target admin

# Deploy only landing to staging
./scripts/deploy.sh --env staging --target landing
```

**Deploy to Production:**
```bash
# Deploy both admin and landing to production
./scripts/deploy.sh --env prod

# Deploy only admin to production
./scripts/deploy.sh --env prod --target admin

# Deploy only landing to production
./scripts/deploy.sh --env prod --target landing
```

#### Direct Firebase Deployment

**Using Firebase CLI directly:**
```bash
# Deploy specific hosting site
firebase deploy --only hosting:admin-mixmi-web-prod

# Deploy all hosting sites
firebase deploy --only hosting

# Deploy with specific project
firebase deploy --project mixmi-web-prod --only hosting
```

### 3. Environment-Specific Configurations

#### Development Environment
- **Admin**: `http://localhost:3000`
- **Landing**: `http://localhost:8080`
- **Firebase Project**: Local development project
- **Database**: Development Firestore instance

#### Staging Environment
- **Admin**: `https://admin-mixmi-web-staging.web.app`
- **Landing**: `https://landing-mixmi-web-staging.web.app`
- **Firebase Project**: `mixmi-web-staging`
- **Database**: Staging Firestore instance
- **Purpose**: Testing and QA validation

#### Production Environment
- **Admin**: `https://admin.mixmi.co`
- **Landing**: `https://mixmi.co`
- **Firebase Project**: `mixmi-web-prod`
- **Database**: Production Firestore instance
- **Purpose**: Live application serving users

### 4. Build Process

#### Admin Application Build
```bash
cd admin
npm install
npm run build
```

**Build Output:**
- Optimized JavaScript bundles
- Minified CSS files
- Static assets with cache headers
- Source maps for debugging

#### Landing Page Preparation
```bash
cd landing
# Landing page is static, no build process required
# Assets are optimized and ready for deployment
```

### 5. Firebase Hosting Configuration

#### Multi-Site Setup
The application uses Firebase Hosting with multiple sites:

**Site IDs:**
- `admin-mixmi-web-prod` → Production admin dashboard
- `landing-mixmi-web-prod` → Production landing page
- `admin-mixmi-web-staging` → Staging admin dashboard
- `landing-mixmi-web-staging` → Staging landing page

#### Custom Domain Mapping
- `admin.mixmi.co` → `admin-mixmi-web-prod.web.app`
- `mixmi.co` → `landing-mixmi-web-prod.web.app`
- `www.mixmi.co` → `landing-mixmi-web-prod.web.app`

### 6. Security Headers

#### Admin Dashboard Headers
```json
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

#### Landing Page Headers
```json
{
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

### 7. Cache Configuration

#### Static Assets
- **JavaScript/CSS**: 1 year cache
- **Images**: 1 year cache
- **HTML**: No cache (always fresh)

#### Cache Headers
```json
{
  "Cache-Control": "max-age=31536000"
}
```

## CI/CD Setup Suggestions

### 1. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: admin/package-lock.json
      
      - name: Install dependencies
        run: |
          cd admin
          npm ci
      
      - name: Build admin application
        run: |
          cd admin
          npm run build
      
      - name: Deploy to Firebase Staging
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: staging
          projectId: mixmi-web-staging
          target: admin-mixmi-web-staging,landing-mixmi-web-staging

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: admin/package-lock.json
      
      - name: Install dependencies
        run: |
          cd admin
          npm ci
      
      - name: Build admin application
        run: |
          cd admin
          npm run build
      
      - name: Deploy to Firebase Production
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: mixmi-web-prod
          target: admin-mixmi-web-prod,landing-mixmi-web-prod
```

### 2. Environment Variables

**GitHub Secrets:**
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON
- `FIREBASE_TOKEN`: Firebase CLI token (alternative to service account)

**Firebase Environment Variables:**
```bash
# Set in Firebase Console or via CLI
firebase functions:config:set app.environment="production"
firebase functions:config:set app.admin_url="https://admin.mixmi.co"
firebase functions:config:set app.landing_url="https://mixmi.co"
```

### 3. Automated Testing

**Pre-deployment Tests:**
```yaml
- name: Run tests
  run: |
    cd admin
    npm test -- --coverage --watchAll=false

- name: Run linting
  run: |
    cd admin
    npm run lint

- name: Type check
  run: |
    cd admin
    npx tsc --noEmit
```

### 4. Deployment Notifications

**Slack Integration:**
```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Deployment Checklist

### Pre-Deployment
- [ ] **Code Review**: All changes reviewed and approved
- [ ] **Testing**: All tests pass locally and in CI
- [ ] **Environment Variables**: Production environment variables configured
- [ ] **Database**: Any required migrations completed
- [ ] **Dependencies**: All dependencies updated and tested
- [ ] **Security**: Security scan completed
- [ ] **Performance**: Performance tests passed
- [ ] **Documentation**: Documentation updated if needed

### Deployment Process
- [ ] **Backup**: Current production backup created
- [ ] **Staging Deploy**: Deploy to staging environment first
- [ ] **Staging Test**: Full testing on staging environment
- [ ] **Production Deploy**: Deploy to production environment
- [ ] **Health Check**: Verify all services are running
- [ ] **Monitoring**: Monitor error rates and performance

### Post-Deployment
- [ ] **Smoke Tests**: Basic functionality tests
- [ ] **Performance**: Check page load times
- [ ] **Error Monitoring**: Monitor for errors in logs
- [ ] **User Feedback**: Monitor user feedback channels
- [ ] **Rollback Plan**: Verify rollback procedures if needed
- [ ] **Documentation**: Update deployment logs

### Emergency Procedures
- [ ] **Rollback**: Know how to quickly rollback if issues arise
- [ ] **Communication**: Have communication plan for stakeholders
- [ ] **Monitoring**: Set up alerts for critical issues
- [ ] **Support**: Ensure support team is available

## Troubleshooting

### Common Deployment Issues

**Build Failures:**
```bash
# Clear cache and reinstall
rm -rf admin/node_modules admin/package-lock.json
cd admin && npm install
```

**Firebase Authentication Issues:**
```bash
# Re-authenticate
firebase logout
firebase login
```

**Deployment Timeout:**
```bash
# Check Firebase status
firebase hosting:channel:list
firebase hosting:channel:open live
```

**Custom Domain Issues:**
- Verify DNS records are correct
- Check SSL certificate status in Firebase Console
- Ensure domain verification is complete

### Monitoring and Alerts

**Firebase Console Monitoring:**
- Hosting analytics
- Error logs
- Performance metrics
- Custom domain status

**External Monitoring:**
- Uptime monitoring services
- Performance monitoring tools
- Error tracking services
- User analytics

## Best Practices

### Security
- Use environment-specific Firebase projects
- Implement proper access controls
- Regular security audits
- Monitor for vulnerabilities

### Performance
- Optimize build output
- Implement proper caching
- Monitor Core Web Vitals
- Regular performance audits

### Reliability
- Implement proper error handling
- Set up monitoring and alerting
- Maintain rollback procedures
- Regular backup procedures

### Documentation
- Keep deployment documentation updated
- Document all configuration changes
- Maintain troubleshooting guides
- Regular review of procedures
