# CI/CD Setup Guide

This document provides comprehensive CI/CD setup suggestions and configurations for the Mixmi web application.

## Overview

The CI/CD pipeline automates the build, test, and deployment process for the Mixmi web application across different environments.

## GitHub Actions Workflow

### 1. Main Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Mixmi Web Application

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  NODE_VERSION: '18'
  FIREBASE_CLI_VERSION: 'latest'

jobs:
  # Test job runs on all pushes and PRs
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: admin/package-lock.json

      - name: Install dependencies
        run: |
          cd admin
          npm ci

      - name: Run linting
        run: |
          cd admin
          npm run lint

      - name: Run type checking
        run: |
          cd admin
          npx tsc --noEmit

      - name: Run tests
        run: |
          cd admin
          npm test -- --coverage --watchAll=false

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: admin/coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  # Deploy to staging on develop branch
  deploy-staging:
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
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
        env:
          REACT_APP_ENVIRONMENT: staging
          REACT_APP_API_URL: https://us-central1-mixmi-web-staging.cloudfunctions.net/api

      - name: Deploy to Firebase Staging
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_STAGING }}'
          channelId: staging
          projectId: mixmi-web-staging
          target: admin-mixmi-web-staging,landing-mixmi-web-staging

      - name: Notify Slack - Staging Deploy
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow

  # Deploy to production on main branch
  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
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
        env:
          REACT_APP_ENVIRONMENT: production
          REACT_APP_API_URL: https://us-central1-mixmi-web-prod.cloudfunctions.net/api

      - name: Deploy to Firebase Production
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PROD }}'
          channelId: live
          projectId: mixmi-web-prod
          target: admin-mixmi-web-prod,landing-mixmi-web-prod

      - name: Notify Slack - Production Deploy
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow

      - name: Create GitHub Release
        if: success()
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            ## Changes in this Release
            - Automated deployment from main branch
            - Commit: ${{ github.sha }}
            - Author: ${{ github.actor }}
          draft: false
          prerelease: false
```

### 2. Security Workflow

Create `.github/workflows/security.yml`:

```yaml
name: Security Scan

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: admin/package-lock.json

      - name: Install dependencies
        run: |
          cd admin
          npm ci

      - name: Run npm audit
        run: |
          cd admin
          npm audit --audit-level moderate

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 3. Performance Testing Workflow

Create `.github/workflows/performance.yml`:

```yaml
name: Performance Testing

on:
  pull_request:
    branches:
      - main
  workflow_dispatch:

jobs:
  lighthouse-ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
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

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  bundle-analysis:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: admin/package-lock.json

      - name: Install dependencies
        run: |
          cd admin
          npm ci

      - name: Build and analyze bundle
        run: |
          cd admin
          npm run build
          npx webpack-bundle-analyzer build/static/js/*.js --report --mode static --no-open
        env:
          GENERATE_SOURCEMAP: false

      - name: Upload bundle analysis
        uses: actions/upload-artifact@v3
        with:
          name: bundle-analysis
          path: admin/bundle-analysis.html
```

## Required Secrets

### GitHub Secrets Configuration

Configure the following secrets in your GitHub repository settings:

**Firebase Secrets**:
- `FIREBASE_SERVICE_ACCOUNT_STAGING`: JSON service account for staging project
- `FIREBASE_SERVICE_ACCOUNT_PROD`: JSON service account for production project

**Notification Secrets**:
- `SLACK_WEBHOOK`: Slack webhook URL for deployment notifications
- `DISCORD_WEBHOOK`: Discord webhook URL (alternative to Slack)

**Security Secrets**:
- `SNYK_TOKEN`: Snyk API token for vulnerability scanning
- `LHCI_GITHUB_APP_TOKEN`: Lighthouse CI GitHub app token

**External Service Secrets**:
- `CODECOV_TOKEN`: Codecov upload token for coverage reporting

### Firebase Service Account Setup

1. **Create Service Accounts**:
   ```bash
   # For staging
   firebase projects:addfirebase mixmi-web-staging
   gcloud iam service-accounts create github-actions-staging
   
   # For production
   firebase projects:addfirebase mixmi-web-prod
   gcloud iam service-accounts create github-actions-prod
   ```

2. **Assign Permissions**:
   ```bash
   # Staging permissions
   gcloud projects add-iam-policy-binding mixmi-web-staging \
     --member="serviceAccount:github-actions-staging@mixmi-web-staging.iam.gserviceaccount.com" \
     --role="roles/firebase.hostingAdmin"
   
   # Production permissions
   gcloud projects add-iam-policy-binding mixmi-web-prod \
     --member="serviceAccount:github-actions-prod@mixmi-web-prod.iam.gserviceaccount.com" \
     --role="roles/firebase.hostingAdmin"
   ```

