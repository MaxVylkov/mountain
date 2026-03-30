-- Step 1: remove duplicate routes (keep the one with the longest description)
DELETE FROM routes
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY mountain_id, name
        ORDER BY LENGTH(COALESCE(description, '')) DESC, created_at ASC
      ) AS rn
    FROM routes
  ) ranked
  WHERE rn > 1
);

-- Step 2: reassign routes from duplicate mountains to the original
UPDATE routes r
SET mountain_id = keep.id
FROM (
  SELECT DISTINCT ON (name) id, name
  FROM mountains
  ORDER BY name, created_at ASC
) keep
JOIN mountains dup ON dup.name = keep.name AND dup.id != keep.id
WHERE r.mountain_id = dup.id;

-- Step 3: remove duplicate mountains (keep the earliest created)
DELETE FROM mountains
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) AS rn
    FROM mountains
  ) ranked
  WHERE rn > 1
);
