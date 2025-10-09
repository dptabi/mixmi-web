# Domain Setup Guide

This guide explains how to configure custom domains for the Mixmi web application with multi-site Firebase hosting.

## Firebase Hosting Sites

The application uses Firebase Hosting with multiple sites:

### Production Sites
- Admin site: `admin-mixmi-web-prod.web.app` → `admin.mixmi.co`
- Landing site: `landing-mixmi-web-prod.web.app` → `mixmi.co`

### Staging Sites
- Admin site: `admin-mixmi-web-staging.web.app`
- Landing site: `landing-mixmi-web-staging.web.app`

## Custom Domain Configuration

### 1. Create Firebase Hosting Sites

First, create the hosting sites using the setup script:

```bash
./scripts/setup-firebase-sites.sh
```

### 2. Add Custom Domains in Firebase Console

#### Firebase Custom Domain Configuration Steps

For each site, add custom domains through the Firebase Console:

**For Admin Site (admin.mixmi.co):**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Hosting** in the left sidebar
4. Click on the **admin-mixmi-web-prod** site
5. Click **"Add custom domain"**
6. Enter `admin.mixmi.co` as the domain name
7. Click **"Continue"**
8. Firebase will provide verification instructions
9. Follow the domain verification process
10. Wait for SSL certificate provisioning (up to 24 hours)

**For Landing Site (mixmi.co):**

1. Navigate to **Hosting** in the Firebase Console
2. Click on the **landing-mixmi-web-prod** site
3. Click **"Add custom domain"**
4. Enter `mixmi.co` as the domain name
5. Click **"Continue"**
6. Follow the same verification process as above

**Verification Process:**
- Firebase will provide a TXT record to add to your DNS
- Add the TXT record to verify domain ownership
- Once verified, Firebase will automatically provision SSL certificates

### 3. DNS Configuration

#### DNS CNAME Setup for admin.mixmi.co

Configure your DNS provider with the following records:

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

**Important Notes for admin.mixmi.co:**
- The `admin` subdomain must point to the Firebase hosting site ID
- Ensure the CNAME record is properly configured in your DNS provider
- DNS propagation can take up to 48 hours globally
- Some DNS providers may require the trailing dot (.) in the CNAME value

### 4. SSL Certificate Auto-Provisioning

#### SSL Certificate Information

Firebase automatically provisions SSL certificates for custom domains through Let's Encrypt:

**Automatic Provisioning Process:**
1. **Domain Verification**: Once your domain is verified in Firebase Console
2. **Certificate Request**: Firebase automatically requests an SSL certificate from Let's Encrypt
3. **Provisioning Time**: SSL certificates are typically provisioned within 24 hours
4. **Renewal**: Certificates are automatically renewed before expiration

**SSL Certificate Details:**
- **Provider**: Let's Encrypt
- **Type**: Wildcard certificates for subdomains
- **Validity**: 90 days (auto-renewed)
- **Coverage**: HTTPS enforcement for all custom domains

**Monitoring SSL Status:**
- Check certificate status in Firebase Console → Hosting → Custom domains
- Green checkmark indicates active SSL certificate
- Yellow warning indicates certificate is being provisioned
- Red error indicates certificate provisioning failed

**SSL Certificate Troubleshooting:**
- If certificate fails to provision, verify DNS records are correct
- Ensure domain verification TXT record is still present
- Check that CNAME records point to the correct Firebase hosting site
- Contact Firebase support if certificate fails after 48 hours

## Environment-Specific Domains

### Development
- Admin: `localhost:3000`
- Landing: `localhost:8080`

### Staging
- Admin: `https://admin-mixmi-web-staging.web.app`
- Landing: `https://landing-mixmi-web-staging.web.app`

### Production
- Admin: `https://admin.mixmi.co`
- Landing: `https://mixmi.co`

## Deployment

Deploy to different environments:

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

## Troubleshooting

Common issues:

1. **DNS propagation delays** - Wait up to 48 hours for full propagation
2. **SSL certificate provisioning** - Can take up to 24 hours
3. **CORS configuration** - Check Firebase hosting configuration
4. **Site not found** - Verify site IDs in `.firebaserc`

## Testing Checklist for Subdomain

### Pre-Deployment Testing

**1. DNS Configuration Testing**
```bash
# Test DNS resolution
nslookup admin.mixmi.co
nslookup mixmi.co

# Verify CNAME records
dig admin.mixmi.co CNAME
dig mixmi.co CNAME

# Test from different DNS servers
nslookup admin.mixmi.co 8.8.8.8
nslookup admin.mixmi.co 1.1.1.1
```

**2. Firebase Site Configuration Testing**
- [ ] Verify site IDs in `.firebaserc` match Firebase Console
- [ ] Confirm custom domains are added in Firebase Console
- [ ] Check domain verification status (green checkmark)
- [ ] Verify SSL certificate status in Firebase Console

### Post-Deployment Testing

**3. Domain Accessibility Testing**
- [ ] `https://admin.mixmi.co` loads without errors
- [ ] `https://mixmi.co` loads without errors
- [ ] `https://www.mixmi.co` redirects to `https://mixmi.co`
- [ ] Both domains show green lock icon in browser
- [ ] No mixed content warnings

**4. SSL Certificate Testing**
```bash
# Test SSL certificate
openssl s_client -connect admin.mixmi.co:443 -servername admin.mixmi.co
openssl s_client -connect mixmi.co:443 -servername mixmi.co

# Check certificate validity
curl -I https://admin.mixmi.co
curl -I https://mixmi.co
```

**5. Application Functionality Testing**
- [ ] Admin dashboard authentication works
- [ ] Landing page loads completely
- [ ] All forms and interactive elements function
- [ ] No console errors in browser developer tools
- [ ] Mobile responsiveness works on both domains

**6. Performance Testing**
- [ ] Page load times under 3 seconds
- [ ] Core Web Vitals meet Google standards
- [ ] Images and assets load correctly
- [ ] No 404 errors for resources

**7. Cross-Browser Testing**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

**8. Monitoring Setup**
- [ ] Firebase Hosting analytics enabled
- [ ] Error tracking configured
- [ ] Uptime monitoring set up
- [ ] Performance monitoring active

### Troubleshooting Checklist

**If DNS Issues:**
- [ ] Verify CNAME records are correct
- [ ] Check DNS propagation status
- [ ] Confirm domain registrar settings
- [ ] Wait up to 48 hours for full propagation

**If SSL Issues:**
- [ ] Verify domain verification in Firebase Console
- [ ] Check certificate provisioning status
- [ ] Confirm CNAME records point to correct Firebase site
- [ ] Wait up to 24 hours for certificate provisioning

**If Application Issues:**
- [ ] Check Firebase Console for deployment status
- [ ] Verify site configuration in firebase.json
- [ ] Test Firebase hosting URLs directly
- [ ] Check browser console for JavaScript errors

## Security Headers

The configuration includes security headers:

- `X-Frame-Options: DENY` (admin) / `SAMEORIGIN` (landing)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Cache control for static assets (1 year)
