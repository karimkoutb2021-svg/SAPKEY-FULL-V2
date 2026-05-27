-- Branding settings table for real-time sync
-- Stores all branding config fields including admin access code
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read branding settings (public config)
CREATE POLICY "Branding settings are publicly readable"
  ON branding_settings FOR SELECT
  USING (true);

-- Allow authenticated users to update branding settings
CREATE POLICY "Authenticated users can update branding settings"
  ON branding_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branding_settings_key ON branding_settings(key);
