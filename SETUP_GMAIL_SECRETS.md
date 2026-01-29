# Setup Gmail Secrets for Firebase Functions

Firebase has deprecated the old `functions.config()` method. We now use **Firebase Secrets** (the modern way).

## What is the Project Root Directory?

Your project root directory is:
```
/Users/lloyd/4CPEA-11
```

This is where your `package.json`, `firebase.json`, and `src/` folder are located.

## Quick Check - Make sure you're in the right place:

Run this command:
```bash
cd /Users/lloyd/4CPEA-11
pwd
ls
```

You should see:
- `package.json`
- `firebase.json`
- `src/` folder
- `functions/` folder

If you're in the `functions/` directory, go back:
```bash
cd /Users/lloyd/4CPEA-11
```

## Step 1: Set Gmail User Secret

**Make sure you're in the project root first:**

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase functions:secrets:set GMAIL_USER
```

When prompted, enter: `cadangjohnlloyd92@gmail.com`

## Step 2: Set Gmail App Password Secret

**Still in project root:**

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase functions:secrets:set GMAIL_APP_PASSWORD
```

When prompted, enter your app password **WITHOUT SPACES**: `ymvwlphyswbeiwcc`

**Important:** Remove all spaces from the app password when entering it.
Example: `ymvw lphy swbe iwcc` → `ymvwlphyswbeiwcc`

## Step 3: Grant Secret Access to Function

The function needs permission to access these secrets. This is handled automatically in the code with `runWith({ secrets: [...] })`, so you don't need to do anything here.

**Skip this step** - it's automatic!

## Step 4: Deploy Function

**Make sure you're in the project root:**

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase:deploy
```

Or specify the codebase explicitly:

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase deploy --only functions --only default
```

## Alternative: Using Legacy Config (Temporary)

If you want to use the old method temporarily (deprecated, will stop working in March 2026):

**From project root:**

```bash
cd /Users/lloyd/4CPEA-11

# Enable legacy commands
npm run firebase experiments:enable legacyRuntimeConfigCommands

# Set config (old method)
npm run firebase functions:config:set gmail.user="cadangjohnlloyd92@gmail.com"
npm run firebase functions:config:set gmail.apppassword="ymvwlphyswbeiwcc"
```

But I recommend using the new secrets method above.

## Verify Secrets Are Set

**Option 1: Check in Firebase Console**
1. Go to: https://console.firebase.google.com/project/cpe11-48f3f/functions
2. Look for "Secrets" section

**Option 2: Try to access them (shows if they exist)**

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase functions:secrets:access GMAIL_USER
npm run firebase functions:secrets:access GMAIL_APP_PASSWORD
```

This will show if the secrets are accessible.

---

## Complete Step-by-Step (Copy & Paste)

If you want to do it all at once:

```bash
# 1. Go to project root
cd /Users/lloyd/4CPEA-11

# 2. Set Gmail user secret
npm run firebase functions:secrets:set GMAIL_USER
# Enter: cadangjohnlloyd92@gmail.com

# 3. Set Gmail app password secret
npm run firebase functions:secrets:set GMAIL_APP_PASSWORD
# Enter: ymvwlphyswbeiwcc (NO SPACES!)

# 4. Deploy function
npm run firebase:deploy
```
