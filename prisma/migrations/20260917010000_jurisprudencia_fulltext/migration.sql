-- Migration: full-text search para Jurisprudence
-- Agrega columna, trigger y indice GIN.
-- La columna NO esta en el schema Prisma (es Unsupported).
-- Se maneja todo desde SQL.

-- 1. Agregar columna searchVector
ALTER TABLE "Jurisprudence"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- 2. Funcion que actualiza el tsvector en cada INSERT/UPDATE
CREATE OR REPLACE FUNCTION jurisprudence_search_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW."fullText", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 3. Trigger
DROP TRIGGER IF EXISTS jurisprudence_search_trigger ON "Jurisprudence";
CREATE TRIGGER jurisprudence_search_trigger
  BEFORE INSERT OR UPDATE ON "Jurisprudence"
  FOR EACH ROW EXECUTE FUNCTION jurisprudence_search_update();

-- 4. Indice GIN
DROP INDEX IF EXISTS "Jurisprudence_search_idx";
CREATE INDEX "Jurisprudence_search_idx"
  ON "Jurisprudence"
  USING GIN("searchVector");

-- 5. Populate inicial
UPDATE "Jurisprudence"
SET "searchVector" =
  setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce("fullText", '')), 'C');