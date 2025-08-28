-- Add NOT NULL constraints and check constraints for required fields in songs table
-- This will prevent songs from being created without required data

-- First, update any existing songs that might have null or empty values
UPDATE songs 
SET 
  title = COALESCE(NULLIF(title, ''), 'Título não definido'),
  artist = COALESCE(NULLIF(artist, ''), 'Artista não definido'),
  content = COALESCE(NULLIF(content, ''), 'Conteúdo não definido')
WHERE title IS NULL OR title = '' OR artist IS NULL OR artist = '' OR content IS NULL OR content = '';

-- Update songs with null genre to have a default value
UPDATE songs 
SET genre = 'Não definido'
WHERE genre IS NULL OR genre = '';

-- Now add the constraints
ALTER TABLE songs 
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN artist SET NOT NULL,
ALTER COLUMN genre SET NOT NULL,
ALTER COLUMN content SET NOT NULL;

-- Add check constraints to ensure fields are not empty strings
ALTER TABLE songs 
ADD CONSTRAINT songs_title_not_empty CHECK (length(trim(title)) > 0),
ADD CONSTRAINT songs_artist_not_empty CHECK (length(trim(artist)) > 0),
ADD CONSTRAINT songs_genre_not_empty CHECK (length(trim(genre)) > 0),
ADD CONSTRAINT songs_content_not_empty CHECK (length(trim(content)) > 0);