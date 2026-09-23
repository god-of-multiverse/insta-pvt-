/**
 * Regression tests for the auth and privacy guarantees.
 *
 * These exist because circle privacy is the product's core promise and it was
 * silently broken once already: GET /api/posts had no auth middleware and
 * treated ?circle= as proof of access, so any caller could read any circle by
 * naming it. Nothing but a test stops that from regressing.
 *
 * Runs against the mock server, which mirrors the real route/middleware shape,
 * so it needs no database. Run with: npm test
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_FILE = path.join(__dirname, '..', '.mock-data.json');
const BACKUP = `${DATA_FILE}.testbak`;

let server;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/posts`);
      if (res.status === 401 || res.ok) return;
    } catch {
      /* not up yet */
    }
    await wait(150);
  }
  throw new Error('mock server did not start in time');
}

/** Logs in and returns the JWT. */
async function login(email, password = 'password123') {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `login failed for ${email}`);
  return (await res.json()).token;
}

/** GET helper that can send the token via either supported header. */
function get(pathname, token, { header = 'Authorization' } = {}) {
  const headers = {};
  if (token) {
    headers[header] = header === 'Authorization' ? `Bearer ${token}` : token;
  }
  return fetch(`${BASE}${pathname}`, { headers });
}

before(async () => {
  // Keep any real dev data out of harm's way, and start from a clean seed.
  if (fs.existsSync(DATA_FILE)) fs.renameSync(DATA_FILE, BACKUP);

  server = spawn('node', [path.join(__dirname, '..', 'dev-mock-server.js')], {
    env: { ...process.env, PORT: String(PORT), QUIET: '1' },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(async () => {
  if (server) server.kill();
  await wait(200);
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  if (fs.existsSync(BACKUP)) fs.renameSync(BACKUP, DATA_FILE);
});

describe('feed authentication', () => {
  test('GET /api/posts rejects unauthenticated callers', async () => {
    const res = await get('/api/posts', null);
    assert.equal(res.status, 401);
  });

  test('a garbage token is rejected', async () => {
    const res = await get('/api/posts', 'not-a-real-token');
    assert.equal(res.status, 401);
  });

  test('a valid token is accepted', async () => {
    const res = await get('/api/posts', await login('ada@inasta.app'));
    assert.equal(res.status, 200);
  });

  test('X-Auth-Token works when Authorization is absent', async () => {
    // Proxies that consume Authorization must not lock users out.
    const res = await get('/api/posts', await login('ada@inasta.app'), {
      header: 'X-Auth-Token',
    });
    assert.equal(res.status, 200);
  });
});

describe('circle privacy', () => {
  test('a member sees the circles they belong to', async () => {
    // Seed: ada is a member of mira's Hometown and kai's College.
    const res = await get('/api/posts', await login('ada@inasta.app'));
    const circles = (await res.json()).map((p) => p.circle);
    assert.ok(circles.includes('Hometown'), 'ada should see Hometown');
    assert.ok(circles.includes('College'), 'ada should see College');
  });

  test('a non-member never receives another user\'s circle', async () => {
    // kai is not in mira's Hometown.
    const res = await get('/api/posts', await login('kai@inasta.app'));
    const posts = await res.json();
    assert.ok(
      posts.every((p) => p.circle !== 'Hometown'),
      'kai must not receive Hometown posts'
    );
  });

  test('naming a circle you are not in grants nothing', async () => {
    // The original vulnerability: ?circle= treated as authorization.
    const res = await get('/api/posts?circle=Hometown', await login('kai@inasta.app'));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], 'must return no posts, not private content');
  });

  test('?circle= only narrows what you may already see', async () => {
    const token = await login('ada@inasta.app');
    const all = await (await get('/api/posts', token)).json();
    const filtered = await (await get('/api/posts?circle=Hometown', token)).json();
    assert.ok(filtered.length > 0, 'a member should still get their posts');
    assert.ok(filtered.length <= all.length);
    assert.ok(filtered.every((p) => p.circle === 'Hometown'));
  });

  test('authors always see their own posts', async () => {
    const res = await get('/api/posts', await login('mira@inasta.app'));
    const posts = await res.json();
    assert.ok(
      posts.some((p) => p.circle === 'Hometown'),
      'mira owns Hometown and must see it'
    );
  });
});

describe('admin authorisation', () => {
  test('admin routes reject anonymous callers', async () => {
    assert.equal((await get('/api/admin/stats', null)).status, 401);
  });

  test('admin routes reject ordinary users with 403', async () => {
    const res = await get('/api/admin/stats', await login('ada@inasta.app'));
    assert.equal(res.status, 403);
  });

  test('an admin can read stats', async () => {
    const res = await get('/api/admin/stats', await login('admin@inasta.app'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.users.total > 0);
    assert.ok(body.monetisation, 'stats should include monetisation');
  });
});

describe('circle management', () => {
  test('only the owner may add members', async () => {
    const mira = await login('mira@inasta.app');
    const kai = await login('kai@inasta.app');

    const { circles } = await (await get('/api/circles', mira)).json();
    const hometown = circles.find((c) => c.name === 'Hometown');
    assert.ok(hometown, 'mira should own Hometown');

    // kai attempting to admit himself is the obvious privilege escalation.
    const res = await fetch(`${BASE}/api/circles/${hometown._id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': kai },
      body: JSON.stringify({ username: 'kai' }),
    });
    assert.equal(res.status, 403);
  });

  test('adding and removing a member changes what they can see', async () => {
    const mira = await login('mira@inasta.app');
    const kai = await login('kai@inasta.app');
    const { circles } = await (await get('/api/circles', mira)).json();
    const hometown = circles.find((c) => c.name === 'Hometown');

    const before = await (await get('/api/posts?circle=Hometown', kai)).json();
    assert.equal(before.length, 0, 'kai starts with no access');

    await fetch(`${BASE}/api/circles/${hometown._id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': mira },
      body: JSON.stringify({ username: 'kai' }),
    });

    const during = await (await get('/api/posts?circle=Hometown', kai)).json();
    assert.ok(during.length > 0, 'kai should see the circle once admitted');

    const people = await (await get('/api/messages/users', mira)).json();
    const kaiId = people.find((u) => u.username === 'kai')._id;
    await fetch(`${BASE}/api/circles/${hometown._id}/members/${kaiId}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': mira },
    });

    const after = await (await get('/api/posts?circle=Hometown', kai)).json();
    assert.equal(after.length, 0, 'removal must revoke access immediately');
  });
});

describe('session durability', () => {
  test('a token stays valid across a server restart', async () => {
    // Tokens were once held in memory, so every restart silently signed
    // everyone out. They are signed JWTs now and must survive.
    const token = await login('ada@inasta.app');
    assert.equal((await get('/api/posts', token)).status, 200);

    server.kill();
    await wait(400);
    server = spawn('node', [path.join(__dirname, '..', 'dev-mock-server.js')], {
      env: { ...process.env, PORT: String(PORT), QUIET: '1' },
      stdio: 'ignore',
    });
    await waitForServer();

    assert.equal(
      (await get('/api/posts', token)).status,
      200,
      'the pre-restart token must still work'
    );
  });
});

/**
 * The assistant is a learning agent, which means its behaviour is meant to
 * change over time. That makes it easy to break silently: a scoring tweak can
 * leave it answering but no longer learning, and nothing would look wrong.
 * These pin the loop rather than any particular wording.
 */
describe('assistant', () => {
  const ask = async (question, token) =>
    fetch(`${BASE}/api/assistant/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question }),
    });

  test('requires a session', async () => {
    const res = await fetch(`${BASE}/api/assistant/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'what is this app' }),
    });
    assert.equal(res.status, 401);
  });

  test('answers a question it knows', async () => {
    const res = await ask('what is this app', await login('ada@inasta.app'));
    assert.equal(res.status, 200);
    const turn = await res.json();
    assert.equal(turn.ok, true);
    assert.equal(turn.intent, 'about');
  });

  test('admits when it does not know', async () => {
    const token = await login('ada@inasta.app');
    const turn = await (await ask('what is the airspeed of a swallow', token)).json();
    assert.equal(turn.ok, false, 'should not invent an answer');
  });

  test('learns a corrected answer and reuses it for everyone', async () => {
    const ada = await login('ada@inasta.app');
    const miss = await (await ask('how do i export my data', ada)).json();
    assert.equal(miss.ok, false);

    const fed = await fetch(`${BASE}/api/assistant/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ada}` },
      body: JSON.stringify({
        turnId: miss._id,
        helpful: false,
        correction: 'Data export is in Me > Settings > Export.',
      }),
    });
    assert.equal(fed.status, 200);
    assert.equal((await fed.json()).taught, true);

    // Same user, now answered.
    const retry = await (await ask('how do i export my data', ada)).json();
    assert.equal(retry.ok, true, 'the taught answer should be retrievable');
    assert.match(retry.answer, /Export/);

    // And a different user benefits from it too.
    const kai = await login('kai@inasta.app');
    const shared = await (await ask('export my data', kai)).json();
    assert.match(shared.answer, /Export/, 'knowledge should be shared, not per-user');
  });

  test('history is per-user', async () => {
    const ada = await login('ada@inasta.app');
    const mira = await login('mira@inasta.app');
    await ask('what are circles', ada);

    const mine = await (
      await fetch(`${BASE}/api/assistant/history`, {
        headers: { Authorization: `Bearer ${ada}` },
      })
    ).json();
    const theirs = await (
      await fetch(`${BASE}/api/assistant/history`, {
        headers: { Authorization: `Bearer ${mira}` },
      })
    ).json();

    assert.ok(mine.length > 0);
    assert.ok(
      !theirs.some((t) => mine.some((m) => m._id === t._id)),
      'one user must not see another user\'s conversation'
    );
  });

  test('a user cannot rate an answer that is not theirs', async () => {
    const ada = await login('ada@inasta.app');
    const mira = await login('mira@inasta.app');
    const turn = await (await ask('what are stickers', ada)).json();

    const res = await fetch(`${BASE}/api/assistant/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mira}` },
      body: JSON.stringify({ turnId: turn._id, helpful: true }),
    });
    assert.equal(res.status, 404);
  });

  test('insights are admin-only', async () => {
    const user = await fetch(`${BASE}/api/assistant/insights`, {
      headers: { Authorization: `Bearer ${await login('ada@inasta.app')}` },
    });
    assert.equal(user.status, 403);

    const admin = await fetch(`${BASE}/api/assistant/insights`, {
      headers: { Authorization: `Bearer ${await login('admin@inasta.app')}` },
    });
    assert.equal(admin.status, 200);
    const body = await admin.json();
    assert.ok(body.stats);
    assert.ok(Array.isArray(body.taught));
  });
});
