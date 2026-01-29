# Fix npm Permission Issues

Your npm installation has permission problems. Here are several solutions:

## Quick Fix: Use Node Version Manager (nvm) - Recommended

This is the cleanest solution and avoids all permission issues:

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell
source ~/.zshrc

# Install Node.js 20 LTS (compatible with Firebase)
nvm install 20

# Use Node 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should work without errors

# Now install Firebase CLI locally
cd /Users/lloyd/4CPEA-11
npm install --save-dev firebase-tools

# Use it via npm scripts (add to package.json scripts)
# Or use: ./node_modules/.bin/firebase
```

## Alternative: Fix npm Permissions

### Option 1: Change npm's default directory

```bash
# Create a directory for global packages
mkdir ~/.npm-global

# Configure npm to use this directory
npm config set prefix '~/.npm-global'

# Create the directory structure
mkdir -p ~/.npm-global/bin

# Add to your PATH (add to ~/.zshrc)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Now npm install -g will use ~/.npm-global instead
npm install -g firebase-tools
```

### Option 2: Fix ownership of npm directories

```bash
# Fix ownership (replace 'lloyd' with your username if different)
sudo chown -R lloyd ~/.npm
sudo chown -R lloyd /usr/local/lib/node_modules

# Then try installing again
npm install -g firebase-tools
```

### Option 3: Fix npm installation itself

The error suggests npm's own files have permission issues. Try reinstalling npm:

```bash
# Reinstall npm (may require Node reinstall)
# If using Homebrew:
brew uninstall node
brew install node

# Or download and install from nodejs.org
```

## Workaround: Manual Installation

If npm still doesn't work, you can manually download and use Firebase CLI:

```bash
# Download Firebase CLI manually
cd /Users/lloyd/4CPEA-11
mkdir -p tools
cd tools

# Download the latest release
curl -L https://firebase.tools/bin/linux/firebase > firebase

# Make it executable
chmod +x firebase

# Use it directly
./tools/firebase login
./tools/firebase init functions
```

## Recommended Solution: Use nvm

I strongly recommend using **nvm** (Node Version Manager) because:

1. ✅ No permission issues (installs to user directory)
2. ✅ Can switch between Node versions easily
3. ✅ Keeps project dependencies isolated
4. ✅ Works with Firebase CLI perfectly

### Complete nvm Setup

```bash
# 1. Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. Reload shell
source ~/.zshrc

# 3. Install Node 20
nvm install 20
nvm use 20

# 4. Install Firebase CLI locally in your project
cd /Users/lloyd/4CPEA-11
npm install --save-dev firebase-tools

# 5. Add scripts to package.json (see below)
```

Then update your `package.json` to include Firebase scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "firebase": "./node_modules/.bin/firebase",
    "firebase:login": "npm run firebase login",
    "firebase:init": "npm run firebase init functions",
    "firebase:deploy": "npm run firebase deploy --only functions",
    "firebase:config:set": "npm run firebase functions:config:set"
  }
}
```

Then use:
```bash
npm run firebase:login
npm run firebase:init
npm run firebase:deploy
```

## Verify Fix

After fixing, verify npm works:

```bash
npm --version
npm install --save-dev firebase-tools
```

If these work without errors, you're good to go!
