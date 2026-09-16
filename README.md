# Inasta

A small social app built around **circles**: every post has one explicit audience, and
members of one circle can't see that the others exist. No algorithm, no public profile,
no discovery page.

```
backend/   Express + MongoDB API (auth, posts, messages, groups)
webapp/    React web client
mobile/    Expo / React Native client
```

## Running locally

### 1. API

```bash
cd backend
npm install
npm run dev          # real MongoDB, uses MONGO_URI from .env
```

If your IP isn't whitelisted on the Atlas cluster (or you just want to click through the
UI without a database), use the in-memory stand-in instead. It implements the same routes
and payload shapes:

```bash
npm run dev:mock     # seeded login: ada@inasta.app / password123
```

Both listen on `http://0.0.0.0:5000`.

### 2. Web client

```bash
cd webapp
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to the backend on port 5000, so the
browser only ever talks to its own origin. To point the client at an API on a different
host, set `VITE_API_URL`:

```bash
VITE_API_URL=https://api.example.com npm run dev
```

`npm run web` (Expo) still works if you prefer the Expo toolchain.

### 3. Mobile client

```bash
cd mobile
npm install
npx expo start
```

## ⚠️ Before this goes anywhere public

`backend/.env` is **committed to this repository** with a live MongoDB Atlas password and
the JWT signing secret. Anyone who can read the repo can read and delete the database.

1. Rotate the Atlas password and the `JWT_SECRET`.
2. `git rm --cached backend/.env` and add `.env` to `.gitignore`.
3. Purge it from history (`git filter-repo` or BFG) — removing the file in a new commit
   does not remove it from earlier ones.

`backend/node_modules/` is also committed (~30 MB, ~3000 files). It should be ignored and
restored with `npm ci` instead.

## Known gaps

The UI currently renders ahead of the API in a few places — these are the next things to
build server-side:

| Feature | Status |
| --- | --- |
| Likes | Local state only; no `POST /api/posts/:id/like` endpoint |
| Comments | Local state only; `Post.comments` exists in the schema but has no route |
| Saved posts | Local state only; no schema field |
| Follow | Not wired to `User.followers` / `User.following` |
| Circle privacy | **`GET /api/posts` does not filter by membership** — the `circle` query is a label, not an access check. Any authenticated user can read any circle by passing its name. |
| Feed auth | `GET /api/posts` has no `auth` middleware at all |

The last two are the product's core promise, so they're the highest-value work left.
