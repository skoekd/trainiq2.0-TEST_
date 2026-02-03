# SUPABASE TABLE SETUP

## Step 1: Go to SQL Editor

Visit: https://supabase.com/dashboard/project/mujacewgojnbgbtxovkw/sql/new

## Step 2: Run This SQL

Copy and paste this entire SQL block, then click "Run":

```sql
-- Create the main table for storing TrainIQ programs
CREATE TABLE IF NOT EXISTS trainiq_data (
    id BIGSERIAL PRIMARY KEY,
    profile_id TEXT UNIQUE NOT NULL,
    state_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE trainiq_data ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write (simple public access)
-- For production, you'd want authentication-based policies
CREATE POLICY "Allow public access" ON trainiq_data
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_id ON trainiq_data(profile_id);

-- Add comments for documentation
COMMENT ON TABLE trainiq_data IS 'Stores TrainIQ workout programs by profile ID';
COMMENT ON COLUMN trainiq_data.profile_id IS 'Unique identifier for each user profile';
COMMENT ON COLUMN trainiq_data.state_data IS 'Complete program state (config, workouts, history)';
```

## Step 3: Verify Table Created

After running the SQL:
1. Go to Table Editor: https://supabase.com/dashboard/project/mujacewgojnbgbtxovkw/editor
2. You should see `trainiq_data` table
3. Columns: id, profile_id, state_data, created_at, updated_at

## Step 4: Test Cloud Sync

1. Deploy your app with the updated `supabase-sync.js`
2. Generate a program in TrainIQ
3. Click "⬆️ Save to Cloud"
4. Should see success message
5. Go to Supabase Table Editor
6. Verify your data appears in `trainiq_data` table

## Troubleshooting

### "relation trainiq_data does not exist"
- SQL didn't run successfully
- Re-run the SQL above

### "permission denied"
- Row Level Security policy not applied
- Re-run the POLICY creation SQL

### "duplicate key value"
- You're trying to save with same profile_id
- This is fine - it will UPDATE instead of INSERT

## Security Notes

**Current setup:** Public read/write (anyone can access any profile)

**For production:** Add authentication:
```sql
-- Drop public policy
DROP POLICY "Allow public access" ON trainiq_data;

-- Add auth-based policy
CREATE POLICY "Users can manage own data" ON trainiq_data
    FOR ALL 
    USING (auth.uid()::text = profile_id)
    WITH CHECK (auth.uid()::text = profile_id);
```

Then integrate Supabase Auth in your app.

## Done! ✅

Your cloud sync is now fully configured and ready to use.
