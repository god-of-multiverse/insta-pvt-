/**
 * The assistant's brain.
 *
 * Deliberately not a wrapper around a hosted LLM. There is no API key in this
 * environment, and an assistant that 503s in the preview is worse than no
 * assistant at all. This is a retrieval agent over a knowledge base about the
 * app itself, with online learning layered on top.
 *
 * How it learns, concretely. Every answer it gives is a routing decision:
 * question -> intent. Three things change that routing over time:
 *
 *   1. Feedback weights. Thumbs up on an answer strengthens the link between
 *      the words in that question and the intent that answered it; thumbs down
 *      weakens it. The next person who phrases it that way gets routed better.
 *      This is a one-layer linear classifier trained by perceptron-ish updates.
 *
 *   2. Taught answers. A thumbs down can carry a correction. That correction
 *      becomes a new retrievable entry, so a gap gets filled once rather than
 *      being re-asked forever.
 *
 *   3. The unanswered log. Questions it could not confidently route are kept
 *      so an admin can see what the app fails to explain.
 *
 * Everything is pure functions over a plain memory object, so the mock server
 * can keep it in a JSON file and the real server in Mongo without the logic
 * being written twice.
 */

/* --------------------------------------------------------------- knowledge */

/**
 * Seed knowledge. `patterns` are matched loosely; they are hints for the
 * retrieval scorer, not exact strings the user has to type.
 */
