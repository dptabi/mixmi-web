# API Key Security Configuration

## Overview

Firebase API keys are **public by design** for client-side applications. This is expected and secure when properly configured. Security is enforced through multiple layers:

1. **Firestore Security Rules** - Control data access
2. **API Key Restrictions** - Limit where the key can be used
3. **Firebase App Check** - Verify requests come from legitimate apps

## Current API Key

**Key**: `AIzaSyBq2rEwN3RskKxrZKG2PW8ofxlFNZLPHgg`  
**Project**: mixmi-66529

## Required Configuration

### 1. Configure API Key Restrictions in Google Cloud Console

**Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `mixmi-66529`
3. Navigate to: **APIs & Services** → **Credentials**
4. Find the API key: `AIzaSyBq2rEwN3RskKxrZKG2PW8ofxlFNZLPHgg`
5. Click **Edit** (pencil icon)

#### Application Restrictions
- Select: **HTTP referrers (web sites)**
- Add the following referrers:
  ```
  https://mixmi.co/*
  https://*.mixmi.co/*
  https://mixmi-66529.web.app/*
  https://mixmi-66529.firebaseapp.com/*
  ```
  - **Note**: Remove `localhost` referrers for production

#### API Restrictions
- Select: **Restrict key**
- Select only these APIs:
  - ✅ Cloud Firestore API
  - ✅ Firebase Realtime Database API
  - ✅ Firebase Storage API
  - ✅ Firebase Authentication API
  - ✅ Firebase Cloud Messaging API (if used)

### 2. Enable Firebase App Check (Recommended)

Firebase App Check provides an additional layer of security by verifying that requests come from legitimate apps.

**Steps**:
1. Go to [Firebase Console](https://console.firebase.google.com/project/mixmi-66529)
2. Navigate to: **Build** → **App Check**
3. Register your web app
4. Configure reCAPTCHA v3 for web
5. Update your code to include App Check tokens

**Benefits**:
- Prevents abuse from unauthorized sources
- Protects against automated attacks
- Works alongside API key restrictions

### 3. Monitor API Usage

**Regular Checks**:
- Review API usage in Google Cloud Console
- Monitor for unusual spikes or patterns
- Set up billing alerts
- Review Firestore security rule violations

## Security Best Practices

1. ✅ **Never commit API keys to version control** (unless they're public client keys)
2. ✅ **Always configure API key restrictions**
3. ✅ **Use Firestore Security Rules** to control data access
4. ✅ **Enable Firebase App Check** for production
5. ✅ **Monitor API usage** regularly
6. ✅ **Rotate keys** if compromised

## If API Key is Compromised

1. **Immediately** restrict the key in Google Cloud Console
2. Regenerate the API key
3. Update all applications with the new key
4. Review Firestore security rules
5. Monitor for unauthorized access
6. Document the incident

## Additional Resources

- [Firebase API Key Security](https://firebase.google.com/docs/projects/api-keys)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Google Cloud API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

---

**Last Updated**: Current Date

