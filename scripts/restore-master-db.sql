-- Runs after master's dump, inside the same `psql -1` transaction, so if
-- any statement fails the branch database is left empty and Strapi seeds
-- it from scratch as before. pg_dump empties search_path, hence `public.`.

-- Master's tokens and sessions stay on master. Strapi creates the usual
-- admin from ADMIN_PASS when admin_users is empty. Every created_by and
-- updated_by foreign key is ON DELETE SET NULL.
DELETE FROM public.strapi_api_tokens;
DELETE FROM public.strapi_transfer_tokens;
DELETE FROM public.strapi_sessions;
DELETE FROM public.admin_users;

-- Files master stored on its own disk are served from master, which is
-- what the crawler seed writes too.
UPDATE public.files SET url = :'origin' || url WHERE url LIKE '/%';
UPDATE public.files
SET formats = replace(formats::text, '"url": "/uploads/', '"url": "' || :'origin' || '/uploads/')::jsonb
WHERE formats::text LIKE '%"url": "/uploads/%';

-- Orphan rows. Strapi stores relations and components in link tables
-- (`*_lnk`, `*_cmps`). Master has rows there whose target was deleted:
-- 9,920 across 40 tables on 2026-10-14, e.g. 6,611 in
-- product_lists_parent_lnk pointing at product_lists rows that no longer
-- exist. They're invisible in the API, but publishing a record copies its
-- link rows, and a copied orphan fails its foreign key (a 500 in the
-- admin). The dump's foreign keys were added NOT VALID above so the dump
-- could load at all.
--
-- For each of those keys: delete the rows whose target doesn't exist,
-- then VALIDATE the key. VALIDATE is Postgres checking every remaining
-- row, so if this deleted too little the transaction fails and rolls
-- back; it can't leave a database with broken keys. It only deletes rows
-- whose target is already gone, which nothing can read.
DO $$
DECLARE c record; n bigint; total bigint := 0;
BEGIN
  FOR c IN
    SELECT con.conname, con.conrelid::regclass AS tbl, con.confrelid::regclass AS ref,
           a.attname AS col, af.attname AS refcol
    FROM pg_constraint con
    JOIN pg_attribute a  ON a.attrelid = con.conrelid  AND a.attnum = con.conkey[1]
    JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = con.confkey[1]
    WHERE con.contype = 'f' AND NOT con.convalidated AND array_length(con.conkey, 1) = 1
  LOOP
    EXECUTE format('DELETE FROM %s t WHERE t.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %s r WHERE r.%I = t.%I)',
                   c.tbl, c.col, c.ref, c.refcol, c.col);
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
  RAISE NOTICE 'orphan rows removed: %', total;
END $$;
