#!/bin/bash
#
# Copies master's Strapi database into a new preview, so Strapi finds content
# and skips its crawler seed, which takes about 13 minutes. Run it from the
# branch's compose directory before the rest of the deploy:
#
#   restore-master-db.sh <branch handle> <master handle> <master origin>
#
# It starts only the branch's Postgres. It copies nothing, and exits 0, when
# master's Postgres isn't running, master's Strapi isn't answering (it may
# still be seeding), or the branch database already has tables (a redeploy). The copy runs as one transaction, so a failure leaves the
# database empty and Strapi seeds it as before.
set -euo pipefail

handle=$1
master_db=$2-postgres-1
origin=$3
db=$handle-postgres-1

docker compose -p "$handle" up -d postgres

# Over TCP, not the socket: on first boot the entrypoint's temporary server
# answers on the socket while it creates the database, then restarts.
tries=0
until docker exec "$db" pg_isready -q -h localhost -U strapi; do
   if ((++tries >= 60)); then
      echo "$db still isn't accepting connections after 60 seconds" >&2
      exit 1
   fi
   sleep 1
done

if [ "$(docker inspect -f '{{.State.Running}}' "$master_db" 2>/dev/null)" != true ]; then
   echo "$master_db isn't running, so Strapi will seed from scratch."
   exit 0
fi

# Strapi seeds before it starts listening, so a master that answers has
# finished seeding. A copy taken mid-seed would have some content, and the
# branch's Strapi would then skip its own seed and stay partial for good.
if ! curl -fsS --max-time 10 -o /dev/null "$origin/_health"; then
   echo "$origin isn't answering its health check, so Strapi will seed from scratch."
   exit 0
fi

tables=$(docker exec "$db" psql -U strapi -tAc \
   "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'" strapi)
if [ "$tables" != 0 ]; then
   echo "$db already has tables, keeping them."
   exit 0
fi

echo "Copying $master_db into $db.."
# To a file first: if pg_dump dies halfway, a pipe would hand psql a
# truncated dump that might still commit. The dump holds password hashes.
dump=$(mktemp)
trap 'rm -f "$dump"' EXIT
docker exec "$master_db" pg_dump -U strapi --no-owner strapi >"$dump"

# NOT VALID: master has orphan rows in its link and component tables, so
# its foreign keys would fail to re-add. The SQL below deletes the orphans
# and validates them. pg_dump empties search_path, hence `public.`.
{
   sed -E '/^    ADD CONSTRAINT .* FOREIGN KEY .*;$/ s/;$/ NOT VALID;/' "$dump"
   cat <<'SQL'
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
SQL
} | docker exec -i "$db" psql -q -o /dev/null -1 -v ON_ERROR_STOP=1 \
   -v origin="$origin" -U strapi strapi

echo "Copied $master_db into $db."
