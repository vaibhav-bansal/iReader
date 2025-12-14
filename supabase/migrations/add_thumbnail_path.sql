-- Add thumbnail_path column to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Add index for thumbnail_path queries (optional, but can help with performance)
CREATE INDEX IF NOT EXISTS books_thumbnail_path_idx ON books(thumbnail_path) WHERE thumbnail_path IS NOT NULL;

