-- ============================================================
-- SQL CLEANUP: Clear old heavy image columns after Cloudinary verification
-- EXECUTE ONLY after confirming ALL images are visible in Cloudinary
-- ============================================================

BEGIN;

-- products.image_url: 456 rows
UPDATE "products" SET "image_url" = NULL
WHERE "image_url" IS NOT NULL AND "image_url" != '';

-- product_categories.image_url: 28 rows
UPDATE "product_categories" SET "image_url" = NULL
WHERE "image_url" IS NOT NULL AND "image_url" != '';

COMMIT;

-- Verify no remaining old paths:
SELECT table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%image%' OR column_name ILIKE '%img%' OR column_name ILIKE '%icon%' OR column_name ILIKE '%avatar%' OR column_name ILIKE '%banner%' OR column_name ILIKE '%photo%';