3. **Generate Keys**:
   ```bash
   # Staging key
   gcloud iam service-accounts keys create staging-key.json \
     --iam-account=github-actions-staging@mixmi-web-staging.iam.gserviceaccount.com
   
   # Production key
   gcloud iam service-accounts keys create prod-key.json \
     --iam-account=github-actions-prod@mixmi-web-prod.iam.gserviceaccount.com
   ```

## Environment Protection Rules

### Staging Environment
- **Required reviewers**: 1 team member
- **Wait timer**: 0 minutes
- **Deployment branches**: `develop` branch only

### Production Environment
- **Required reviewers**: 2 team members
- **Wait timer**: 5 minutes
- **Deployment branches**: `main` branch only
- **Required status checks**: All tests must pass

## Branch Protection Rules

Configure branch protection for `main` and `develop` branches:

**Main Branch Protection**:
- Require pull request reviews before merging
- Dismiss stale reviews when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators

**Develop Branch Protection**:
- Require pull request reviews before merging
- Require status checks to pass before merging
- Allow force pushes for administrators

## Deployment Strategies

### 1. Blue-Green Deployment

```yaml
- name: Deploy to Blue Environment
  run: |
    firebase deploy --project mixmi-web-prod-blue --only hosting

- name: Health Check Blue
  run: |
    curl -f https://admin-mixmi-web-prod-blue.web.app || exit 1

- name: Switch Traffic to Blue
  run: |
    # Update DNS to point to blue environment
    # This step would be implemented based on your DNS provider

- name: Deploy to Green Environment (Previous Blue)
  run: |
    firebase deploy --project mixmi-web-prod-green --only hosting
```

### 2. Canary Deployment

```yaml
- name: Deploy Canary Version
  run: |
    firebase hosting:channel:deploy canary --project mixmi-web-prod

- name: Monitor Canary Metrics
  run: |
    # Monitor error rates and performance for 30 minutes
    sleep 1800

- name: Promote Canary to Production
  if: success()
  run: |
    firebase hosting:channel:delete canary --project mixmi-web-prod
```

### 3. Rolling Deployment

```yaml
- name: Deploy Admin First
  run: |
    firebase deploy --project mixmi-web-prod --only hosting:admin-mixmi-web-prod

- name: Health Check Admin
  run: |
    curl -f https://admin.mixmi.co || exit 1

- name: Deploy Landing
  run: |
    firebase deploy --project mixmi-web-prod --only hosting:landing-mixmi-web-prod

- name: Health Check Landing
  run: |
    curl -f https://mixmi.co || exit 1
```

## Monitoring and Alerting

### 1. Deployment Notifications

**Slack Integration**:
```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    fields: repo,message,commit,author,action,eventName,ref,workflow
```

**Email Notifications**:
```yaml
- name: Send Email Notification
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: 'Deployment Status: ${{ job.status }}'
    to: 'team@mixmi.co'
    from: 'CI/CD Bot'
    body: |
      Deployment Status: ${{ job.status }}
      Repository: ${{ github.repository }}
      Branch: ${{ github.ref }}
      Commit: ${{ github.sha }}
```

### 2. Health Checks

**Post-Deployment Health Checks**:
```yaml
- name: Health Check Admin
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://admin.mixmi.co)
    if [ $response -ne 200 ]; then
      echo "Health check failed for admin: $response"
      exit 1
    fi

- name: Health Check Landing
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://mixmi.co)
    if [ $response -ne 200 ]; then
      echo "Health check failed for landing: $response"
      exit 1
    fi
```

### 3. Performance Monitoring

**Lighthouse CI Configuration**:
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['https://admin.mixmi.co', 'https://mixmi.co'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Best Practices

### 1. Security
- Use environment-specific service accounts
- Rotate secrets regularly
- Enable branch protection rules
- Use dependency scanning
- Implement security headers

### 2. Performance
- Monitor bundle size
- Use Lighthouse CI for performance testing
- Implement caching strategies
- Monitor Core Web Vitals
- Optimize build process

### 3. Reliability
- Implement health checks
- Use blue-green deployments
- Set up monitoring and alerting
- Maintain rollback procedures
- Test deployment process regularly

### 4. Documentation
- Document all CI/CD processes
- Keep secrets documentation updated
- Maintain troubleshooting guides
- Regular review of workflows
- Version control all configurations
