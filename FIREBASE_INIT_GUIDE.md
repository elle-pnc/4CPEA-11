# Firebase Init Functions - Selection Guide

When running `firebase init functions`, here's what to select:

## Language Selection

**Select: JavaScript**

✅ Your project already uses JavaScript (not TypeScript)
✅ The `functions/index.js` file I created is in JavaScript
✅ Easier to maintain consistency with your existing codebase

**Do NOT select TypeScript** unless you plan to convert your entire project to TypeScript.

## Complete Selection Process

When you run `npm run firebase:init` or `firebase init functions`, you'll see prompts. Here's what to choose:

```
? What language would you like to write Cloud Functions in?
→ JavaScript  ← Select this one

? Do you want to use ESLint to catch probable bugs and enforce style?
→ Yes  ← Recommended for code quality

? Do you want to install dependencies with npm now?
→ Yes  ← This installs firebase-functions and firebase-admin
```

After this, Firebase will:
1. Create a `functions/` directory (if it doesn't exist)
2. Install dependencies (`firebase-functions`, `firebase-admin`, etc.)
3. Create `functions/index.js` (you already have this with the 2FA code)

## Important: Your Existing Code

You already have `functions/index.js` with the 2FA implementation. When Firebase asks:

```
? File functions/index.js already exists. Overwrite?
→ No  ← Keep your existing file!
```

**Select "No"** to keep the 2FA implementation I created for you.

## After Initialization

Once initialization is complete:

1. Verify `functions/package.json` has the dependencies:
   ```bash
   cat functions/package.json
   ```
   
   Should include:
   - `firebase-admin`
   - `firebase-functions`
   - `nodemailer` (you'll add this next if not present)

2. Install nodemailer:
   ```bash
   cd functions
   npm install nodemailer
   ```

3. Continue with the setup guide (configuring Gmail, deploying, etc.)

## Summary

✅ **Language: JavaScript**
✅ **ESLint: Yes** (optional but recommended)
✅ **Install dependencies: Yes**
✅ **Overwrite index.js: No** (keep existing 2FA code)
