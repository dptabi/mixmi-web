# Debugging Guide - Mixmi Web Admin

This guide provides step-by-step instructions for debugging the Mixmi admin web application in development mode.

## Quick Start Debugging

### 1. Start the Development Server

```bash
cd admin
npm start
```

The app will start at `http://localhost:3000` and automatically open in your browser.

### 2. Open Browser Developer Tools

**Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
**Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
**Safari**: Press `Cmd+Option+I` (Mac, requires enabling Developer menu first)

### 3. Key Debugging Tabs to Monitor

#### Console Tab
- **JavaScript Errors**: Red error messages appear here
- **Console Logs**: Your `console.log()` statements
- **Network Errors**: Failed API requests
- **Firebase Errors**: Authentication and database issues

#### Network Tab
- **API Calls**: Monitor Firebase requests
- **Failed Requests**: Red entries indicate problems
- **Request/Response**: Click to see headers and data

#### Application Tab
- **Local Storage**: Check stored authentication tokens
- **Cookies**: Verify session data
- **Firebase**: Inspect Firebase configuration

## Common Debugging Scenarios

### Authentication Issues

**Problem**: Cannot log in or getting authentication errors

**Debugging Steps**:

1. **Check Console for Errors**
   ```
   Look for Firebase auth errors in console
   ```

2. **Verify Firebase Configuration**
   - Open `admin/src/firebase-config.ts`
   - Verify all Firebase credentials are correct
   - Check that `authDomain` and other settings match your Firebase project

3. **Check Network Tab**
   - Look for requests to `accounts.google.com` (for Google sign-in)
   - Verify no CORS errors
   - Check status codes (should be 200 for success)

4. **Inspect Firebase Auth State**
   ```javascript
   // Add to browser console:
   import { auth } from './firebase';
   auth.onAuthStateChanged(user => console.log('Auth state:', user));
   ```

5. **Verify OAuth Configuration**
   - Go to Firebase Console → Authentication → Sign-in method
   - Ensure Google provider is enabled
   - Check authorized domains include `localhost:3000`

### Data Loading Issues

**Problem**: Users or orders not loading from Firebase

**Debugging Steps**:

1. **Check Console for Firestore/RTDB Errors**
   ```
   Look for permission denied errors
   ```

2. **Verify Firebase Security Rules**
   ```bash
   # Check rules files
   cat firebase/firestore.rules
   cat firebase/storage.rules
   ```

3. **Test Firebase Connection**
   ```javascript
   // Add to browser console:
   import { db, rtdb } from './firebase';
   
   // Test Firestore
   import { collection, getDocs } from 'firebase/firestore';
   getDocs(collection(db, 'orders')).then(snapshot => {
     console.log('Orders loaded:', snapshot.size);
   });
   
   // Test Realtime Database
   import { ref, get } from 'firebase/database';
   get(ref(rtdb, 'users')).then(snapshot => {
     console.log('Users loaded:', snapshot.val());
   });
   ```

4. **Check Network Tab**
   - Look for requests to `firestore.googleapis.com` or `firebaseio.com`
   - Check for 403 (permission denied) or 404 (collection not found) errors

### Component Rendering Issues

**Problem**: UI not updating or showing blank screens

**Debugging Steps**:

