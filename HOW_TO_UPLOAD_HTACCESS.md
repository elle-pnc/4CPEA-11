# How to Upload .htaccess File to Hostinger

The `.htaccess` file is a **hidden file** (starts with a dot), which can make it difficult to see or upload. Here are several methods to upload it:

## Method 1: Upload as `htaccess.txt` then Rename (Easiest)

1. **I've created a file called `htaccess.txt`** in your project root - this is the same content but with a visible name.

2. **Upload `htaccess.txt`** to Hostinger's `public_html/` folder using:
   - **File Manager**: Upload `htaccess.txt`
   - **FTP Client**: Upload `htaccess.txt`

3. **Rename it to `.htaccess`**:
   - **In File Manager**: Right-click `htaccess.txt` → Rename → Change to `.htaccess`
   - **In FTP Client**: Right-click `htaccess.txt` → Rename → Change to `.htaccess`
   - **Via Terminal/SSH** (if you have access):
     ```bash
     cd public_html
     mv htaccess.txt .htaccess
     ```

## Method 2: Show Hidden Files in File Manager

### Hostinger File Manager:
1. Look for a **"Show Hidden Files"** or **"View Options"** button
2. Enable it to see files starting with a dot (`.`)
3. Upload `.htaccess` normally

### FTP Client (FileZilla, Cyberduck, etc.):
1. **FileZilla**: 
   - Go to **Server** → **Force showing hidden files**
   - Or press `Ctrl+H` (Windows) / `Cmd+Shift+.` (Mac)

2. **Cyberduck**:
   - Go to **View** → **Show Hidden Files**

3. **Other FTP clients**: Look for "Show Hidden Files" in View/Settings menu

## Method 3: Create .htaccess Directly on Server

### Using Hostinger File Manager:
1. Navigate to `public_html/` folder
2. Click **"New File"** or **"Create File"**
3. Name it exactly: `.htaccess` (with the dot at the beginning)
4. Paste the contents from `htaccess.txt` or `.htaccess` file
5. Save

### Using FTP Client:
1. Connect to your server
2. Navigate to `public_html/`
3. Right-click → **Create New File**
4. Name it: `.htaccess`
5. Open it in a text editor, paste the contents, save

## Method 4: Copy Content Manually

1. **Open `htaccess.txt`** from your project (it's visible, not hidden)
2. **Copy all the content**
3. **In Hostinger File Manager**:
   - Go to `public_html/`
   - Click "New File"
   - Name it `.htaccess`
   - Paste the content
   - Save

## Verify It's Uploaded Correctly

After uploading, verify:

1. **File exists**: Check that `.htaccess` is in `public_html/` (root directory)
2. **File name is correct**: Must be exactly `.htaccess` (with the dot, no extension)
3. **File permissions**: Should be `644` (readable by web server)

## Quick Checklist

- [ ] Uploaded `htaccess.txt` OR created `.htaccess` directly on server
- [ ] Renamed to `.htaccess` (if uploaded as `htaccess.txt`)
- [ ] File is in `public_html/` root directory (same level as `index.html`)
- [ ] File permissions are correct (644)
- [ ] Content matches the original file

## Important Notes

- The file **MUST** be named exactly `.htaccess` (with the leading dot)
- It **MUST** be in the root directory (`public_html/`) where `index.html` is located
- If you're using a subdirectory, place it in that subdirectory's root
- The file is case-sensitive: `.htaccess` not `.HTACCESS` or `.Htaccess`

## After Uploading

1. **Test your site**: Visit your domain and try navigating to routes like `/login`, `/dashboard`
2. **Check for errors**: If you see 500 errors, there might be a syntax issue - check Hostinger error logs
3. **Verify mod_rewrite**: Contact Hostinger support to ensure `mod_rewrite` is enabled

---

**Tip**: The easiest method is **Method 1** - upload `htaccess.txt`, then rename it to `.htaccess` on the server. This avoids any issues with hidden files.
