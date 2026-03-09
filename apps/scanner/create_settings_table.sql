-- Create settings table for storing scanner configuration
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  telemetry_enabled BOOLEAN NOT NULL DEFAULT true,
  gemini_enabled BOOLEAN NOT NULL DEFAULT false,
  retention_days INTEGER NOT NULL DEFAULT 7 CHECK (retention_days >= 1 AND retention_days <= 365),
  max_pages INTEGER NOT NULL DEFAULT 200 CHECK (max_pages >= 1 AND max_pages <= 500),
  max_depth INTEGER NOT NULL DEFAULT 10 CHECK (max_depth >= 1 AND max_depth <= 20),
  max_runtime_minutes INTEGER NOT NULL DEFAULT 10 CHECK (max_runtime_minutes >= 1 AND max_runtime_minutes <= 120),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_settings_row CHECK (id = 1)
);

-- Insert default settings
INSERT INTO settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Create index for faster lookups (though there's only one row)
CREATE INDEX IF NOT EXISTS idx_settings_id ON settings(id);

COMMENT ON TABLE settings IS 'Global scanner configuration settings (single row)';
COMMENT ON COLUMN settings.max_pages IS 'Maximum pages to scan per website';
COMMENT ON COLUMN settings.max_depth IS 'Maximum crawl depth from seed URL';
COMMENT ON COLUMN settings.max_runtime_minutes IS 'Maximum scan runtime in minutes';
