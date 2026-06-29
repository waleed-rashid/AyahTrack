UPDATE "DailyEntry"
SET "sabaqSaved" = true
WHERE TRIM(COALESCE("sabaq", '')) <> '';

UPDATE "DailyEntry"
SET "sabaqParaSaved" = true
WHERE TRIM(COALESCE("sabaqPara", '')) <> '';

UPDATE "DailyEntry"
SET "manzilSaved" = true
WHERE TRIM(COALESCE("manzil", '')) <> '';
