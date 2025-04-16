-- Add search vector column
ALTER TABLE "Poll" ADD COLUMN "searchVector" tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION poll_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to update search vector
CREATE TRIGGER poll_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Poll"
  FOR EACH ROW
  EXECUTE FUNCTION poll_search_vector_update();

-- Update existing records
UPDATE "Poll" SET "searchVector" = NULL; 