# Common Fixes

This document provides solutions to common issues encountered during development and deployment.

## Build Issues

### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript compilation errors
```bash
# Check TypeScript version
npx tsc --version

# Update TypeScript
npm install -g typescript@latest
```

## Firebase Issues

### Authentication errors
1. Check Firebase configuration
2. Verify Google OAuth setup
3. Ensure correct domain configuration

### Hosting deployment fails
```bash
# Clear Firebase cache
firebase logout
firebase login

# Rebuild and deploy
npm run build
firebase deploy
```

### Firestore rules deployment
```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

## Development Issues

### Hot reload not working
1. Check if port 3000 is available
2. Restart development server
3. Clear browser cache

### CORS errors
1. Check Firebase hosting configuration
2. Verify domain settings
3. Update CORS headers if needed

## Performance Issues

### Slow loading times
1. Optimize images
2. Enable compression
3. Check bundle size

### Memory leaks
1. Check for unsubscribed listeners
2. Review component lifecycle
3. Monitor memory usage

## Contact

For issues not covered here, please create a GitHub issue or contact the development team.
