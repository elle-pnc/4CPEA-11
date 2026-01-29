# Firebase CLI Setup Guide

## Option 1: Use npx (No Installation Needed - Recommended)

You don't need to install Firebase CLI globally. Use `npx` instead:

```bash
# Initialize Functions (using npx)
npx firebase init functions

# Deploy Functions
npx firebase deploy --only functions

# Set config
npx firebase functions:config:set gmail.user="your-email@gmail.com"
npx firebase functions:config:set gmail.apppassword="your-password"

# View logs
npx firebase functions:log
```

**Benefits:**
- ✅ No permission issues
- ✅ No global installation needed
- ✅ Always uses latest version
- ✅ No need for sudo

## Option 2: Fix npm Permissions (For Global Install)

If you prefer to install globally, fix npm permissions:

### Method A: Use npm's recommended approach

```bash
# Create a directory for global packages
mkdir ~/.npm-global

# Configure npm to use this directory
npm config set prefix '~/.npm-global'

# Add to your shell profile (~/.zshrc or ~/.bash_profile)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc

# Reload your shell
source ~/.zshrc

# Now install Firebase CLI
npm install -g firebase-tools
```

### Method B: Use sudo (Less Secure)

```bash
sudo npm install -g firebase-tools
```

**Note:** Using sudo for npm is generally not recommended for security reasons.

## Option 3: Use Node Version Manager (nvm)

If you have Node v25.2.1 but Firebase requires 20 || 22 || 24:

```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.zshrc

# Install Node 20 (LTS)
nvm install 20

# Use Node 20
nvm use 20

# Now install Firebase CLI
npm install -g firebase-tools
```

## Recommended: Use npx (Option 1)

For your use case, **npx is the easiest** and doesn't require any setup. Just use `npx firebase` instead of `firebase` in all commands.

## Quick Start with npx

```bash
# Login to Firebase
npx firebase login

# Initialize Functions
npx firebase init functions
# Select: JavaScript, Yes to install dependencies

# Set Gmail config
npx firebase functions:config:set gmail.user="your-email@gmail.com"
npx firebase functions:config:set gmail.apppassword="your-16-char-password"

# Deploy
npx firebase deploy --only functions
```

That's it! No permission issues, no global install needed.
