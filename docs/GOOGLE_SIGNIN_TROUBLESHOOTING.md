# Google Sign-In Troubleshooting Guide

## Issue: Cannot Sign In with Google on admin.mixmi.co

If you're unable to sign in with Google on https://admin.mixmi.co, follow these steps:

## Quick Fix Steps

### Step 1: Verify Google Sign-In is Enabled

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **mixmi-66529**
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Google** in the list
5. Click on it
6. Ensure **Enable** toggle is **ON**
7. Set **Project support email** to: `daveptabi@gmail.com`
8. Click **Save**

### Step 2: Add Authorized Domain (CRITICAL)

This is the most common issue! The domain must be explicitly authorized:

1. In Firebase Console, go to **Authentication** → **Settings** tab
2. Scroll down to **Authorized domains** section
3. Click **Add domain**
4. Add: `admin.mixmi.co`
5. Click **Add**

**Required domains:**
- ✅ `localhost` (for local development)
- ✅ `127.0.0.1` (for local development)
- ✅ `admin.mixmi.co` (for production)
- ✅ `mixmi-66529.firebaseapp.com` (auto-added by Firebase)
- ✅ `mixmi-66529.web.app` (auto-added by Firebase)

### Step 3: Check Browser Console

1. Open https://admin.mixmi.co
2. Open browser Developer Tools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Try to sign in with Google
5. Look for error messages

**Common error codes:**
- `auth/unauthorized-domain` → Domain not authorized (see Step 2)
- `auth/operation-not-allowed` → Google Sign-In not enabled (see Step 1)
- `auth/popup-blocked` → Browser blocking popups
- `auth/popup-closed-by-user` → User closed popup (not an error)

### Step 4: Try Alternative Sign-In Methods

The login page provides two Google sign-in options:

1. **Popup method** (default): Click "🔐 Sign in with Google (Popup)"
   - Opens a popup window
   - May be blocked by browser

2. **Redirect method** (fallback): Click "🔄 Sign in with Google (Redirect)"
   - Full page redirect
   - Works even if popups are blocked
   - Recommended if popup doesn't work

## Detailed Error Solutions

### Error: "auth/unauthorized-domain"

**Problem:** The domain `admin.mixmi.co` is not in the authorized domains list.

**Solution:**
1. Go to Firebase Console → Authentication → Settings
2. Add `admin.mixmi.co` to authorized domains
3. Wait a few minutes for changes to propagate
4. Clear browser cache and try again

### Error: "auth/operation-not-allowed"

**Problem:** Google Sign-In provider is not enabled.

**Solution:**
1. Go to Firebase Console → Authentication → Sign-in method
2. Click on **Google**
3. Toggle **Enable** to **ON**
4. Click **Save**

### Error: "auth/popup-blocked"

**Problem:** Browser is blocking popup windows.

**Solution:**
1. Allow popups for `admin.mixmi.co` in browser settings
2. Or use the **Redirect** sign-in method instead
3. Check browser extensions that might block popups

### Error: "auth/network-request-failed"

**Problem:** Network connectivity issue.

**Solution:**
1. Check internet connection
2. Check firewall settings
3. Try from a different network
4. Check if corporate firewall is blocking Google OAuth

## Verification Checklist

Before reporting an issue, verify:

- [ ] Google Sign-In is enabled in Firebase Console
- [ ] `admin.mixmi.co` is in authorized domains
- [ ] Project support email is configured
- [ ] Browser console shows no errors
- [ ] Tried both popup and redirect methods
- [ ] Cleared browser cache
- [ ] Tried in incognito/private mode
- [ ] Tried different browser (Chrome recommended)

## Testing After Fix

1. **Clear browser cache** (important!)
2. Open https://admin.mixmi.co in a new tab
3. Click "🔐 Sign in with Google (Popup)"
4. Google OAuth popup should open
5. Select your Google account
6. Should redirect to admin dashboard

## Still Not Working?

If the issue persists after following all steps:

1. **Check Firebase Console logs:**
   - Go to Firebase Console → Authentication → Users
   - Check if any sign-in attempts are logged

2. **Verify OAuth consent screen:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select project: **mixmi-66529**
   - Navigate to **APIs & Services** → **OAuth consent screen**
   - Ensure it's configured correctly

3. **Check API restrictions:**
   - Go to Google Cloud Console → **APIs & Services** → **Credentials**
   - Find your Firebase API key
   - Check if there are HTTP referrer restrictions
   - Ensure `admin.mixmi.co` is allowed

4. **Contact support:**
   - Provide browser console error messages
   - Provide Firebase project ID: `mixmi-66529`
   - Provide domain: `admin.mixmi.co`

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Sign-In Setup Guide](https://firebase.google.com/docs/auth/web/google-signin)
- [Authorized Domains Documentation](https://firebase.google.com/docs/auth/web/redirect-best-practices)