1. **React DevTools Extension**
   - Install [React Developer Tools](https://react.dev/learn/react-developer-tools)
   - Opens Components tab showing component tree
   - Inspect props and state for each component

2. **Check Console for React Errors**
   ```
   Look for "Warning:" or "Error:" messages from React
   ```

3. **Verify Component Props**
   - Use React DevTools to inspect passed props
   - Check if data is in expected format

4. **Check for Infinite Loops**
   - Look for repeated console logs
   - Monitor Network tab for excessive requests

## Advanced Debugging

### Enable Detailed Logging

Create a debug utility in your components:

```typescript
// Add to component
const DEBUG = process.env.REACT_APP_DEBUG === 'true';

useEffect(() => {
  if (DEBUG) {
    console.log('Component mounted:', componentName);
    console.log('Props:', props);
    console.log('State:', state);
  }
}, [props, state]);
```

### Debug Firebase Queries

Add logging to Firebase operations:

```typescript
// Example for users loading
const loadUsers = async () => {
  console.log('🔄 Loading users...');
  try {
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);
    console.log('✅ Users loaded:', snapshot.size);
    console.log('📊 Data:', snapshot.val());
    return snapshot.val();
  } catch (error) {
    console.error('❌ Error loading users:', error);
    throw error;
  }
};
```

### Monitor Performance

**React DevTools Profiler**:
1. Click "Profiler" tab
2. Click record button
3. Perform actions in the app
4. Stop recording
5. Analyze which components are slow

**Performance Tab**:
1. Open Chrome DevTools → Performance
2. Click record button
3. Use the application
4. Stop recording
5. Look for long tasks (red marks)

### Debug Build Errors

**TypeScript Errors**:
```bash
# Check TypeScript errors without building
cd admin
npx tsc --noEmit
```

**Linting Errors**:
```bash
# Check for linting issues
cd admin
npm run lint
```

### Network Debugging

**Slow Network Simulation**:
1. Open DevTools → Network tab
2. Click throttling dropdown
3. Select "Slow 3G" or "Fast 3G"
4. Test your app on slow connections

**Offline Testing**:
1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Test offline behavior
4. Firebase should handle offline gracefully

## Environment-Specific Debugging

### Development Mode

Enable debug mode in `.env.local`:
```bash
REACT_APP_DEBUG=true
REACT_APP_LOG_LEVEL=debug
```

### Production Build Testing

Test production build locally:
```bash
cd admin
npm run build
npx serve -s build -p 3000
```

Then debug at `http://localhost:3000`

## Firebase-Specific Debugging

### Firestore Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Monitor writes/reads in real-time
4. Check data structure matches expectations

### Realtime Database Console

1. Go to Firebase Console
2. Navigate to Realtime Database
3. Watch data changes live
4. Verify data paths match your code

### Authentication Console

1. Go to Firebase Console → Authentication → Users
2. Verify users are being created
3. Check user metadata
4. View authentication logs

## Common Error Messages and Solutions

### "Firebase: Error (auth/popup-closed-by-user)"
**Solution**: User closed the sign-in popup. Normal behavior, no action needed.

### "Firebase: Error (permission-denied)"
**Solution**: Check Firebase security rules in `firebase/firestore.rules` or `firebase/storage.rules`

### "Cannot read property 'X' of undefined"
**Solution**: Add null checks before accessing properties:
```typescript
// ❌ Bad
const name = user.profile.name;

// ✅ Good
const name = user?.profile?.name ?? 'Unknown';
```

### "Maximum update depth exceeded"
**Solution**: Avoid setting state in render function, check for infinite useEffect loops

### "Module not found: Can't resolve 'X'"
**Solution**: Run `npm install` to ensure all dependencies are installed

## Debug Checklist

Use this checklist when debugging:

- [ ] Console has no errors
- [ ] Network requests are successful (200 status)
- [ ] Firebase configuration is correct
- [ ] Security rules allow current operation
- [ ] Component props are valid
- [ ] State updates are working
- [ ] No infinite loops in useEffect
- [ ] Authentication state is correct
- [ ] Firestore/RTDB data exists
- [ ] Environment variables are set

## Getting Help

If you're stuck:

1. **Check Console**: Look for error messages
2. **Search Logs**: Look for similar issues in the codebase
3. **Review Documentation**: Check `docs/FIXES.md` for common issues
4. **Firebase Console**: Verify data and configuration
5. **Git Status**: Check if recent changes broke something

## Useful Commands

```bash
# Start with debug logging
DEBUG=true npm start

# Clear cache and rebuild
rm -rf node_modules package-lock.json .cache
npm install

# Check for outdated packages
npm outdated

# View Firebase logs
firebase functions:log

# Deploy and view logs
firebase deploy && firebase functions:log
```

## Debugging Tools

### Recommended Extensions

- **React Developer Tools**: Component inspection
- **Redux DevTools**: State management (if using Redux)
- **GraphQL DevTools**: For GraphQL (if applicable)

### Browser Extensions

- **Web Developer**: General web debugging
- **JSON Formatter**: Format JSON responses
- **CORS Toggle**: Test CORS issues

## Performance Debugging

### Bundle Size Analysis

```bash
# Analyze bundle
cd admin
npm run build
npx source-map-explorer build/static/js/*.js
```

### Lighthouse Audit

1. Open DevTools → Lighthouse tab
2. Select audit categories
3. Click "Analyze page load"
4. Review performance suggestions

---

**Remember**: Debugging is a skill that improves with practice. When in doubt, check the console first!
