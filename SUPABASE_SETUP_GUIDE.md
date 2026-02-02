# Supabase Cloud Sync Setup - 100% FREE (No Credit Card!)

This guide shows you how to set up cloud sync using Supabase instead of Firebase.
**NO CREDIT CARD REQUIRED!**

---

## Why Supabase?

- ✅ **100% FREE** - Never asks for payment info
- ✅ **No credit card** required on free tier
- ✅ **500MB database** storage
- ✅ **2GB bandwidth** per month
- ✅ **50,000 monthly active users**
- ✅ **Google Sign-In** included
- ✅ **PostgreSQL** (more powerful than Firebase)

---

## Step 1: Create Supabase Account (2 minutes)

1. Go to **https://supabase.com/**
2. Click **"Start your project"**
3. Sign up with GitHub (easiest) or email
4. Verify your email if needed

---

## Step 2: Create New Project (3 minutes)

1. Click **"New project"**
2. Choose your organization (or create one)
3. Fill in:
   - **Name:** `trainiq-app`
   - **Database Password:** (generate a strong password - save it!)
   - **Region:** Choose closest to you (e.g., US East, EU West)
   - **Pricing Plan:** FREE (default)
4. Click **"Create new project"**
5. Wait ~2 minutes for setup

---

## Step 3: Get Your API Keys (1 minute)

1. Once project is ready, click **"Settings"** (gear icon, bottom left)
2. Click **"API"** in the settings menu
3. You'll see two important values:

**Copy these:**
- **Project URL:** `https://xxxxx.supabase.co`
- **anon public key:** `eyJhbGc...` (long string)

Keep these handy - you'll need them!

---

## Step 4: Enable Google Authentication (3 minutes)

1. In Supabase dashboard, click **"Authentication"** (left sidebar)
2. Click **"Providers"**
3. Scroll down and find **"Google"**
4. Click to expand it

### Get Google OAuth Credentials:

1. Go to **https://console.cloud.google.com/**
2. Create a new project or select existing
3. Go to **"APIs & Services"** > **"Credentials"**
4. Click **"Create Credentials"** > **"OAuth 2.0 Client ID"**
5. Configure consent screen if needed:
   - User Type: **External**
   - App name: **TrainIQ**
   - User support email: your email
   - Save
6. Create OAuth Client:
   - Application type: **Web application**
   - Name: **TrainIQ Auth**
   - Authorized redirect URIs: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     - (Get this from Supabase - it shows the exact URL)
7. Click **"Create"**
8. Copy **Client ID** and **Client Secret**

### Back in Supabase:

1. Paste **Client ID** and **Client Secret** into Supabase Google provider settings
2. Enable the **"Google enabled"** toggle
3. Click **"Save"**

---

## Step 5: Create Database Table (2 minutes)

1. In Supabase, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Paste this SQL:

```sql
-- Create table for user data
CREATE TABLE user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}'::jsonb,
  program JSONB,
  history JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can manage own data"
  ON user_data
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

---

## Step 6: Update Your App Files (5 minutes)

### 6a. Replace firebase-sync.js with supabase-sync.js

1. In your project, **delete** `firebase-sync.js`
2. **Add** `supabase-sync.js` (from the ZIP I'll give you)

### 6b. Update index.html

**Find this section** (around line 41):
```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script src="firebase-sync.js"></script>
```

**Replace with:**
```html
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-sync.js"></script>
```

### 6c. Update supabase-sync.js with YOUR credentials

Open `supabase-sync.js` and find:
```javascript
const supabaseConfig = {
    url: "YOUR_SUPABASE_URL_HERE",
    anonKey: "YOUR_SUPABASE_ANON_KEY_HERE"
};
```

**Replace with YOUR values from Step 3:**
```javascript
const supabaseConfig = {
    url: "https://xxxxx.supabase.co",
    anonKey: "eyJhbGc..."
};
```

### 6d. Update the Settings screen

The cloud sync UI will work the same, but we need to update the function names.

**Find** in index.html (around line 3520):
```javascript
window.firebaseCloudSync
```

**Replace ALL instances with:**
```javascript
window.supabaseCloudSync
```

(There should be 3-4 instances)

---

## Step 7: Deploy & Test (2 minutes)

1. Commit all changes to GitHub
2. Netlify auto-deploys
3. Open your app
4. Go to **Profile** tab
5. Click **"Sign in with Google"**
6. Authorize the app
7. Generate a program
8. Check on another device!

---

## ✅ You're Done!

Your app now has:
- ✅ Cloud sync across all devices
- ✅ Google Sign-In
- ✅ Auto-sync every 30 seconds
- ✅ **100% FREE forever**
- ✅ **No credit card needed**

---

## Free Tier Limits (Very Generous)

- **500MB database** (~500,000 programs)
- **2GB bandwidth/month** (~10,000 users/month)
- **50,000 monthly active users**
- **Unlimited API requests**

You'd need **thousands of users** before upgrading!

---

## Troubleshooting

### "Supabase not configured"
- Make sure you updated the URL and anonKey in `supabase-sync.js`
- Check browser console for errors

### "Sign-in failed"
- Make sure Google provider is enabled in Supabase
- Check OAuth credentials are correct

### "Permission denied"
- Make sure you ran the SQL to create the table and policies
- User must be signed in

---

## Supabase vs Firebase

| Feature | Supabase | Firebase |
|---------|----------|----------|
| Credit card | ❌ NOT required | ✅ Required (Blaze plan) |
| Free tier | 500MB, 2GB bandwidth | 50k reads, 20k writes |
| Database | PostgreSQL | Firestore |
| Auth | Included | Included |
| Cost at scale | $25/month | $25-50/month |

Both are great, but Supabase is better for **no credit card needed**!

---

**Questions?** Check the Supabase dashboard for real-time usage stats and logs!
