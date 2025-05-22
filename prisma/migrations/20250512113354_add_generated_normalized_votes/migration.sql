-- First drop the existing trigger that might be using these functions
DROP TRIGGER IF EXISTS normalize_weights_trigger ON "Vote";

-- Drop existing functions for clean recreation
DROP FUNCTION IF EXISTS update_normalized_weights();
DROP FUNCTION IF EXISTS json_normalize_weights(jsonb, integer);

-- Recreate the normalize weights function with IMMUTABLE
CREATE OR REPLACE FUNCTION json_normalize_weights(weight_distribution JSONB, voting_power INTEGER)
RETURNS JSONB AS $$
DECLARE
  total NUMERIC := 0;
  weight NUMERIC;
  key TEXT;
  normalized_weights JSONB := '{}'::JSONB;
  normalized_total NUMERIC := 0;
  diff INTEGER;
  first_nonzero_key TEXT := NULL;
BEGIN
  -- First check if input is a valid JSON object
  IF weight_distribution IS NULL OR jsonb_typeof(weight_distribution) != 'object' THEN
    -- Return empty object if input is not a valid object
    RETURN '{}'::JSONB;
  END IF;

  -- Calculate total weights
  FOR key, weight IN SELECT * FROM jsonb_each_text(weight_distribution)
  LOOP
    total := total + weight::NUMERIC;
  END LOOP;
  
  -- If total is 0 or already equals target, return original
  IF total = 0 OR total = voting_power THEN
    RETURN weight_distribution;
  END IF;
  
  -- Normalize each weight
  FOR key, weight IN SELECT * FROM jsonb_each_text(weight_distribution)
  LOOP
    -- Formula: normalizedValue = (weightValue / sumOfAllWeights) * voting_power
    -- Round to integer to avoid fractional weights
    normalized_weights := normalized_weights || 
      jsonb_build_object(key, ROUND((weight::NUMERIC / total) * voting_power));
      
    -- Keep track of first non-zero value to adjust if necessary
    IF first_nonzero_key IS NULL AND weight::NUMERIC > 0 THEN
      first_nonzero_key := key;
    END IF;
  END LOOP;
  
  -- Check if rounding caused total to drift from target
  SELECT SUM(value::NUMERIC) INTO normalized_total FROM jsonb_each_text(normalized_weights);
  
  IF normalized_total != voting_power AND first_nonzero_key IS NOT NULL THEN
    diff := voting_power - normalized_total;
    normalized_weights := jsonb_set(
      normalized_weights, 
      ARRAY[first_nonzero_key], 
      to_jsonb((normalized_weights->>first_nonzero_key)::NUMERIC + diff)
    );
  END IF;
  
  RETURN normalized_weights;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Make sure calculate_normalized_quadratic_weights is immutable
DROP FUNCTION IF EXISTS calculate_normalized_quadratic_weights(jsonb);

CREATE OR REPLACE FUNCTION calculate_normalized_quadratic_weights(weights JSONB)
RETURNS JSONB AS $$
DECLARE
  weight NUMERIC;
  key TEXT;
  quadratic_weights JSONB := '{}'::JSONB;
BEGIN
  -- Calculate quadratic weights for each value
  FOR key, weight IN SELECT * FROM jsonb_each_text(weights)
  LOOP
    -- Formula: quadraticWeight = sqrt(weight)
    quadratic_weights := quadratic_weights || 
      jsonb_build_object(key, ROUND(SQRT(weight::NUMERIC), 2));
  END LOOP;
  
  RETURN quadratic_weights;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Only drop and recreate the columns we're interested in
ALTER TABLE "Vote" DROP COLUMN IF EXISTS "normalizedWeightDistribution";
ALTER TABLE "Vote" DROP COLUMN IF EXISTS "normalizedQuadraticWeights";

-- Add generated columns
ALTER TABLE "Vote" ADD COLUMN "normalizedWeightDistribution" JSONB 
  GENERATED ALWAYS AS (json_normalize_weights("weightDistribution", "votingPower")) STORED;
  
ALTER TABLE "Vote" ADD COLUMN "normalizedQuadraticWeights" JSONB 
  GENERATED ALWAYS AS (calculate_normalized_quadratic_weights(json_normalize_weights("weightDistribution", "votingPower"))) STORED;

-- Comment explaining usage
COMMENT ON FUNCTION json_normalize_weights IS 
  'Normalizes a JSON weight distribution so values sum to the specified voting power. 
   Usage: SELECT json_normalize_weights(''{"option1": 10, "option2": 15}'', 100)
   Returns: {"option1": 40, "option2": 60}';

COMMENT ON FUNCTION calculate_normalized_quadratic_weights IS
  'Calculates quadratic weights from linear weights.
   Usage: SELECT calculate_normalized_quadratic_weights(''{"option1": 40, "option2": 60}'')
   Returns: {"option1": 6.32, "option2": 7.75}'; 