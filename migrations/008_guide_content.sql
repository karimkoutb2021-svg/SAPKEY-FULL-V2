-- Create guide_content table for dynamic guides
CREATE TABLE IF NOT EXISTS guide_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for guide_content
ALTER PUBLICATION supabase_realtime ADD TABLE guide_content;

-- RLS policies
ALTER TABLE guide_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read guides
CREATE POLICY "Anyone can read guides" ON guide_content
  FOR SELECT USING (true);

-- Only authenticated users can update guides
CREATE POLICY "Authenticated users can update guides" ON guide_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guide_content_role ON guide_content(role);
