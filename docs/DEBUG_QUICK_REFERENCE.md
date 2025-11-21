# Debugging Quick Reference

Fast lookup for common debugging commands and techniques.

## Browser DevTools Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Open DevTools | `F12` or `Ctrl+Shift+I` | `Cmd+Option+I` |
| Console | `Ctrl+Shift+J` | `Cmd+Option+J` |
| Network | `Ctrl+Shift+E` | `Cmd+Option+E` |
| Reload Ignore Cache | `Ctrl+Shift+R` or `Ctrl+F5` | `Cmd+Shift+R` |

## Essential Console Commands

```javascript
// Check Firebase auth state
import { auth } from './firebase';
auth.onAuthStateChanged(user => console.log('User:', user));

// Test Firestore connection
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
getDocs(collection(db, 'orders')).then(s => console.log('Orders:', s.size));

// Test Realtime Database
import { rtdb } from './firebase';
import { ref, get } from 'firebase/database';
get(ref(rtdb, 'users')).then(s => console.log('Users:', s.val()));

// Clear localStorage
localStorage.clear();

// Check localStorage
console.log('Storage:', localStorage);
```

## Common npm Commands

```bash
# Start development server
cd admin && npm start

# Build for production
npm run build

# Check for errors without building
npx tsc --noEmit

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json && npm install

# Check outdated packages
npm outdated

# Run linting
npm run lint

# Test production build locally
npm run build && npx serve -s build -p 3000
```

## Firebase Commands

```bash
# Deploy to Firebase
firebase deploy

# Deploy specific targets
firebase deploy --only hosting:admin-mixmi-web-prod
firebase deploy --only firestore:rules

# View logs
firebase functions:log

# Login/logout
firebase login
firebase logout

# List projects
firebase projects:list
```

## Common Error Patterns

### Authentication
```
❌ Firebase: Error (auth/popup-closed-by-user)
✅ Normal: User closed popup

❌ Firebase: Error (auth/unauthorized-domain)
✅ Fix: Add domain to Firebase Console → Auth → Authorized domains

❌ Firebase: Error (auth/network-request-failed)
✅ Fix: Check internet connection
```

### Data Loading
```
❌ Firebase: Error (permission-denied)
✅ Fix: Check firestore.rules or storage.rules

❌ Firebase: Error (not-found)
✅ Fix: Check collection/document path exists
```

### Build/Compilation
```
❌ Module not found: Can't resolve 'X'
✅ Fix: npm install

❌ Maximum call stack size exceeded
✅ Fix: Check for infinite loops or circular dependencies
```

## Network Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | ✅ Good |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check authentication |
| 403 | Forbidden | Check Firebase rules |
| 404 | Not Found | Check path/URL |
| 500 | Server Error | Check Firebase Console |

## Debug Checklist

- [ ] Console has no red errors
- [ ] Network requests are 200 status
- [ ] Firebase config loaded correctly
- [ ] User authenticated
- [ ] Firestore rules allow operation
- [ ] Data exists in Firebase
- [ ] No infinite loops
- [ ] Browser cache cleared

## Quick Test Commands

```bash
# Verify Node version
node -v  # Should be 16+

# Verify npm version
npm -v

# Check if port 3000 is available
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)  # macOS/Linux
```

## Environment Variables

```bash
# Check if .env file exists
ls -la admin/.env

# Create .env from template
cp admin/.env.template admin/.env

# View environment variables
cat admin/.env
```

## Firebase Console Links

- [Authentication](https://console.firebase.google.com/project/mixmi-66529/authentication)
- [Firestore](https://console.firebase.google.com/project/mixmi-66529/firestore)
- [Realtime Database](https://console.firebase.google.com/project/mixmi-66529/database)
- [Hosting](https://console.firebase.google.com/project/mixmi-66529/hosting)
- [Storage](https://console.firebase.google.com/project/mixmi-66529/storage)

## React DevTools

Install: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)

Features:
- Component tree inspection
- Props and state viewing
- Performance profiling
- Hook debugging

## Performance Tips

```bash
# Analyze bundle size
npm run build
npx source-map-explorer build/static/js/*.js

# Profile React components
# Use React DevTools → Profiler tab
```

## Emergency Reset

```bash
# Complete reset (use with caution)
cd admin
rm -rf node_modules package-lock.json .env .cache build
npm install
npm start
```

---

**For detailed debugging strategies, see [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)**