const BASE_KNOWLEDGE = [
  {
    id: 'about',
    patterns: [
      'what is this app', 'what is this', 'about', 'what does this do',
      'explain the app', 'what can you do', 'who are you', 'help', 'purpose',
    ],
    answer:
      "This is Inasta, a private social app. It mixes the parts of Instagram and Snapchat you actually use with a chat app built like WeChat.\n\nFour tabs: Chats for conversations, Contacts for people, Discover for Moments and tools, and Me for your profile and settings.\n\nAsk me about any of those and I will explain it.",
  },
  {
    id: 'post',
    patterns: [
      'how do i post', 'create a post', 'upload a photo', 'share a picture',
      'new post', 'posting', 'publish',
    ],
    answer:
      'Tap the + in the Discover tab to make a post. You can add a photo, write a caption, and pick which circle can see it.\n\nIf you pick a circle, only members of that circle see the post. Leave it open and it goes to everyone who follows you.',
  },
  {
    id: 'story',
    patterns: [
      'story', 'stories', 'snap', 'disappearing', '24 hours', 'expire',
      'temporary post', 'moment that disappears',
    ],
    answer:
      'Stories sit at the top of the Discover tab and vanish after 24 hours.\n\nYou can send a one-view snap that disappears the moment it is opened, and you get told if someone screenshots it. Streaks count consecutive days you and a friend both send something.',
  },
  {
    id: 'circles',
    patterns: [
      'circle', 'circles', 'group of friends', 'close friends', 'audience',
      'who can see', 'my circles', 'private list',
      'who can see my posts', 'who sees my posts', 'post audience', 'visibility of posts',
    ],
    answer:
      'Circles are audience lists. Instead of one follower list, you keep a few small ones such as Hometown or College, and choose per post which circle sees it.\n\nManage them in Me > My Circles. Only the owner of a circle can add or remove people from it.',
  },
  {
    id: 'privacy',
    patterns: [
      'privacy', 'private account', 'hide', 'last seen', 'mentions',
      'who can find me', 'settings privacy', 'secure',
    ],
    answer:
      'Me > Privacy has the controls: make your account private, hide your last seen, hide stories from people outside your circles, and turn mentions off.\n\nYour block list lives on the same screen, and you can unblock anyone from there.',
  },
  {
    id: 'block',
    patterns: [
      'block', 'unblock', 'blocked', 'stop someone', 'harassment', 'report',
    ],
    answer:
      'Open a person from the Contacts tab and use Block. They immediately stop seeing your posts and cannot message you.\n\nEverything you have blocked is listed in Me > Privacy, where you can undo it.',
  },
  {
    id: 'chat',
    patterns: [
      'message', 'chat', 'dm', 'send a message', 'talk to someone',
      'conversation', 'group chat', 'reply',
    ],
    answer:
      'The Chats tab holds your conversations. The + at the top takes you to Contacts, which is where a new chat starts.\n\nGroups work the same way as one-to-one chats, and tapping a group in Contacts opens it directly.',
  },
  {
    id: 'follow',
    patterns: [
      'follow', 'unfollow', 'following', 'followers', 'add friend', 'add someone',
    ],
    answer:
      'Contacts lists everyone on the app with a Follow button on each row. Tap it and it becomes Following.\n\nIf someone has a private account, your follow stays pending until they approve it.',
  },
  {
    id: 'saved',
    patterns: [
      'save', 'saved', 'bookmark', 'favourite a post', 'collection',
    ],
    answer:
      'The bookmark on any post saves it. Everything you have saved is in Me > Saved, and it is visible only to you.',
  },
  {
    id: 'notifications',
    patterns: [
      'notification', 'notifications', 'alerts', 'activity', 'who liked',
    ],
    answer:
      'Notifications collect likes, comments, follows, and mentions. Open them from the bell in the Discover tab.',
  },
  {
    id: 'stickers',
    patterns: [
      'sticker', 'stickers', 'emoji', 'emoticon', 'sticker pack',
    ],
    answer:
      'Stickers are in Discover > Stickers and Me > Stickers. There are four packs, and a long press adds one to your favourites so it stays at the front.',
  },
  {
    id: 'scan',
    patterns: [
      'scan', 'qr', 'qr code', 'my code', 'add by code', 'barcode',
    ],
    answer:
      'Discover > Scan shows your personal contact code, which other people can use to add you. There is also a box to type in someone else\'s code.\n\nThe camera scanner does not run in the web preview, so typed entry is the way in for now.',
  },
  {
    id: 'moments',
    patterns: [
      'moments', 'feed', 'timeline', 'home', 'what is moments',
    ],
    answer:
      'Moments is the feed, in the Discover tab. It shows posts from people you follow, filtered by the circles you belong to.',
  },
  {
    id: 'admin',
    patterns: [
      'admin', 'dashboard', 'statistics', 'moderation', 'metrics', 'revenue',
      'how many users', 'monetization',
    ],
    answer:
      'Admin accounts get a dashboard in Me > Admin with user counts, plan and revenue breakdowns, and moderation tools for removing posts or suspending accounts.\n\nIt is only reachable with an admin role; everyone else gets a 403 from the server, not just a hidden button.',
  },
  {
    id: 'account',
    patterns: [
      'sign out', 'log out', 'logout', 'password', 'change email', 'my account',
      'delete account', 'profile',
    ],
    answer:
      'Me is your profile. Sign out is at the bottom of that tab.\n\nSessions last 30 days, so you should not be thrown back to the login screen while you are using the app.',
  },
  {
    id: 'plans',
    patterns: [
      'plan', 'plans', 'pro', 'plus', 'subscription', 'upgrade', 'price', 'cost', 'pay',
    ],
    answer:
      'There are three tiers: free, plus, and pro. Paid tiers raise upload limits and unlock the larger circles.\n\nYour current plan is shown in the Me tab.',
  },
];

/* --------------------------------------------------------------- tokenizer */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does',
  'did', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that',
  'these', 'those', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about',
  'and', 'or', 'but', 'if', 'then', 'so', 'as', 'by', 'from', 'up', 'out',
  'please', 'tell', 'know', 'want', 'get', 'got', 'there', 'here', 'hey', 'hi',
  // Question words match every "what is X" pattern equally, so they add noise
  // rather than signal. Dropping them stopped "what plans are there" routing
  // to the Moments entry purely because that entry's pattern also said "what".
  'what', 'how', 'why', 'when', 'where', 'who', 'whom', 'whose', 'which',
]);

