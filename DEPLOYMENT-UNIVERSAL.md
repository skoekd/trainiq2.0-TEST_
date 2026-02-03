# TRAINIQ 2.0 - DEPLOYMENT GUIDE

## ✅ Your Setup

**Supabase:** ✅ Configured and connected  
**Table:** `user_data` (existing table)  
**Hosting:** Not Netlify (Vercel, GitHub Pages, or other)

---

## 🚀 Deploy to Any Platform

### Option 1: Vercel (Recommended - FREE)

1. **Go to:** https://vercel.com
2. **Sign up** with GitHub
3. **New Project** → Import from GitHub
4. **Select** your TrainIQ repository
5. **Framework Preset:** Select "Other" or "Static Site"
6. **Root Directory:** Leave empty (or set to folder with index.html)
7. **Build Settings:**
   - Build Command: (leave empty)
   - Output Directory: (leave empty or `.`)
8. **Deploy!**

Vercel automatically serves `index.html` and handles SPA routing.

### Option 2: GitHub Pages (FREE)

1. **Go to** your GitHub repository
2. **Settings** → **Pages**
3. **Source:** Deploy from branch
4. **Branch:** Select `main` (or `master`)
5. **Folder:** `/ (root)`
6. **Save**

Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

**Note:** May need to add `<base href="/YOUR-REPO/">` to index.html head for proper routing.

### Option 3: Cloudflare Pages (FREE)

1. **Go to:** https://pages.cloudflare.com
2. **Create project** → Connect to Git
3. **Select** your repository
4. **Build settings:**
   - Build command: (leave empty)
   - Build output: (leave empty or `/`)
5. **Deploy**

### Option 4: Static Hosting (Any Provider)

Upload these files to any static hosting:
- Amazon S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- DigitalOcean App Platform
- Firebase Hosting

**Requirements:**
- Serve `index.html` as default
- Enable SPA routing (all routes → index.html)

---

## 📁 Files to Deploy (12 files)

Upload these files to your hosting:

**Core Application:**
1. ✅ `index.html` - Main app
2. ✅ `app.js` - Workout engine
3. ✅ `exercise-database.js` - Exercise library
4. ✅ `utils-fixed.js` - Helper functions

**Cloud Sync (CONFIGURED):**
5. ✅ `supabase-sync.js` - Cloud backup with YOUR credentials

**Configuration:**
6. ✅ `manifest.json` - PWA manifest

**Assets:**
7. ✅ `hero.jpg` - Homepage image
8. ✅ `logo.jpg` - Logo
9. ✅ `ronnie.png` - Icon

**Documentation (optional):**
10. `README-DEPLOYMENT.md`
11. `COMPREHENSIVE-AUDIT.md`
12. `SUPABASE-TABLE-SETUP.md`

---

## ⚙️ SPA Routing Configuration

Your app is a Single Page Application (SPA). All routes must serve `index.html`.

### Vercel
Create `vercel.json`:
```json
{
  "routes": [
    {
      "src": "/[^.]+",
      "dest": "/",
      "status": 200
    }
  ]
}
```

### Cloudflare Pages
Create `_redirects`:
```
/*    /index.html   200
```

### GitHub Pages
Add to repository root `.nojekyll` file (empty file, no content)

### Apache (.htaccess)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Nginx (nginx.conf)
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 🧪 Test After Deployment

1. **Visit your deployed URL**
2. **Select:** Intermediate, 4 days, Hypertrophy
3. **Click "Generate Program"**
4. **Verify:** 12 weeks appear ✅
5. **Click "⬆️ Save to Cloud"**
6. **Verify:** Success message ✅
7. **Check Supabase Table:**
   - Go to Table Editor
   - See new row in `user_data` ✅
8. **Click "⬇️ Load to Device"**
9. **Verify:** Program reloads ✅

---

## 🔧 Troubleshooting

### Issue: 404 on page refresh
**Cause:** SPA routing not configured  
**Fix:** Add routing config for your platform (see above)

### Issue: Cloud sync not working
**Cause:** Supabase credentials or table name mismatch  
**Fix:** 
- Verify credentials in `supabase-sync.js`
- Confirm table is named `user_data`
- Check browser console for errors

### Issue: Assets not loading (images missing)
**Cause:** Base path incorrect  
**Fix:** If deploying to subdirectory, add to `<head>`:
```html
<base href="/your-subdirectory/">
```

---

## ✅ Cloud Sync Configuration

**Status:** ✅ ALREADY CONFIGURED

Your cloud sync is set up to use:
- **Table:** `user_data` (your existing table)
- **Key column:** `key_name` (stores `trainiq:PROFILE_ID`)
- **Data column:** `Content` (stores program data as JSONB)

**No changes needed to Supabase!** Your existing table structure works perfectly.

---

## 🎉 You're Ready!

Pick your hosting platform and deploy. Your app will work on any static host!

**Recommended:** Vercel (easiest, automatic HTTPS, global CDN, zero config)
