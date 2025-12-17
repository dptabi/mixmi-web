# Grant Admin Access Guide

If you're getting the error "You do not have admin privileges" after successfully signing in with Google, you need to grant admin access to your account.

## Quick Fix: Two Methods

### Method 1: Using Custom Claims (Recommended)

This method sets admin privileges using Firebase Auth custom claims, which is the modern approach:

```bash
cd functions
npm install  # Make sure dependencies are installed
npx ts-node scripts/grant_admin.ts your-email@example.com
```

**Or using environment variable:**
```bash
ADMIN_TARGET_EMAIL=your-email@example.com npx ts-node scripts/grant_admin.ts
```

**With service account path:**
```bash
npx ts-node scripts/grant_admin.ts your-email@example.com ../mixmi-66529-firebase-adminsdk-fbsvc-d20953b0b9.json
```

### Method 2: Add to Realtime Database

This method adds your user to the Realtime Database with admin role:

```bash
cd functions
npm install  # Make sure dependencies are installed
npx ts-node scripts/add_admin_to_db.ts your-email@example.com
```

**With custom role:**
```bash
npx ts-node scripts/add_admin_to_db.ts your-email@example.com superadmin
```

**With service account path:**
```bash
npx ts-node scripts/add_admin_to_db.ts your-email@example.com admin ../mixmi-66529-firebase-adminsdk-fbsvc-d20953b0b9.json
```

## What Each Method Does

### Method 1: Custom Claims (`grant_admin.ts`)
- Sets `admin: true` in Firebase Auth custom claims
- Works immediately after sign-in
- User needs to sign out and sign back in to refresh token
- More secure and scalable

### Method 2: Realtime Database (`add_admin_to_db.ts`)
- Creates/updates user entry in Realtime Database at `users/{uid}`
- Sets `role: 'admin'` or `role: 'superadmin'`
- Works immediately
- Also creates user profile data

## After Granting Access

1. **Sign out** from the admin panel (if currently signed in)
2. **Clear browser cache** (optional but recommended)
3. **Sign in again** with Google
4. You should now have access to the admin dashboard

## Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
```bash
cd functions
npm install
```

### Error: "Service account file not found"
Make sure the service account JSON file exists at the specified path. Default path is `../mixmi-66529-firebase-adminsdk-fbsvc-d20953b0b9.json` from the functions directory.

### Error: "User not found"
The email must match exactly the Google account email you used to sign in. Check:
1. Go to Firebase Console → Authentication → Users
2. Find your user by email
3. Use that exact email address

### Still Getting "You do not have admin privileges"

1. **Check custom claims:**
   - Run Method 1 (grant_admin.ts)
   - Sign out and sign back in

2. **Check Realtime Database:**
   - Run Method 2 (add_admin_to_db.ts)
   - Check Firebase Console → Realtime Database → `users/{your-uid}`
   - Verify `role` field is set to `admin` or `superadmin`

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for error messages
   - Check Network tab for failed requests

4. **Try both methods:**
   - Run Method 1 first
   - Then run Method 2
   - Sign out and sign back in

## Manual Database Entry (Alternative)

If scripts don't work, you can manually add the entry:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `mixmi-66529`
3. Navigate to **Realtime Database**
4. Go to path: `users/{your-user-id}`
5. Create/update with:
   ```json
   {
     "id": "your-user-id",
     "email": "your-email@example.com",
     "displayName": "Your Name",
     "role": "admin",
     "createdAt": 1234567890,
     "updatedAt": 1234567890
   }
   ```

To find your user ID:
1. Go to Firebase Console → Authentication → Users
2. Find your email
3. Copy the UID

## Verification

After granting access, verify it worked:

1. **Check Custom Claims:**
   - Sign in to admin panel
   - Open browser console
   - Run: `firebase.auth().currentUser.getIdTokenResult().then(r => console.log(r.claims))`
   - Should show `admin: true` or `role: 'admin'`

2. **Check Realtime Database:**
   - Firebase Console → Realtime Database
   - Navigate to `users/{your-uid}`
   - Should show `role: "admin"` or `role: "superadmin"`

## Security Notes

- Only grant admin access to trusted users
- Use `superadmin` role sparingly (for highest privileges)
- Regularly audit admin users in Firebase Console
- Consider implementing admin approval workflow for production








