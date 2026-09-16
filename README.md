# Inasta

A small social app built around **circles**: every post has one explicit audience, and
members of one circle can't see that the others exist. No algorithm, no public profile,
no discovery page.

The interface follows WeChat's design language — grey canvas, white cells with hairline
separators, rounded-square avatars, four-tab bottom bar (Chats / Contacts / Discover / Me).

```
backend/   Express + MongoDB API (auth, posts, stories, social, messaging, admin)
webapp/    React web client (Vite)
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
UI without a database), use the offline stand-in instead. It implements the same routes
and payload shapes, and persists to `backend/.mock-data.json`:

```bash
npm run dev:mock
```

Both listen on `http://0.0.0.0:5000`. Delete `backend/.mock-data.json` to reseed.

**Seeded accounts** (mock server, all password `password123`):

| Email | Role | Plan |
| --- | --- | --- |
| `admin@inasta.app` | admin | pro |
| `ada@inasta.app` | user | plus |
| `mira@inasta.app` | user | free |
| `kai@inasta.app` | user | pro |

Run the test suite (no database required — it drives the mock server):

```bash
npm test
```

It covers the things that must not regress: feed authentication, circle
visibility, owner-only circle management, admin authorisation, and that a token
survives a server restart.

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

**Single-origin mode.** `npm run build` emits `webapp/dist`, which the mock server serves
directly (with an SPA fallback) — so the whole app runs on port 5000 with no second
process. Rebuild after any client change; no server restart needed.

### 3. Mobile client

```bash
cd mobile
npm install
npx expo start
```

The API origin is resolved from `EXPO_PUBLIC_API_URL`, then `extra.apiUrl` in
`app.json`, then the Expo dev server's own LAN host — so a physical device
reaches your machine instead of its own localhost. Point it somewhere explicit
with:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:5000 npx expo start
```

## Features

**Posting and privacy** — posts belong to exactly one circle. Visibility is enforced
server-side from circle membership (see below), not from the requested circle name.

**Social** — likes, comments (with delete), saved posts, follow/unfollow, block,
notifications with unread counts, hashtags and mentions, search across users and posts.

**Stories** — 24-hour expiry, tray above the Moments feed, tap-through viewer with timed
progress, one-view snaps destroyed after opening, and screenshot alerts to the author.

**Messaging** — direct and group chats, read receipts, message reactions, disappearing
messages.

**Admin console** — visible in the Me tab to `admin` and `moderator` roles only:

- Monetisation: MRR, ARR, ARPU, paying users, conversion rate, plan mix
  (free ₹0 / plus ₹199 / pro ₹499 per month)
- Users: totals, active today, new today, banned, 14-day signup trend
- Directory: search, change plan and role, verify, ban, delete
  (guarded so the last admin can't be removed)
- Content: moderation grid for removing posts

Non-admins receive `403` from every `/api/admin/*` route.

## How circle privacy works

A `Circle` has an **owner** and an explicit **member list**, and circle names are scoped
to their owner. A post is readable only when the viewer wrote it, or owns or belongs to
the circle it was published to.

`?circle=` is a filter, never an authorization claim — it can only narrow what you are
already allowed to see. Requesting someone else's circle by name returns nothing.

`GET /api/posts` and `GET /api/posts/user/:userId` both require authentication.

## Authentication

Tokens are signed JWTs (30-day expiry) sent as `Authorization: Bearer <token>`.

Some reverse proxies and preview tunnels consume the `Authorization` header for their own
auth, which strips it before it reaches the API. The client therefore also sends the token
as `X-Auth-Token`, and the server accepts either (plus `?token=` as a last resort).

The web client stores sessions through a guarded wrapper with an in-memory fallback, so it
still works when `localStorage` throws — as it does in a cross-origin iframe with
third-party storage blocked.

## ⚠️ Before this goes anywhere public

`backend/.env` was **committed to this repository** with a live MongoDB Atlas password and
the JWT signing secret. It is no longer tracked, but it remains readable in earlier
commits, so those credentials must be treated as public.

1. **Rotate the Atlas password and `JWT_SECRET`.** This is the only step that actually
   revokes them. Rotating `JWT_SECRET` also invalidates every existing session, which is
   the desired outcome after a leak.
2. **Purge the file from history** with `git filter-repo` (preferred) or BFG:

   ```bash
   git filter-repo --path backend/.env --invert-paths --force
   git push --force origin <branch>
   ```

   Removing the file in a new commit does **not** remove it from earlier ones. After a
   purge every commit SHA changes, so any other clone must be re-cloned.
3. Note that `main` still contains the leaked file at its initial commit, and needs the
   same treatment.

Copy `backend/.env.example` to `backend/.env` and fill in fresh values.

## Status

| Feature | Status |
| --- | --- |
| Circle privacy | Enforced server-side from `Circle` membership |
| Feed auth | `auth` required on `GET /api/posts` and `/api/posts/user/:userId` |
| Likes | `POST /api/posts/:id/like` |
| Comments | `POST` / `DELETE /api/posts/:id/comments[/:commentId]` |
| Saved posts | `POST /api/posts/:id/save`, `GET /api/saved` |
| Follow / block | `POST /api/users/:userId/follow`, `POST /api/users/:userId/block` |
| Stories | `GET` / `POST /api/stories`, view, screenshot, viewers, delete |
| Notifications | `GET /api/notifications`, `POST /api/notifications/read` |
| Admin | `GET /api/admin/stats`, user directory, moderation |
| Circle management | `GET`/`POST /api/circles`, add/remove members, delete — owner-only |

### Known gaps

- **Streak** — the `Streak` model exists with no controller or routes.
- **Test coverage is auth and privacy only.** `backend/test/security.test.js`
  covers the feed, circle visibility, circle management and admin boundaries;
  posting, messaging and stories have no automated tests yet.
- **`main` still contains the leaked `.env`** at its initial commit. The
  `arena/*` branch history has been purged, but `main` has not — see the
  warning above.