/** Cheap suffix stemmer. Keeps "stories" and "story" in the same bucket. */
function stem(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  return word;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

/* ----------------------------------------------------------------- memory */

/** A fresh brain. Callers persist this however they like. */
function emptyMemory() {
  return {
    /** intentId -> { token -> weight }. The learned part. */
    weights: {},
    /** Answers taught by users through corrections. */
    taught: [],
    /** Questions it could not answer confidently. */
    unanswered: [],
    /** Running tally, for the admin view. */
    stats: { asked: 0, answered: 0, helpful: 0, unhelpful: 0, taught: 0 },
  };
}

/** Tolerate partial or legacy shapes rather than throwing. */
function normalizeMemory(memory) {
  const base = emptyMemory();
  if (!memory || typeof memory !== 'object') return base;
  return {
    weights: memory.weights && typeof memory.weights === 'object' ? memory.weights : base.weights,
    taught: Array.isArray(memory.taught) ? memory.taught : base.taught,
    unanswered: Array.isArray(memory.unanswered) ? memory.unanswered : base.unanswered,
    stats: { ...base.stats, ...(memory.stats || {}) },
  };
}

/** Seed knowledge plus anything users have taught it. */
function knowledgeFor(memory) {
  const mem = normalizeMemory(memory);
  const taught = mem.taught.map((entry) => ({
    id: entry.id,
    patterns: [entry.question],
    answer: entry.answer,
    learned: true,
  }));
  return [...BASE_KNOWLEDGE, ...taught];
}

/* -------------------------------------------------------------- retrieval */

// How loudly feedback speaks relative to base token overlap.
//
// This has to exceed the score of a strong base match, or feedback can never
// overturn a confident-but-wrong route and the learning is decorative. At 0.9
// with a /3 squash, four upvotes saturated at 0.83 and still lost to a 0.894
// base match. 1.6 with a gentler /4 squash means one upvote nudges (~0.47)
// while sustained agreement genuinely wins.
const LEARNED_WEIGHT = 1.6;
const LEARNED_SQUASH = 4;
const CONFIDENT = 0.42; // below this it admits it does not know
const MARGIN = 0.08; // below this gap, offer the runner-up too

/**
 * Score one entry against the question.
 *
 * Base score is token overlap against the entry's patterns, normalised by
 * question length so long questions are not penalised. On top sits the learned
 * weight for those tokens, squashed so a single strong opinion cannot bully
 * the result.
 */
function scoreEntry(entry, tokens, weights) {
  if (!tokens.length) return 0;
  const patternTokens = new Set();
  entry.patterns.forEach((p) => tokenize(p).forEach((t) => patternTokens.add(t)));
  // The intent id itself is a strong hint ("privacy" -> the privacy entry).
  tokenize(entry.id).forEach((t) => patternTokens.add(t));

  let overlap = 0;
  tokens.forEach((t) => {
    if (patternTokens.has(t)) overlap += 1;
  });
  const base = overlap / Math.sqrt(tokens.length * Math.max(patternTokens.size, 1)) * 2;

  const learnedRaw = tokens.reduce((sum, t) => sum + ((weights[entry.id] || {})[t] || 0), 0);
  const learned = Math.tanh(learnedRaw / LEARNED_SQUASH) * LEARNED_WEIGHT;

  return Math.max(0, base + learned);
}

/**
 * Answer a question.
 *
 * Returns the reply plus the retrieval trace, so the UI can show a confidence
 * and the caller can record what to reinforce if the user says it helped.
 */
function ask(question, memory) {
  const mem = normalizeMemory(memory);
  const tokens = tokenize(question);
  const entries = knowledgeFor(mem);

  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, mem.weights) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const runnerUp = ranked[1];

  if (!top || top.score < CONFIDENT) {
    return {
      ok: false,
      intent: null,
      confidence: top ? Number(top.score.toFixed(3)) : 0,
      tokens,
      answer:
        "I do not have a good answer for that yet.\n\nI know about posts, stories, circles, privacy, blocking, chats, follows, saved items, stickers, the scan code, and plans. If you tell me the right answer using the Teach button, I will remember it for next time.",
      suggestions: ranked.slice(0, 3).filter((r) => r.score > 0.12).map((r) => r.entry.id),
    };
  }

  const close = runnerUp && top.score - runnerUp.score < MARGIN && runnerUp.score > CONFIDENT * 0.8;

  return {
    ok: true,
    intent: top.entry.id,
    learned: !!top.entry.learned,
    confidence: Number(top.score.toFixed(3)),
    tokens,
    answer: top.entry.answer,
    alsoConsidered: close ? runnerUp.entry.id : null,
  };
}

