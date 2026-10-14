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
# its foreign keys would fail to re-add. restore-master-db.sql, run in the
# same transaction, deletes the orphans and checks every key again.
{
   sed -E '/^    ADD CONSTRAINT .* FOREIGN KEY .*;$/ s/;$/ NOT VALID;/' "$dump"
   cat "$(dirname "$0")/restore-master-db.sql"
} | docker exec -i "$db" psql -q -o /dev/null -1 -v ON_ERROR_STOP=1 \
   -v origin="$origin" -U strapi strapi

echo "Copied $master_db into $db."
