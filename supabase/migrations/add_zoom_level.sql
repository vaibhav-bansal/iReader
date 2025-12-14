-- Add zoom_level column to reading_progress table
ALTER TABLE reading_progress 
ADD COLUMN IF NOT EXISTS zoom_level FLOAT DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN reading_progress.zoom_level IS 'User preferred zoom level for the book (scale factor, e.g., 1.5 = 150%)';

