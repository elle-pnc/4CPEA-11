# Fixing 404 Errors on Hostinger

If you're seeing 404 errors for routes like `/login` or other React Router paths, follow these steps:

## Issue
The server is trying to find actual files/directories for routes like `/login`, `/dashboard`, etc., but these are React Router client-side routes that don't exist as physical files.

## Solution

### 1. Verify .htaccess File is Uploaded

Make sure the `.htaccess` file is in your `public_html/` directory on Hostinger. The file should be at the root level (same location as `index.html`).

### 2. Check File Permissions

The `.htaccess` file should have proper permissions:
- **Recommended**: `644` or `644` (readable by web server)
- You can set this via File Manager or FTP client

### 3. Verify mod_rewrite is Enabled

Contact Hostinger support to ensure `mod_rewrite` is enabled on your server. This is required for the `.htaccess` rewrite rules to work.

### 4. Test .htaccess

You can test if `.htaccess` is working by:

1. **Temporarily add a test rule** at the top of `.htaccess`:
   ```apache
   # Test rule - remove after testing
   Redirect 301 /test.html /index.html
   ```

2. Visit `yourdomain.com/test.html` - it should redirect to the homepage

3. **Remove the test rule** after confirming it works

### 5. Alternative .htaccess Configuration

If the current `.htaccess` doesn't work, try this simpler version:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

### 6. Check for Subdirectory Installation

If your app is installed in a subdirectory (e.g., `public_html/myapp/`), you need to:

1. **Update `vite.config.js`** to set the base path:
   ```js
   build: {
     base: '/myapp/', // Change to your subdirectory
     // ... rest of config
   }
   ```

2. **Update `.htaccess`** RewriteBase:
   ```apache
   RewriteBase /myapp/
   ```

3. **Rebuild** the app: `npm run build`

### 7. Verify Build Output

After building, check that:
- `dist/index.html` exists
- `dist/assets/` folder contains JS and CSS files
- `.htaccess` is in the `dist/` folder

### 8. Clear Browser Cache

Sometimes cached files cause issues:
- **Chrome/Edge**: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- **Firefox**: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- Or use **Incognito/Private mode** to test

### 9. Check Browser Console

Open Developer Tools (F12) and check:
- **Console tab**: For JavaScript errors
- **Network tab**: To see which files are failing to load (404 errors)

### 10. Verify File Paths

Make sure all files are uploaded correctly:
```
public_html/
├── index.html
├── .htaccess
├── register.html
├── driver-simulation.html
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── [other asset files]
```

## Common Issues

### Issue: "404 Not Found" for all routes
**Solution**: `.htaccess` is not working or not uploaded. Verify file exists and `mod_rewrite` is enabled.

### Issue: Assets (JS/CSS) return 404
**Solution**: Check that the `assets/` folder was uploaded correctly. Verify file paths in `index.html` match actual files.

### Issue: Routes work on first load but fail on refresh
**Solution**: This is the exact issue `.htaccess` fixes. Make sure it's properly configured and uploaded.

### Issue: "Internal Server Error" (500)
**Solution**: There might be a syntax error in `.htaccess`. Check Hostinger error logs or try a simpler `.htaccess` configuration.

## Testing Checklist

- [ ] `.htaccess` file is in `public_html/` root
- [ ] File permissions are correct (644)
- [ ] `mod_rewrite` is enabled on server
- [ ] All files from `dist/` are uploaded
- [ ] Browser cache is cleared
- [ ] Test in incognito/private mode
- [ ] Check browser console for errors
- [ ] Verify Firebase domain is authorized

## Still Having Issues?

1. **Contact Hostinger Support**: Ask them to verify `mod_rewrite` is enabled
2. **Check Error Logs**: Look in Hostinger's error log section for specific errors
3. **Test with Simple .htaccess**: Try the minimal version above
4. **Verify Build**: Rebuild locally and re-upload all files

---

**Note**: The updated `.htaccess` file in your project root should now be more robust and handle these cases better. Make sure to rebuild (`npm run build`) and re-upload the new `dist/` folder contents.
