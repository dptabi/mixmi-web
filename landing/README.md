# Mixmi Landing Page

A static, SEO-optimized landing page for the Mixmi web application.

## Overview

The landing page is a static HTML page designed for:
- **Public Access**: Main entry point for visitors
- **SEO Optimization**: Search engine friendly with meta tags and structured data
- **Performance**: Fast loading with optimized assets
- **Mobile Responsive**: Works across all device sizes

## Features

### Content Management
- Static HTML content delivery
- SEO optimization with meta tags
- Performance optimization for fast loading
- Mobile-first responsive design

### Contact Features
- Contact forms for user inquiries
- Business information display
- Call-to-action buttons
- Social media integration

### Technical Features
- Static file hosting via Firebase
- CDN delivery for global performance
- SSL certificate (automatic)
- Custom domain support

## Project Structure

```
landing/
├── index.html              # Main landing page
├── firebase.json          # Firebase hosting configuration
└── README.md              # This file
```

## Quick Start

### Local Development

The landing page is static and can be served locally:

```bash
# Using Python (if installed)
cd landing
python -m http.server 8080

# Using Node.js (if installed)
cd landing
npx serve -s . -l 8080

# Using Firebase CLI
firebase serve --only hosting:landing-mixmi-web-prod
```

Access the page at `http://localhost:8080`

### Production Deployment

Deploy using Firebase CLI:

```bash
# Deploy to staging
firebase deploy --only hosting:landing-mixmi-web-staging

# Deploy to production
firebase deploy --only hosting:landing-mixmi-web-prod

# Or use the deployment script
./scripts/deploy.sh --env prod --target landing
```

## Configuration

### Firebase Hosting

The `firebase.json` file configures:
- Site ID for multi-site hosting
- Redirects and rewrites
- Security headers
- Cache control settings
- Custom 404 page

### Domain Configuration

The landing page supports custom domains:

**Production**: `mixmi.co`
**Staging**: `landing-mixmi-web-staging.web.app`

See [docs/DOMAIN_SETUP.md](../docs/DOMAIN_SETUP.md) for detailed domain configuration.

## Environment URLs

### Development
- Local: `http://localhost:8080`
- Firebase serve: `http://localhost:5000` (when using `firebase serve`)

### Staging
- URL: `https://landing-mixmi-web-staging.web.app`

### Production
- URL: `https://mixmi.co`
- WWW: `https://www.mixmi.co` (redirects to main domain)

## Content Management

### Updating Content

1. Edit `index.html` directly
2. Test changes locally
3. Deploy to staging for review
4. Deploy to production

### SEO Features

The landing page includes:
- Meta tags for search engines
- Open Graph tags for social sharing
- Structured data markup
- Semantic HTML structure
- Fast loading optimization

### Performance Optimization

- Minified HTML
- Optimized images
- Efficient CSS
- CDN delivery via Firebase
- Browser caching headers

## Deployment

### Manual Deployment

```bash
# Build and deploy
firebase deploy --only hosting:landing-mixmi-web-prod
```

### Automated Deployment

Use the project deployment script:

```bash
# Deploy landing page to production
./scripts/deploy.sh --env prod --target landing

# Deploy to staging
./scripts/deploy.sh --env staging --target landing
```

### CI/CD Integration

The deployment can be automated through:
- GitHub Actions
- Firebase CI/CD
- Custom deployment pipelines

## Monitoring

### Performance Monitoring

- Firebase Hosting analytics
- Core Web Vitals tracking
- Page load speed monitoring
- User engagement metrics

### Error Tracking

- 404 error monitoring
- Server error tracking
- User experience analytics

## Troubleshooting

### Common Issues

1. **Content not updating**
   - Check Firebase deployment status
   - Verify correct site ID in firebase.json
   - Clear browser cache

2. **Domain not resolving**
   - Check DNS configuration
   - Verify Firebase custom domain setup
   - Wait for DNS propagation (up to 48 hours)

3. **Performance issues**
   - Check image optimization
   - Review Firebase hosting metrics
   - Monitor Core Web Vitals

### Getting Help

- Check the main [README.md](../README.md) for general setup
- Review [docs/DOMAIN_SETUP.md](../docs/DOMAIN_SETUP.md) for domain issues
- See [docs/FIXES.md](../docs/FIXES.md) for troubleshooting guide

## Security

The landing page includes:
- HTTPS enforcement
- Security headers via Firebase
- Content Security Policy
- XSS protection

## Maintenance

### Regular Tasks

- Update content as needed
- Monitor performance metrics
- Check for broken links
- Review SEO analytics
- Update dependencies

### Backup

The landing page content is version-controlled in Git, providing automatic backup and version history.

## Learn More

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [HTML Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [SEO Guidelines](https://developers.google.com/search/docs)
- [Performance Optimization](https://web.dev/performance/)
