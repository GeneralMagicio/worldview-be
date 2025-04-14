-- Create a function to calculate quadratic weights from the weight distribution
CREATE OR REPLACE FUNCTION calculate_quadratic_weights(weight_dist JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  option_key TEXT;
  weight_value NUMERIC;
BEGIN
  -- Check if weight_dist is NULL or not an object
  IF weight_dist IS NULL OR jsonb_typeof(weight_dist) != 'object' THEN
    RETURN '{}'::JSONB;
  END IF;

  FOR option_key, weight_value IN
    SELECT key, (value::text)::NUMERIC
    FROM jsonb_each(weight_dist)
  LOOP
    -- Handle potential non-numeric values
    BEGIN
      result := result || jsonb_build_object(option_key, SQRT(weight_value));
    EXCEPTION WHEN others THEN
      -- If conversion fails, skip this entry
      CONTINUE;
    END;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add the generated column to the Vote table
ALTER TABLE "Vote" ADD COLUMN "quadraticWeights" JSONB
  GENERATED ALWAYS AS (calculate_quadratic_weights("weightDistribution"::JSONB)) STORED;