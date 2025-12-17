# Fix SuperAdmin Access Permission Denied Issue

If you're getting "Permission denied" errors when trying to access the User Management dashboard, follow these steps:

## Quick Fix

1. **Grant SuperAdmin Access** (run from project root):
   ```bash
   ./scripts/grant-superadmin.sh hey@mixmi.co
   ```

2. **Sign Out and Sign Back In**:
   - Click "Logout" in the admin panel
   - Sign back in with your Google account
   - This refreshes your authentication token with the new custom claims

3. **Verify Access**:
   - Try accessing the User Management dashboard again
   - Check browser console (F12) for token claims - you should see `admin: true` and `role: "superadmin"`

## Detailed Steps

### Step 1: Grant SuperAdmin Access

The grant script does two things:
- Sets custom claims on your Firebase Auth account (`admin: true`, `role: "superadmin"`)
- Creates/updates your user record in Realtime Database with `role: "superadmin"`

Run the script:
```bash
cd /path/to/mixmi-web
./scripts/grant-superadmin.sh hey@mixmi.co
```

You should see output like:
```
🔐 Granting superadmin access to hey@mixmi.co (USER_ID)...
✅ Set custom claims: admin=true, role=superadmin
✅ Added/updated user in Realtime Database with role: superadmin
✅ Successfully granted superadmin access to hey@mixmi.co
⚠️  IMPORTANT: User must sign out and sign back in for the changes to take effect!
```

### Step 2: Sign Out and Sign Back In

**CRITICAL**: Custom claims only take effect after you get a fresh authentication token. This requires signing out and signing back in.

1. Click the "Logout" button in the admin panel sidebar
2. Sign back in with your Google account
3. The new token will include the custom claims

### Step 3: Verify Database Rules Are Deployed

If you still get permission errors after steps 1 and 2, verify database rules are deployed:

```bash
firebase deploy --only database
```

The rules should check for:
- `auth.token.admin === true` OR
- `auth.token.role === 'admin'` OR  
- `auth.token.role === 'superadmin'`

## Troubleshooting

### Check Token Claims in Browser Console

1. Open the admin panel
2. Press F12 to open browser DevTools
3. Go to Console tab
4. Look for logs starting with "Token claims:" - you should see:
   ```json
   {
     "admin": true,
     "role": "superadmin",
     ...
   }
   ```

### If Token Claims Are Missing

If you don't see `admin: true` or `role: "superadmin"` in the token claims:

1. **Re-run the grant script**:
   ```bash
   ./scripts/grant-superadmin.sh hey@mixmi.co
   ```

2. **Sign out completely**:
   - Clear browser cache/cookies for the admin domain
   - Or use incognito/private browsing mode

3. **Sign back in**

### If Database Rules Are Not Deployed

Check if rules are deployed:
```bash
firebase database:rules:get
```

Deploy rules:
```bash
firebase deploy --only database
```

### Manual Token Refresh

In the User Management page, there's a "🔑 Refresh Token & Retry" button that will:
- Force refresh your authentication token
- Retry fetching users

This can help if you've just granted access but don't want to sign out/in.

## How It Works

### Custom Claims
Firebase Auth custom claims are embedded in the ID token. When you grant superadmin access:
- The `grant_superadmin.ts` script sets `admin: true` and `role: "superadmin"` as custom claims
- These claims are included in the user's ID token
- The token needs to be refreshed (by signing out/in) to include the new claims

### Database Rules
The Realtime Database rules check the token claims:
```json
{
  "rules": {
    "users": {
      ".read": "auth != null && (auth.token.admin === true || auth.token.role === 'admin' || auth.token.role === 'superadmin')"
    }
  }
}
```

If the token doesn't have these claims, access is denied.

### Why Sign Out/In Is Required

Firebase ID tokens are cached and don't automatically refresh when custom claims change. Signing out and back in forces a new token to be issued with the updated claims.

