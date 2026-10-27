# Sir's Desk: class feed (Cloudflare Pages + Functions + KV)

Posts and files live in one KV namespace. Every key is written with a 15-day expiry, so Cloudflare deletes them on its own.

## Folders
- `public/`: what the browser loads. `index.html` is the student feed, `admin.html` is Sir's page, `style.css` is shared.
- `functions/api/`: the backend. `login.js` checks the password, `posts.js` lists and creates posts, `posts/[id].js` deletes, `file/[id].js` serves images and PDFs.
- `lib/auth.js`: login check and signed 12-hour session token (shared by the functions).
- `wrangler.toml`: tells Cloudflare about the KV binding for local runs.
- `.dev.vars.example`: copy to `.dev.vars` for local testing only.

## Deploy
1. Cloudflare dashboard → Storage & Databases → KV → Create namespace (name it `class-feed`).
2. Push this folder to a GitHub repo.
3. Workers & Pages → Create → Pages → connect the repo. Build command: none. Output directory: `public`.
4. Project → Settings → Bindings → add KV namespace, variable name exactly `POSTS`, pick `class-feed`.
5. Settings → Variables and Secrets → add secrets `ADMIN_USER`, `ADMIN_PASS`, `SESSION_SECRET` (32+ random characters).
6. Redeploy once so the binding and secrets apply.
7. Visit `/admin.html`, sign in, post one of each type, and check the feed on your phone.

Local test: `cp .dev.vars.example .dev.vars`, put your KV id in `wrangler.toml`, then `npx wrangler pages dev public`.
