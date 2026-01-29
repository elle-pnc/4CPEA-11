# Hostinger Deployment Guide

This guide will walk you through deploying your React commuter app to Hostinger.

## Prerequisites

- Hostinger hosting account with File Manager or FTP access
- Your domain or subdomain configured
- Node.js installed on your local machine (for building)

## Step 1: Build the Production Version

1. **Open your terminal** and navigate to the project directory:
   ```bash
   cd /Users/lloyd/4CPEA-11
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Build the production version**:
   ```bash
   npm run build
   ```

   This will create a `dist/` folder with all the optimized production files.

## Step 2: Prepare Additional Files

The build process creates the `dist/` folder, but you also need to include:

1. **`register.html`** - Standalone registration page
2. **`driver-simulation.html`** - Standalone driver simulation page
3. **`.htaccess`** - Apache configuration for React Router (see Step 3)

## Step 3: Create .htaccess File

Create a `.htaccess` file in your project root with the following content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  
  # Don't rewrite specific file types
  RewriteCond %{REQUEST_URI} !\.(?:css|js|jpe?g|gif|png|svg|ico|woff2?|ttf|eot)$ [NC]
  
  # Don't rewrite existing files in assets folder
  RewriteCond %{REQUEST_URI} !^/assets/
  
  # Don't rewrite register.html or driver-simulation.html
  RewriteCond %{REQUEST_URI} !^/register\.html$
  RewriteCond %{REQUEST_URI} !^/driver-simulation\.html$
  
  # Rewrite everything else to index.html
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

**Copy this `.htaccess` file to the `dist/` folder** after building.

## Step 4: Upload Files to Hostinger

### Option A: Using File Manager (Recommended)

1. **Log in to Hostinger** and go to **hPanel** (or your hosting control panel)

2. **Open File Manager**:
   - Navigate to `public_html` (or your domain's root directory)
   - If you're using a subdomain, navigate to that subdomain's folder

3. **Clear existing files** (optional, but recommended):
   - Delete all existing files in `public_html` (or backup first)
   - **Important**: Don't delete `.htaccess` if you have other configurations

4. **Upload files from `dist/` folder**:
   - Upload ALL contents of the `dist/` folder to `public_html`
   - This includes:
     - `index.html`
     - `assets/` folder (with all JS, CSS, and images)
     - Any other files in `dist/`

5. **Upload additional files**:
   - Upload `register.html` to `public_html/`
   - Upload `driver-simulation.html` to `public_html/`
   - Upload `.htaccess` to `public_html/` (if not already there)

### Option B: Using FTP

1. **Get FTP credentials** from Hostinger:
   - FTP Host: Usually `ftp.yourdomain.com` or an IP address
   - FTP Username: Your hosting username
   - FTP Password: Your hosting password
   - Port: Usually `21` (or `22` for SFTP)

2. **Connect using an FTP client** (FileZilla, Cyberduck, etc.):
   ```
   Host: ftp.yourdomain.com
   Username: your_username
   Password: your_password
   Port: 21
   ```

3. **Navigate to `public_html`** (or your domain's root)

4. **Upload all files** from `dist/` folder to `public_html/`

5. **Upload additional files**:
   - `register.html`
   - `driver-simulation.html`
   - `.htaccess`

## Step 5: Verify Deployment

1. **Visit your website** in a browser:
   - Main app: `https://yourdomain.com`
   - Registration: `https://yourdomain.com/register.html`
   - Driver Simulation: `https://yourdomain.com/driver-simulation.html`

2. **Test the following**:
   - ✅ Login page loads correctly
   - ✅ Navigation works (no 404 errors)
   - ✅ Firebase connection works
   - ✅ Images and assets load properly
   - ✅ All routes work (dashboard, history, settings, etc.)

3. **Check browser console** for any errors:
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

## Step 6: Configure Firebase (If Needed)

If you haven't already, add your Hostinger domain to Firebase:

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `cpe11-48f3f`
3. **Go to Authentication → Settings → Authorized domains**
4. **Add your domain**: `yourdomain.com`
5. **Save**

## Troubleshooting

### Issue: 404 errors on page refresh
**Solution**: Make sure `.htaccess` is uploaded and `mod_rewrite` is enabled on Hostinger

### Issue: Assets not loading (404 errors)
**Solution**: 
- Check that the `assets/` folder was uploaded correctly
- Verify file paths in browser Network tab
- Ensure `.htaccess` doesn't rewrite asset requests

### Issue: Firebase errors
**Solution**:
- Verify Firebase config in `src/firebase/config.js` is correct
- Check that your domain is added to Firebase authorized domains
- Check browser console for specific error messages

### Issue: White screen / Blank page
**Solution**:
- Check browser console for JavaScript errors
- Verify `index.html` is in the root directory
- Check that all files from `dist/` were uploaded
- Clear browser cache and try again

### Issue: Routes not working
**Solution**:
- Verify `.htaccess` file is present and correct
- Check that `mod_rewrite` is enabled on Hostinger
- Contact Hostinger support if `mod_rewrite` is not available

## Quick Checklist

Before deploying, make sure:
- [ ] `npm run build` completed successfully
- [ ] `dist/` folder contains all files
- [ ] `.htaccess` file is ready
- [ ] `register.html` is ready
- [ ] `driver-simulation.html` is ready
- [ ] Firebase domain is authorized
- [ ] All environment variables/configs are correct

## Updating the Deployment

When you make changes to your app:

1. **Build again**: `npm run build`
2. **Upload new files** from `dist/` folder
3. **Clear browser cache** or do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Notes

- The build process optimizes and minifies your code for production
- Source maps are disabled by default for smaller file sizes
- All assets are bundled and optimized
- The app uses React Router, so `.htaccess` is essential for proper routing

---

**Need Help?** If you encounter issues, check:
1. Hostinger documentation
2. Browser console for errors
3. Firebase console for authentication issues
4. Hostinger support for server configuration issues
