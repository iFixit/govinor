-- Runs after master's dump, inside the same `psql -1` transaction, so if
-- any statement fails the branch database is left empty and Strapi seeds
-- it from scratch as before. pg_dump empties search_path, hence `public.`.

-- API tokens come along: Next.js sends master's token with every content
-- query, and Strapi rejects a token it doesn't know rather than answering
-- as the public role. They still validate here because every deploy's
-- .env, master's included, is a copy of the same .env.example, so
-- API_TOKEN_SALT matches.
-- Transfer tokens and sessions stay on master. Strapi creates the usual
-- admin from ADMIN_PASS when admin_users is empty. Every created_by and
-- updated_by foreign key is ON DELETE SET NULL.
DELETE FROM public.strapi_transfer_tokens;
DELETE FROM public.strapi_sessions;
DELETE FROM public.admin_users;
-- Accounts registered on master's Strapi (public registration is on) stay
-- on master too, password hashes included.
DELETE FROM public.up_users;

-- Files master stored on its own disk are served from master, which is
-- what the crawler seed writes too.
UPDATE public.files SET url = :'origin' || url WHERE url LIKE '/%';
UPDATE public.files
SET formats = replace(formats::text, '"url": "/uploads/', '"url": "' || :'origin' || '/uploads/')::jsonb
WHERE formats::text LIKE '%"url": "/uploads/%';