/* --------------------------------------------------------------- learning */

const CLAMP = 6; // keep any single weight from running away

function bump(memory, intentId, tokens, delta) {
  const mem = normalizeMemory(memory);
  if (!intentId) return mem;
  mem.weights[intentId] = mem.weights[intentId] || {};
  tokens.forEach((t) => {
    const next = (mem.weights[intentId][t] || 0) + delta;
    mem.weights[intentId][t] = Math.max(-CLAMP, Math.min(CLAMP, Number(next.toFixed(4))));
  });
  return mem;
}

/**
 * Apply feedback to an answer.
 *
 * Helpful reinforces the route. Unhelpful weakens it, and if a correction came
 * with it, that becomes a taught entry which is also pre-weighted toward the
 * asking tokens so it wins next time.
 */
function learn(memory, { question, intent, helpful, correction, userId }) {
  let mem = normalizeMemory(memory);
  const tokens = tokenize(question);

  if (helpful) {
    mem = bump(mem, intent, tokens, 0.6);
    mem.stats.helpful += 1;
    return { memory: mem, taught: null };
  }

  mem = bump(mem, intent, tokens, -0.5);
  mem.stats.unhelpful += 1;

  const text = String(correction || '').trim();
  if (!text) return { memory: mem, taught: null };

  const entry = {
    id: `taught:${Date.now().toString(36)}`,
    question: String(question || '').slice(0, 300),
    answer: text.slice(0, 1200),
    by: userId || null,
    at: new Date().toISOString(),
    uses: 0,
  };
  mem.taught.push(entry);
  mem.stats.taught += 1;
  // Give the new entry a head start on exactly the phrasing that failed.
  mem = bump(mem, entry.id, tokens, 1.4);

  // The question is answered now, so drop it from the gap list.
  const key = tokens.join(' ');
  mem.unanswered = mem.unanswered.filter((u) => tokenize(u.question).join(' ') !== key);

  return { memory: mem, taught: entry };
}

/** Record a question the agent could not route, deduped by shape. */
function noteUnanswered(memory, question, userId) {
  const mem = normalizeMemory(memory);
  const key = tokenize(question).join(' ');
  if (!key) return mem;
  const existing = mem.unanswered.find((u) => tokenize(u.question).join(' ') === key);
  if (existing) {
    existing.count += 1;
    existing.lastAt = new Date().toISOString();
    return mem;
  }
  mem.unanswered.push({
    question: String(question || '').slice(0, 300),
    count: 1,
    by: userId || null,
    lastAt: new Date().toISOString(),
  });
  // Keep the log bounded; the loudest gaps are the ones worth seeing.
  mem.unanswered.sort((a, b) => b.count - a.count);
  mem.unanswered = mem.unanswered.slice(0, 100);
  return mem;
}

/** What the agent has picked up, for the admin panel. */
function insights(memory) {
  const mem = normalizeMemory(memory);
  const learnedTokens = Object.entries(mem.weights).map(([intent, tokenMap]) => {
    const top = Object.entries(tokenMap)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 6)
      .map(([token, weight]) => ({ token, weight }));
    return { intent, top };
  });
  const { asked, answered, helpful, unhelpful } = mem.stats;
  const rated = helpful + unhelpful;
  return {
    stats: {
      ...mem.stats,
      satisfaction: rated ? Number(((helpful / rated) * 100).toFixed(1)) : null,
      coverage: asked ? Number(((answered / asked) * 100).toFixed(1)) : null,
    },
    taught: mem.taught.slice(-25).reverse(),
    unanswered: mem.unanswered.slice(0, 25),
    weights: learnedTokens.filter((w) => w.top.length),
  };
}

module.exports = {
  BASE_KNOWLEDGE,
  emptyMemory,
  normalizeMemory,
  knowledgeFor,
  tokenize,
  ask,
  learn,
  noteUnanswered,
  insights,
  CONFIDENT,
};
